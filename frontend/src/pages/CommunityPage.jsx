/**
 * CommunityPage.jsx — Modern Discord-style chat
 * ─────────────────────────────────────────────
 * Fixes:
 *  - Chat area fills ALL remaining workspace (no container/card wrapper)
 *  - Full screen on mobile
 *  - Last community + channel persisted via appStateStore
 *  - Push notifications + message search included
 */
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import {
  Search, Plus, Hash, Bell, BellOff, Users, Send, Smile,
  Trash2, MessageCircle, ArrowLeft, X, Loader2, BookOpen,
  LogOut, ChevronDown, Edit2, Pin, MoreHorizontal
} from 'lucide-react'
import clsx from 'clsx'
import { useApiClient } from '@/hooks/useApiClient'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAppStateStore } from '@/store/appStateStore'
import EmojiPicker from '@/components/EmojiPicker'

const ICONS  = ['✝️','📖','🕊️','🙏','⛪','🔥','⭐','🌟','💒','🎵','📿','🌿']
const CH_ICONS = {
  text:         <Hash size={14}/>,
  announcement: <Bell size={14}/>,
  prayer:       <span className="text-xs leading-none">🙏</span>,
  study:        <BookOpen size={13}/>,
}

function Avatar({ u, size = 8, color = 'bg-indigo-600' }) {
  const sizes = { 7:'w-7 h-7 text-xs', 8:'w-8 h-8 text-sm', 9:'w-9 h-9 text-sm', 10:'w-10 h-10 text-base' }
  return (
    <div className={`${sizes[size]||'w-8 h-8 text-sm'} ${color} rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold`}>
      {u?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

function fmt(iso) {
  const d = new Date(iso), n = new Date()
  const isToday = d.toDateString() === n.toDateString()
  const isYest  = d.toDateString() === new Date(n-86400000).toDateString()
  const time = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  if (isToday)  return `Today at ${time}`
  if (isYest)   return `Yesterday at ${time}`
  return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ` at ${time}`
}

// ── Typing indicator simulation ───────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-1 h-6">
      <div className="flex gap-1">
        {[0,1,2].map(i=>(
          <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
            style={{animationDelay:`${i*0.15}s`,animationDuration:'1s'}}/>
        ))}
      </div>
    </div>
  )
}

// ── Message Feed ──────────────────────────────────────────────────────────────
function MessageFeed({ community, channel, api, onBack }) {
  const qc = useQueryClient()
  const { user } = useUser()
  const [input, setInput]         = useState('')
  const [reply, setReply]         = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [msgSearch, setMsgSearch] = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [isTyping, setIsTyping]   = useState(false)
  const bottom  = useRef(null)
  const prevLen = useRef(0)
  const textareaRef = useRef(null)
  const { permission, requestPermission, notifyNewMessage } = usePushNotifications()

  const { data, isLoading } = useQuery({
    queryKey: ['messages', community.id, channel.id],
    queryFn:  () => api.get(`/community/${community.id}/channels/${channel.id}/messages/`).then(r=>r.data),
    refetchInterval: 2500,
  })

  const { data: members } = useQuery({
    queryKey: ['members', community.id],
    queryFn:  () => api.get(`/community/${community.id}/members/`).then(r=>r.data),
    enabled:  showMembers,
  })

  // Notify on new messages
  useEffect(() => {
    const msgs = data?.results || []
    if (msgs.length > prevLen.current && prevLen.current > 0) {
      const newest = msgs[msgs.length - 1]
      if (newest?.author_username !== user?.username) {
        notifyNewMessage(newest.author_username, channel.name, newest.content)
      }
    }
    prevLen.current = msgs.length
  }, [data])

  // Scroll to bottom on new messages (unless searching)
  useEffect(() => {
    if (!msgSearch) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data, msgSearch])

  const send = useMutation({
    mutationFn: d => api.post(`/community/${community.id}/channels/${channel.id}/messages/`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', community.id, channel.id] })
      setInput(''); setReply(null)
      if (textareaRef.current) { textareaRef.current.style.height = '24px' }
    },
  })
  const del = useMutation({
    mutationFn: id => api.delete(`/community/${community.id}/channels/${channel.id}/messages/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', community.id, channel.id] }),
  })
  const react = useMutation({
    mutationFn: ({ id, emoji }) => api.post(`/community/${community.id}/channels/${channel.id}/messages/${id}/react/`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', community.id, channel.id] }),
  })

  const handleSend = (e) => {
    e?.preventDefault()
    if (!input.trim() || send.isPending) return
    send.mutate({ content: input.trim(), parent_message: reply?.id || null })
  }

  const allMsgs = data?.results || []
  const filtered = msgSearch
    ? allMsgs.filter(m =>
        m.content.toLowerCase().includes(msgSearch.toLowerCase()) ||
        m.author_username.toLowerCase().includes(msgSearch.toLowerCase())
      )
    : allMsgs

  const grouped = filtered.map((m, i, arr) => ({
    ...m,
    isFirst: i === 0 ||
      arr[i-1].author_username !== m.author_username ||
      !!m.parent_message ||
      !!msgSearch ||
      new Date(m.created_at) - new Date(arr[i-1].created_at) > 300000,
  }))

  // Highlight search matches
  const highlight = (text) => {
    if (!msgSearch) return text
    const parts = text.split(new RegExp(`(${msgSearch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === msgSearch.toLowerCase()
        ? <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{p}</mark>
        : p
    )
  }

  return (
    /* Full height flex column — fills ALL remaining space */
    <div className="flex flex-col flex-1 min-w-0 h-full min-h-0">

      {/* ── Channel header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-gray-900 flex-shrink-0 min-h-[52px]">
        {/* Mobile back */}
        <button onClick={onBack} className="lg:hidden p-1 -ml-1 text-gray-400 hover:text-gray-200 flex-shrink-0">
          <ArrowLeft size={18}/>
        </button>

        <span className="text-gray-400 flex-shrink-0">
          {CH_ICONS[channel.channel_type] || <Hash size={15}/>}
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-none">{channel.name}</p>
          {channel.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{channel.description}</p>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Message search */}
          {showMsgSearch ? (
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-600">
              <Search size={13} className="text-gray-500"/>
              <input
                autoFocus
                className="bg-transparent text-white text-xs outline-none w-32 placeholder:text-gray-600"
                placeholder="Search messages..."
                value={msgSearch}
                onChange={e => setMsgSearch(e.target.value)}
              />
              {msgSearch && (
                <span className="text-gray-500 text-xs whitespace-nowrap">{filtered.length}</span>
              )}
              <button onClick={() => { setShowMsgSearch(false); setMsgSearch('') }} className="text-gray-500 hover:text-gray-300 ml-1">
                <X size={13}/>
              </button>
            </div>
          ) : (
            <button onClick={() => setShowMsgSearch(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
              <Search size={16}/>
            </button>
          )}

          {/* Notifications */}
          <button
            onClick={() => permission !== 'granted' && requestPermission()}
            title={permission === 'granted' ? 'Notifications on' : 'Enable notifications'}
            className={clsx('p-1.5 rounded-lg transition-colors', permission === 'granted' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5')}>
            {permission === 'granted' ? <Bell size={16}/> : <BellOff size={16}/>}
          </button>

          {/* Members */}
          <button onClick={() => setShowMembers(!showMembers)}
            className={clsx('p-1.5 rounded-lg transition-colors', showMembers ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5')}>
            <Users size={16}/>
          </button>
        </div>
      </div>

      {/* ── Main body: messages + optional member sidebar ────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Messages column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">

          {/* Search result count banner */}
          {msgSearch && (
            <div className="px-4 py-2 bg-yellow-900/20 border-b border-yellow-900/30 flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-yellow-300">
                {filtered.length} message{filtered.length !== 1 ? 's' : ''} matching "<strong>{msgSearch}</strong>"
              </p>
              <button onClick={() => setMsgSearch('')} className="text-xs text-yellow-400 hover:text-yellow-200">Clear</button>
            </div>
          )}

          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scroll-smooth">

            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-indigo-400"/>
              </div>
            )}

            {!isLoading && allMsgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
                <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-2xl mb-4">
                  {CH_ICONS[channel.channel_type] || '#'}
                </div>
                <h3 className="font-semibold text-white text-lg mb-1">Welcome to #{channel.name}</h3>
                <p className="text-gray-500 text-sm">
                  {channel.description || 'This is the very beginning of the conversation.'}
                </p>
              </div>
            )}

            {!isLoading && msgSearch && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-gray-500 text-sm">No messages match "<em>{msgSearch}</em>"</p>
              </div>
            )}

            {grouped.map((msg, idx) => (
              <div key={msg.id}
                className={clsx(
                  'group relative flex gap-3 px-4 py-1 rounded-lg hover:bg-white/[0.03] transition-colors',
                  msg.isFirst && idx > 0 && 'mt-3',
                  msgSearch && 'bg-yellow-900/5'
                )}>

                {/* Avatar or timestamp spacer */}
                <div className="w-10 flex-shrink-0 flex items-start justify-center mt-0.5">
                  {msg.isFirst
                    ? <Avatar u={msg.author_username} size={9}
                        color={msg.author_username === user?.username ? 'bg-indigo-600' : 'bg-emerald-700'}/>
                    : <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 pt-1 leading-none">
                        {new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                      </span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  {msg.isFirst && (
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <span className={clsx(
                        'text-sm font-semibold',
                        msg.author_username === user?.username ? 'text-indigo-300' : 'text-white'
                      )}>
                        {msg.author_username}
                      </span>
                      <span className="text-[11px] text-gray-600">{fmt(msg.created_at)}</span>
                      {msg.edited_at && <span className="text-[10px] text-gray-700 italic">(edited)</span>}
                    </div>
                  )}

                  {/* Reply preview */}
                  {msg.reply_to && (
                    <div className="flex items-start gap-2 mb-1.5 pl-3 border-l-2 border-gray-600 ml-0.5">
                      <p className="text-xs text-gray-500 line-clamp-1">
                        <strong className="text-gray-400">{msg.reply_to.author}</strong>: {msg.reply_to.preview}
                      </p>
                    </div>
                  )}

                  {/* Content */}
                  <p className="text-sm text-gray-200 leading-relaxed break-words whitespace-pre-wrap">
                    {highlight(msg.content)}
                  </p>

                  {/* Reactions */}
                  {msg.reactions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(
                        msg.reactions.reduce((a, r) => ({ ...a, [r.emoji]: (a[r.emoji]||0) + 1 }), {})
                      ).map(([e, c]) => (
                        <button key={e}
                          onClick={() => react.mutate({ id: msg.id, emoji: e })}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-gray-300 border border-white/10 hover:border-indigo-500 transition-all">
                          {e} <span className="text-gray-400">{c}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover action toolbar */}
                <div className="absolute right-2 top-1 flex items-center gap-0.5
                                opacity-0 group-hover:opacity-100 transition-opacity
                                bg-gray-800 border border-white/10 rounded-lg px-1 py-0.5 shadow-lg">
                  {/* Quick reactions */}
                  {['👍','❤️','🙏'].map(e => (
                    <button key={e} onClick={() => react.mutate({ id: msg.id, emoji: e })}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-sm transition-colors">
                      {e}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-white/10 mx-0.5"/>
                  <button onClick={() => setReply(msg)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                    title="Reply">
                    <MessageCircle size={13}/>
                  </button>
                  {msg.author_username === user?.username && (
                    <button onClick={() => del.mutate(msg.id)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-900/40 text-gray-600 hover:text-red-400 transition-colors"
                      title="Delete">
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottom}/>
          </div>

          {/* Notification prompt */}
          {permission === 'default' && (
            <div className="mx-4 mb-2 flex items-center gap-3 px-3 py-2 bg-indigo-900/30 rounded-xl border border-indigo-800/40 flex-shrink-0">
              <Bell size={14} className="text-indigo-400 flex-shrink-0"/>
              <p className="text-xs text-gray-300 flex-1">Get notified when new messages arrive</p>
              <button onClick={requestPermission} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex-shrink-0">Enable</button>
              <button onClick={()=>{}} className="text-gray-600 hover:text-gray-400 flex-shrink-0"><X size={12}/></button>
            </div>
          )}

          {/* Reply banner */}
          {reply && (
            <div className="mx-4 mb-0 flex items-center gap-2 px-3 py-2 bg-gray-800/80 rounded-t-xl border-t border-x border-white/10 flex-shrink-0">
              <MessageCircle size={12} className="text-indigo-400 flex-shrink-0"/>
              <span className="text-xs text-gray-400 flex-1 truncate">
                Replying to <strong className="text-gray-200">{reply.author_username}</strong>: {reply.content.substring(0,80)}
              </span>
              <button onClick={() => setReply(null)} className="text-gray-600 hover:text-gray-300 flex-shrink-0"><X size={13}/></button>
            </div>
          )}

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 flex-shrink-0">
            {channel.is_read_only ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/60 rounded-xl text-gray-500 text-sm border border-white/5">
                🔒 Only admins can post in this channel
              </div>
            ) : (
              <div className={clsx(
                'flex items-end gap-2 bg-gray-800/80 rounded-xl px-3 py-3',
                'border border-white/10 focus-within:border-indigo-500/50 transition-colors',
                reply && 'rounded-tl-none rounded-tr-none border-t-0'
              )}>
                {/* Emoji */}
                <div className="relative flex-shrink-0">
                  <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5">
                    <Smile size={18}/>
                  </button>
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={(emoji) => setInput(i => i + emoji)}
                      onClose={() => setShowEmoji(false)}
                      dark={true}
                      position="top"
                    />
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  className="flex-1 bg-transparent text-gray-100 text-sm resize-none outline-none placeholder:text-gray-600 max-h-40 min-h-[24px] leading-relaxed"
                  placeholder={`Message #${channel.name}`}
                  value={input}
                  rows={1}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                  }}
                />

                {/* Send */}
                <button onClick={handleSend}
                  disabled={!input.trim() || send.isPending}
                  className={clsx(
                    'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                    input.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  )}>
                  {send.isPending ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="w-52 border-l border-white/10 bg-gray-900/50 flex-shrink-0 overflow-y-auto hidden md:block">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Members — {members?.length || 0}
            </p>
            {[
              { role:'owner', label:'Owner',   color:'text-yellow-300', bg:'bg-yellow-700' },
              { role:'admin', label:'Admins',  color:'text-blue-300',   bg:'bg-blue-700'   },
              { role:'member',label:'Members', color:'text-gray-300',   bg:'bg-indigo-700' },
            ].map(({ role, label, color, bg }) => {
              const list = (members||[]).filter(m => m.role === role)
              return list.length > 0 && (
                <div key={role} className="mb-4">
                  <p className="px-4 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                    {label} — {list.length}
                  </p>
                  {list.map(m => (
                    <div key={m.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded-lg hover:bg-white/5 transition-colors cursor-default">
                      <Avatar u={m.username} size={8} color={bg}/>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${color}`}>{m.username}</p>
                        {m.nickname && <p className="text-xs text-gray-600 truncate">{m.nickname}</p>}
                      </div>
                      {role === 'owner' && <span className="text-yellow-500 text-xs">👑</span>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modals ────────────────────────────────────────────────────────────────────
function CreateModal({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', description:'', icon:'✝️', is_public:true })
  const create = useMutation({
    mutationFn: d => api.post('/community/', d),
    onSuccess: r => { onCreated(r.data); onClose() },
  })
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">Create a Community</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5"><X size={18}/></button>
        </div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Choose Icon</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {ICONS.map(ic => (
            <button key={ic} onClick={() => setForm(f=>({...f,icon:ic}))}
              className={clsx('w-10 h-10 text-xl rounded-xl transition-all',form.icon===ic?'bg-indigo-600 ring-2 ring-indigo-400 scale-110':'bg-white/5 hover:bg-white/10')}>
              {ic}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Community Name *" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <textarea className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            placeholder="What is this community about?" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
          <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors">
            <input type="checkbox" checked={form.is_public} onChange={e=>setForm(f=>({...f,is_public:e.target.checked}))} className="w-4 h-4 accent-indigo-500"/>
            <div>
              <p className="text-sm text-white font-medium">Public Community</p>
              <p className="text-xs text-gray-500">Anyone can search and join with invite code</p>
            </div>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={() => create.mutate(form)} disabled={!form.name.trim()||create.isPending}
            className="btn-primary flex-1 justify-center disabled:opacity-50">
            {create.isPending?<Loader2 size={14} className="animate-spin"/>:<Plus size={14}/>} Create
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchModal({ api, onClose, onJoined }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [code, setCode] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['csearch', q],
    queryFn: () => api.get(`/community/search/?q=${encodeURIComponent(q)}`).then(r=>r.data),
    enabled: q.length >= 2,
  })
  const join = useMutation({
    mutationFn: id => api.post(`/community/${id}/join/`),
    onSuccess: () => { qc.invalidateQueries({queryKey:['my-communities']}); onJoined(); onClose() },
  })
  const joinCode = useMutation({
    mutationFn: () => api.get(`/community/join/?code=${code.trim().toUpperCase()}`).then(r=>r.data),
    onSuccess: c => join.mutate(c.id),
  })
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg p-6 border border-white/10 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-white">Find a Community</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-white/5"><X size={18}/></button>
        </div>
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Search communities by name..." value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
        </div>
        <div className="flex gap-2 mb-5">
          <input className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest"
            placeholder="Or paste invite code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={8}/>
          <button onClick={() => joinCode.mutate()} disabled={code.length < 6 || joinCode.isPending}
            className="btn-primary px-5 disabled:opacity-50">
            {joinCode.isPending ? <Loader2 size={14} className="animate-spin"/> : 'Join'}
          </button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {isLoading && <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-indigo-400"/></div>}
          {(data?.results||[]).map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/[0.08] transition-colors">
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{c.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs text-gray-500 truncate">{c.description}</p>
                <p className="text-xs text-gray-600">{c.member_count} members</p>
              </div>
              {c.is_member
                ? <span className="text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-800/40 flex-shrink-0">Joined ✓</span>
                : <button onClick={() => join.mutate(c.id)} disabled={join.isPending}
                    className="btn-primary text-xs px-4 py-2 flex-shrink-0">
                    Join
                  </button>
              }
            </div>
          ))}
          {q.length >= 2 && !isLoading && (data?.results||[]).length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">No communities found. Try a different name or paste an invite code.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const api = useApiClient()
  const qc  = useQueryClient()
  const { lastCommunityId, lastChannelId, setLastCommunity } = useAppStateStore()

  const [selected,    setSelected]    = useState(null)
  const [channel,     setChannel]     = useState(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [showSearch,  setShowSearch]  = useState(false)
  const [mView,       setMView]       = useState('servers') // mobile nav

  const { data: mine, isLoading } = useQuery({
    queryKey: ['my-communities'],
    queryFn:  () => api.get('/community/mine/').then(r=>r.data),
  })

  const { data: channels } = useQuery({
    queryKey: ['channels', selected?.id],
    queryFn:  () => api.get(`/community/${selected.id}/channels/`).then(r=>r.data),
    enabled:  !!selected,
  })

  // Restore last community + channel on mount
  useEffect(() => {
    if (!mine?.results?.length) return
    if (lastCommunityId) {
      const comm = mine.results.find(c => c.id === lastCommunityId)
      if (comm) { setSelected(comm); setMView('channels') }
    }
  }, [mine])

  useEffect(() => {
    if (!channels?.length || !lastChannelId) return
    if (!channel) {
      const ch = channels.find(c => c.id === lastChannelId) || channels[0]
      if (ch) { setChannel(ch); setMView('chat') }
    }
  }, [channels])

  const leave = useMutation({
    mutationFn: () => api.post(`/community/${selected.id}/leave/`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['my-communities'] })
      setSelected(null); setChannel(null)
      setLastCommunity(null, null)
    },
  })

  const selectCommunity = (c) => {
    setSelected(c); setChannel(null); setMView('channels')
    setLastCommunity(c.id, null)
  }

  const selectChannel = (ch) => {
    setChannel(ch); setMView('chat')
    setLastCommunity(selected?.id, ch.id)
  }

  const grouped = {
    announcement: (channels||[]).filter(c => c.channel_type === 'announcement'),
    text:         (channels||[]).filter(c => c.channel_type === 'text'),
    prayer:       (channels||[]).filter(c => c.channel_type === 'prayer'),
    study:        (channels||[]).filter(c => c.channel_type === 'study'),
  }

  // Empty state
  if (!isLoading && mine?.results?.length === 0) return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-950 rounded-2xl"
      style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="text-6xl mb-4">✝️</div>
      <h2 className="font-display text-2xl font-bold text-white mb-2">Welcome to Community</h2>
      <p className="text-gray-400 max-w-sm mb-8">Create your own Bible study community or search for one to join.</p>
      <div className="flex gap-3">
        <button onClick={() => setShowSearch(true)} className="btn-secondary">🔍 Find Community</button>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={15}/> Create</button>
      </div>
      {showCreate && <CreateModal api={api} onClose={() => setShowCreate(false)} onCreated={() => qc.invalidateQueries({queryKey:['my-communities']})}/>}
      {showSearch && <SearchModal api={api} onClose={() => setShowSearch(false)} onJoined={() => qc.invalidateQueries({queryKey:['my-communities']})}/>}
    </div>
  )

  return (
    /*
     * KEY LAYOUT FIX:
     * overflow-hidden + fixed height = chat fills exactly the remaining workspace.
     * No outer padding/card wrapper — chat goes edge-to-edge in its container.
     * On mobile: full screen minus the bottom nav bar (5rem).
     * On desktop: full screen minus the top padding (2rem).
     */
    <div className="flex bg-gray-950 rounded-xl overflow-hidden border border-white/5"
      style={{ height: 'calc(100vh - 5rem)' }}>

      {/* ── Server icon bar ──────────────────────────────────────────── */}
      <div className={clsx(
        'w-[68px] bg-black/60 flex flex-col items-center py-3 gap-2 flex-shrink-0 border-r border-white/5',
        mView !== 'servers' ? 'hidden lg:flex' : 'flex'
      )}>
        <button onClick={() => setShowSearch(true)} title="Find community"
          className="w-12 h-12 bg-white/5 hover:bg-indigo-600 rounded-2xl hover:rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200">
          <Search size={20}/>
        </button>
        <div className="w-8 h-px bg-white/10 my-1"/>
        {(mine?.results||[]).map(c => (
          <button key={c.id} onClick={() => selectCommunity(c)} title={c.name}
            className={clsx(
              'relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-all duration-200',
              selected?.id === c.id
                ? 'bg-indigo-600 rounded-xl scale-105 text-white ring-2 ring-indigo-400/30'
                : 'bg-white/5 hover:bg-indigo-600 hover:rounded-xl text-gray-300 hover:text-white'
            )}>
            {c.icon}
            {selected?.id === c.id && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"/>
            )}
          </button>
        ))}
        <div className="w-8 h-px bg-white/10 my-1"/>
        <button onClick={() => setShowCreate(true)} title="Create community"
          className="w-12 h-12 bg-white/5 hover:bg-emerald-600 rounded-2xl hover:rounded-xl flex items-center justify-center text-emerald-400 hover:text-white transition-all duration-200">
          <Plus size={22}/>
        </button>
      </div>

      {/* Nothing selected */}
      {!selected && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-5xl">👈</p>
          <p className="text-gray-400 font-medium">Pick a community</p>
          <p className="text-gray-600 text-sm">or click + to create one</p>
        </div>
      )}

      {selected && (
        <>
          {/* ── Channel sidebar ──────────────────────────────────────── */}
          <div className={clsx(
            'w-60 bg-gray-900/80 flex flex-col flex-shrink-0 border-r border-white/5',
            mView === 'channels' ? 'flex' : 'hidden lg:flex'
          )}>
            {/* Community header */}
            <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-white truncate">
                  {selected.icon} {selected.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.member_count} members</p>
              </div>
              <ChevronDown size={15} className="text-gray-500 flex-shrink-0"/>
            </div>

            {/* Channels list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {[
                ['Announcements', grouped.announcement],
                ['Text Channels', grouped.text],
                ['Prayer',        grouped.prayer],
                ['Study',         grouped.study],
              ].map(([label, list]) => list.length > 0 && (
                <div key={label}>
                  <p className="px-4 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{label}</p>
                  {list.map(ch => (
                    <button key={ch.id} onClick={() => selectChannel(ch)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-1.5 mx-1 rounded-lg text-sm transition-colors text-left',
                        channel?.id === ch.id
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                      )}>
                      <span className="flex-shrink-0 opacity-60">{CH_ICONS[ch.channel_type] || <Hash size={14}/>}</span>
                      <span className="truncate">{ch.name}</span>
                      {ch.is_read_only && <span className="ml-auto text-gray-600 text-xs flex-shrink-0">🔒</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Invite code */}
            <div className="px-3 py-3 border-t border-white/10">
              <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">Invite Code</p>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
                <code className="font-mono text-xs text-indigo-400 flex-1 tracking-widest">{selected.invite_code}</code>
                <button onClick={() => navigator.clipboard.writeText(selected.invite_code)}
                  className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Copy</button>
              </div>
            </div>

            {/* Leave */}
            <button onClick={() => leave.mutate()}
              className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 text-xs transition-colors">
              <LogOut size={13}/> Leave Community
            </button>
          </div>

          {/* ── Chat area — fills all remaining space ─────────────────── */}
          {channel ? (
            <div className={clsx('flex-1 min-w-0 min-h-0', mView === 'chat' ? 'flex' : 'hidden lg:flex')}>
              <MessageFeed
                community={selected}
                channel={channel}
                api={api}
                onBack={() => setMView('channels')}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Hash size={32} className="text-gray-700"/>
              <p className="text-gray-500 text-sm">Select a channel to start chatting</p>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateModal api={api} onClose={() => setShowCreate(false)}
          onCreated={c => { qc.invalidateQueries({queryKey:['my-communities']}); selectCommunity(c) }}/>
      )}
      {showSearch && (
        <SearchModal api={api} onClose={() => setShowSearch(false)}
          onJoined={() => qc.invalidateQueries({queryKey:['my-communities']})}/>
      )}
    </div>
  )
}