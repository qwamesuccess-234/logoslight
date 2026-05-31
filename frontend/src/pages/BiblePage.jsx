/**
 * BiblePage.jsx — Full featured Bible reader
 * Features:
 *  - Navigation chain: Book → Chapter → Verse (select specific verse)
 *  - Audio Bible reading (Web Speech API — no extra library)
 *  - Multi-version comparison (side by side)
 *  - Verse of the Day with reactions + shareable poster card
 *  - Persistent state (last book/chapter/search survives tab switching)
 *  - Scripture search with pagination
 *  - Bookmarks
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, BookOpen, Bookmark, BookmarkCheck, Loader2, ArrowLeft,
  Copy, FileText, Share2, X, Clock, ChevronRight, Volume2, VolumeX, Smile, Play, Pause,
  GitCompare, Download, Plus, Pause, Play
} from 'lucide-react'
import { useApiClient } from '@/hooks/useApiClient'
import { useReadingHistory } from '@/hooks/useReadingHistory'
import { useSettingsStore } from '@/store/settingsStore'
import { useAppStateStore } from '@/store/appStateStore'
import EmojiPicker from '@/components/EmojiPicker'
import clsx from 'clsx'

// ── 66 canonical books ────────────────────────────────────────────────────────
const BOOKS = [
  {name:'Genesis',code:'GEN',chapters:50,t:'OT'},{name:'Exodus',code:'EXO',chapters:40,t:'OT'},
  {name:'Leviticus',code:'LEV',chapters:27,t:'OT'},{name:'Numbers',code:'NUM',chapters:36,t:'OT'},
  {name:'Deuteronomy',code:'DEU',chapters:34,t:'OT'},{name:'Joshua',code:'JOS',chapters:24,t:'OT'},
  {name:'Judges',code:'JDG',chapters:21,t:'OT'},{name:'Ruth',code:'RUT',chapters:4,t:'OT'},
  {name:'1 Samuel',code:'1SA',chapters:31,t:'OT'},{name:'2 Samuel',code:'2SA',chapters:24,t:'OT'},
  {name:'1 Kings',code:'1KI',chapters:22,t:'OT'},{name:'2 Kings',code:'2KI',chapters:25,t:'OT'},
  {name:'1 Chronicles',code:'1CH',chapters:29,t:'OT'},{name:'2 Chronicles',code:'2CH',chapters:36,t:'OT'},
  {name:'Ezra',code:'EZR',chapters:10,t:'OT'},{name:'Nehemiah',code:'NEH',chapters:13,t:'OT'},
  {name:'Esther',code:'EST',chapters:10,t:'OT'},{name:'Job',code:'JOB',chapters:42,t:'OT'},
  {name:'Psalms',code:'PSA',chapters:150,t:'OT'},{name:'Proverbs',code:'PRO',chapters:31,t:'OT'},
  {name:'Ecclesiastes',code:'ECC',chapters:12,t:'OT'},{name:'Song of Solomon',code:'SNG',chapters:8,t:'OT'},
  {name:'Isaiah',code:'ISA',chapters:66,t:'OT'},{name:'Jeremiah',code:'JER',chapters:52,t:'OT'},
  {name:'Lamentations',code:'LAM',chapters:5,t:'OT'},{name:'Ezekiel',code:'EZK',chapters:48,t:'OT'},
  {name:'Daniel',code:'DAN',chapters:12,t:'OT'},{name:'Hosea',code:'HOS',chapters:14,t:'OT'},
  {name:'Joel',code:'JOL',chapters:3,t:'OT'},{name:'Amos',code:'AMO',chapters:9,t:'OT'},
  {name:'Obadiah',code:'OBA',chapters:1,t:'OT'},{name:'Jonah',code:'JON',chapters:4,t:'OT'},
  {name:'Micah',code:'MIC',chapters:7,t:'OT'},{name:'Nahum',code:'NAM',chapters:3,t:'OT'},
  {name:'Habakkuk',code:'HAB',chapters:3,t:'OT'},{name:'Zephaniah',code:'ZEP',chapters:3,t:'OT'},
  {name:'Haggai',code:'HAG',chapters:2,t:'OT'},{name:'Zechariah',code:'ZEC',chapters:14,t:'OT'},
  {name:'Malachi',code:'MAL',chapters:4,t:'OT'},
  {name:'Matthew',code:'MAT',chapters:28,t:'NT'},{name:'Mark',code:'MRK',chapters:16,t:'NT'},
  {name:'Luke',code:'LUK',chapters:24,t:'NT'},{name:'John',code:'JHN',chapters:21,t:'NT'},
  {name:'Acts',code:'ACT',chapters:28,t:'NT'},{name:'Romans',code:'ROM',chapters:16,t:'NT'},
  {name:'1 Corinthians',code:'1CO',chapters:16,t:'NT'},{name:'2 Corinthians',code:'2CO',chapters:13,t:'NT'},
  {name:'Galatians',code:'GAL',chapters:6,t:'NT'},{name:'Ephesians',code:'EPH',chapters:6,t:'NT'},
  {name:'Philippians',code:'PHP',chapters:4,t:'NT'},{name:'Colossians',code:'COL',chapters:4,t:'NT'},
  {name:'1 Thessalonians',code:'1TH',chapters:5,t:'NT'},{name:'2 Thessalonians',code:'2TH',chapters:3,t:'NT'},
  {name:'1 Timothy',code:'1TI',chapters:6,t:'NT'},{name:'2 Timothy',code:'2TI',chapters:4,t:'NT'},
  {name:'Titus',code:'TIT',chapters:3,t:'NT'},{name:'Philemon',code:'PHM',chapters:1,t:'NT'},
  {name:'Hebrews',code:'HEB',chapters:13,t:'NT'},{name:'James',code:'JAS',chapters:5,t:'NT'},
  {name:'1 Peter',code:'1PE',chapters:5,t:'NT'},{name:'2 Peter',code:'2PE',chapters:3,t:'NT'},
  {name:'1 John',code:'1JN',chapters:5,t:'NT'},{name:'2 John',code:'2JN',chapters:1,t:'NT'},
  {name:'3 John',code:'3JN',chapters:1,t:'NT'},{name:'Jude',code:'JUD',chapters:1,t:'NT'},
  {name:'Revelation',code:'REV',chapters:22,t:'NT'},
]

// Quick verse counts per book (approximate for popular books)
const VERSE_COUNTS = {
  'GEN.1':31,'GEN.2':25,'EXO.20':26,'PSA.23':6,'PSA.119':176,
  'JHN.1':51,'JHN.3':36,'ROM.8':39,'MAT.5':48,'MAT.6':34,
}

const VERSIONS_COMMON = [
  {id:'de4e12af7f28f599-02',label:'KJV'},
  {id:'01b29f4b342acc35-01',label:'ASV'},
  {id:'65eec8e0b60e656b-01',label:'WEB'},
]

// ── Audio Reader Hook ─────────────────────────────────────────────────────────
function useAudioReader() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused,  setIsPaused]  = useState(false)
  const uttRef = useRef(null)

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 0.85
    utt.pitch = 1
    utt.lang  = 'en-US'
    // Pick a nice voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
    )
    if (preferred) utt.voice = preferred
    utt.onstart  = () => { setIsPlaying(true); setIsPaused(false) }
    utt.onend    = () => { setIsPlaying(false); setIsPaused(false); onEnd?.() }
    utt.onerror  = () => { setIsPlaying(false); setIsPaused(false) }
    uttRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [])

  const pause  = () => { window.speechSynthesis.pause();  setIsPaused(true)  }
  const resume = () => { window.speechSynthesis.resume(); setIsPaused(false) }
  const stop   = () => { window.speechSynthesis.cancel(); setIsPlaying(false); setIsPaused(false) }

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return { isPlaying, isPaused, speak, pause, resume, stop, supported: !!window.speechSynthesis }
}

// ── Verse Poster Card (shareable) ─────────────────────────────────────────────
function PosterCard({ text, reference, onClose, dark }) {
  const canvasRef = useRef(null)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = 1080; canvas.height = 1080

    // Background gradient
    const grad = ctx.createLinearGradient(0,0,1080,1080)
    grad.addColorStop(0,'#0f0d2e')
    grad.addColorStop(1,'#1e1b4b')
    ctx.fillStyle = grad
    ctx.fillRect(0,0,1080,1080)

    // Gold accent line
    ctx.fillStyle = '#d4900f'
    ctx.fillRect(60,60,8,960)

    // App name
    ctx.fillStyle = '#d4900f'
    ctx.font = 'bold 32px Georgia'
    ctx.fillText('LogosLight', 90, 120)

    // Verse text — word wrap
    ctx.fillStyle = '#fdf8ec'
    ctx.font = 'italic 48px Georgia'
    const words = `"${text}"`.split(' ')
    let line='', y=250, maxW=900
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, 90, y); line = word + ' '; y += 70
      } else { line = test }
    }
    ctx.fillText(line, 90, y)

    // Reference
    ctx.fillStyle = '#d4900f'
    ctx.font = 'bold 40px Georgia'
    ctx.fillText(`— ${reference}`, 90, y + 100)

    // Bottom tagline
    ctx.fillStyle = 'rgba(212,144,15,0.4)'
    ctx.font = '28px Georgia'
    ctx.fillText('Know God Deeply · logoslight.app', 90, 980)

  }, [text, reference])

  const download = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `verse-${reference.replace(/[^a-z0-9]/gi,'-')}.png`
    link.href = canvas.toDataURL()
    link.click()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  const share = async () => {
    const canvas = canvasRef.current
    canvas.toBlob(async blob => {
      if (navigator.share && blob) {
        await navigator.share({
          title: 'LogosLight',
          text: `"${text}" — ${reference}`,
          files: [new File([blob], 'verse.png', { type: 'image/png' })],
        }).catch(() => download())
      } else { download() }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-2xl overflow-hidden max-w-sm w-full" onClick={e=>e.stopPropagation()}
        style={{background:'#0f0d2e',border:'1px solid rgba(212,144,15,0.3)'}}>
        <canvas ref={canvasRef} className="w-full h-auto" style={{maxHeight:'60vw'}}/>
        <div className="p-4 flex gap-3">
          <button onClick={download} className="btn-primary flex-1 justify-center text-sm">
            <Download size={14}/> {downloaded ? 'Saved!' : 'Download'}
          </button>
          <button onClick={share} className="btn-secondary flex-1 justify-center text-sm">
            <Share2 size={14}/> Share
          </button>
          <button onClick={onClose} className="btn-ghost px-3"><X size={16}/></button>
        </div>
      </div>
    </div>
  )
}

// ── Version Comparison Modal ───────────────────────────────────────────────────
function CompareModal({ api, reference, dark, onClose }) {
  const [selected, setSelected] = useState([])
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState([])

  const { data: bibles } = useQuery({
    queryKey: ['bibles-list'],
    queryFn: () => api.get('/bible/list/').then(r => r.data),
  })

  const compare = async () => {
    if (!selected.length) return
    setLoading(true)
    try {
      const r = await api.get(`/bible/compare/?reference=${encodeURIComponent(reference)}&versions=${selected.join(',')}`)
      setResults(r.data.versions || [])
    } finally { setLoading(false) }
  }

  const tc = dark ? '#ffffff' : '#1e1b4b'
  const sc = dark ? '#aaaaaa' : '#6b7280'
  const cardBg = dark ? '#111111' : '#ffffff'
  const cardBorder = dark ? '#2a2a2a' : '#e5d9b6'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
        style={{backgroundColor:dark?'#111':'#fff',border:`1px solid ${cardBorder}`}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold" style={{color:tc}}>Compare Versions</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-parchment-100" style={{color:sc}}><X size={17}/></button>
        </div>
        <p className="font-mono text-sm mb-4 px-3 py-1.5 rounded-lg inline-block" style={{background:'rgba(212,144,15,0.1)',color:'#d4900f'}}>{reference}</p>

        {/* Bible selector */}
        <p className="font-ui text-xs uppercase tracking-wide mb-2" style={{color:sc}}>Select translations (max 5)</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(bibles?.bibles||VERSIONS_COMMON).slice(0,12).map(b => (
            <button key={b.id}
              onClick={() => setSelected(s => s.includes(b.id) ? s.filter(x=>x!==b.id) : s.length<5?[...s,b.id]:s)}
              className="px-3 py-1.5 rounded-lg font-ui text-xs font-medium transition-all border"
              style={{
                background: selected.includes(b.id) ? '#d4900f' : dark?'#1a1a1a':'#f5f5f5',
                color: selected.includes(b.id) ? '#ffffff' : tc,
                borderColor: selected.includes(b.id) ? '#d4900f' : cardBorder,
              }}>
              {b.abbreviation || b.label || b.id.substring(0,8)}
            </button>
          ))}
        </div>

        <button onClick={compare} disabled={!selected.length||loading} className="btn-primary mb-5 disabled:opacity-50">
          {loading?<Loader2 size={14} className="animate-spin"/>:<GitCompare size={14}/>} Compare
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            {results.map(v => (
              <div key={v.bible_id} className="rounded-xl p-4" style={{background:dark?'#1a1a1a':'#fdf5e4',border:`1px solid ${cardBorder}`}}>
                <span className="font-mono text-xs font-bold px-2 py-1 rounded mb-3 inline-block" style={{background:'rgba(212,144,15,0.15)',color:'#d4900f'}}>
                  {v.abbreviation}
                </span>
                {v.text
                  ? <p className="font-display italic text-sm leading-relaxed mt-2" style={{color:tc}}>"{v.text}"</p>
                  : <p className="font-ui text-xs italic" style={{color:sc}}>Not available in this translation</p>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Verse of the Day Card with reactions + poster ─────────────────────────────
function VerseOfDay({ api, dark }) {
  const qc = useQueryClient()
  const [showPoster, setShowPoster] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const { isPlaying, isPaused, speak, pause, resume, stop, supported } = useAudioReader()
  const today = new Date().toISOString().split('T')[0]

  const { data, isLoading } = useQuery({
    queryKey: ['verse-of-day'],
    queryFn: () => api.get('/bible/verse-of-the-day/').then(r => r.data),
    staleTime: 1000 * 60 * 60,
  })

  const { data: reactData, refetch: refetchReacts } = useQuery({
    queryKey: ['verse-reactions', today],
    queryFn: () => api.get(`/bible/verse-reactions/?date=${today}`).then(r => r.data),
    enabled: !!data?.text,
  })

  const addReact = useMutation({
    mutationFn: emoji => api.post('/bible/verse-reactions/', { date: today, emoji }),
    onSuccess: () => refetchReacts(),
  })
  const delReact = useMutation({
    mutationFn: emoji => api.delete('/bible/verse-reactions/', { data: { date: today, emoji } }),
    onSuccess: () => refetchReacts(),
  })

  const reactions = reactData?.reactions || {}

  return (
    <div className="rounded-2xl p-5 mb-5" style={{background:'linear-gradient(135deg,#0f0d2e 0%,#1e1b4b 100%)'}}>
      <p className="font-ui text-xs uppercase tracking-widest mb-3" style={{color:'#d4900f'}}>✦ Verse of the Day</p>

      {isLoading && <div className="h-16 flex items-center gap-2"><Loader2 size={16} className="animate-spin" style={{color:'#d4900f'}}/><span className="text-sm" style={{color:'#9ca3af'}}>Loading verse...</span></div>}

      {data?.text && (
        <>
          <p className="font-display italic leading-relaxed mb-3" style={{color:'#fdf8ec',fontSize:'clamp(0.9rem,2vw,1.15rem)'}}>
            "{data.text}"
          </p>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <span className="font-mono text-xs px-3 py-1 rounded-full" style={{background:'rgba(212,144,15,0.15)',color:'#d4900f',border:'1px solid rgba(212,144,15,0.3)'}}>
              {data.reference}
            </span>
            <div className="flex items-center gap-2">
              {supported && (
                <button
                  onClick={() => isPlaying ? (isPaused ? resume() : pause()) : speak(data.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui text-xs transition-all"
                  style={{background:'rgba(255,255,255,0.08)',color:'#e5e5e5'}}>
                  {isPlaying ? (isPaused ? <Play size={13}/> : <Pause size={13}/>) : <Volume2 size={13}/>}
                  {isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
                </button>
              )}
              {isPlaying && <button onClick={stop} className="px-2 py-1.5 rounded-lg font-ui text-xs" style={{background:'rgba(255,255,255,0.08)',color:'#e5e5e5'}}><VolumeX size={13}/></button>}
              <button onClick={() => setShowPoster(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui text-xs transition-all"
                style={{background:'rgba(212,144,15,0.15)',color:'#d4900f',border:'1px solid rgba(212,144,15,0.25)'}}>
                <Share2 size={13}/> Share Card
              </button>
            </div>
          </div>

          {/* Reactions — full emoji picker */}
          <div className="flex flex-wrap items-center gap-2 pt-3 relative" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
            {/* Existing reactions */}
            {Object.entries(reactions).map(([e, r]) => (
              <button key={e}
                onClick={() => r.reacted_by_me ? delReact.mutate(e) : addReact.mutate(e)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-ui text-xs transition-all"
                style={{
                  background: r.reacted_by_me ? 'rgba(212,144,15,0.25)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${r.reacted_by_me ? 'rgba(212,144,15,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: r.reacted_by_me ? '#d4900f' : '#9ca3af',
                  transform: r.reacted_by_me ? 'scale(1.05)' : 'scale(1)',
                }}>
                {e} <span>{r.count}</span>
              </button>
            ))}

            {/* Add reaction button — opens full emoji picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full font-ui text-xs transition-all"
                style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#9ca3af'}}>
                <Smile size={13}/> React
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => { addReact.mutate(emoji); setShowEmojiPicker(false) }}
                  onClose={() => setShowEmojiPicker(false)}
                  dark={true}
                  position="top"
                />
              )}
            </div>
          </div>
        </>
      )}

      {!isLoading && !data?.text && (
        <p className="font-body text-sm italic" style={{color:'rgba(253,248,236,0.5)'}}>
          Verse unavailable — pin BIBLE_API_BIBLE_ID in backend/.env
        </p>
      )}

      {showPoster && data?.text && (
        <PosterCard text={data.text} reference={data.reference} onClose={() => setShowPoster(false)} dark={dark}/>
      )}
    </div>
  )
}


// ── Main Bible Reader: Book → Chapter → Verse → Content ──────────────────────
function BibleReader({ api, initialBook, initialChapter, darkMode, onNavigate }) {
  const qc = useQueryClient()
  const { getHistory, addToHistory } = useReadingHistory()
  const { fontSize } = useSettingsStore()
  const { isPlaying, isPaused, speak, pause, resume, stop, supported } = useAudioReader()

  const dark = darkMode
  const tc = dark?'#ffffff':'#1e1b4b'; const sc = dark?'#aaaaaa':'#6b7280'
  const cardBg = dark?'#111111':'#ffffff'; const cardBorder = dark?'#2a2a2a':'#e5d9b6'
  const fsCls = {sm:'text-sm',base:'text-base',lg:'text-lg leading-loose',xl:'text-xl leading-loose'}[fontSize]||'text-base'

  const [book,    setBook]    = useState(initialBook || null)
  const [chapter, setChapter] = useState(initialChapter || null)
  const [verse,   setVerse]   = useState(null)     // selected verse number
  const [bSearch, setBSearch] = useState('')
  const [testament, setTestament] = useState('all')
  const [history, setHistory] = useState(() => getHistory())
  const [showCompare, setShowCompare] = useState(false)
  const chapterRef = useRef(null)

  const addBM = useMutation({
    mutationFn: d => api.post('/bible/bookmarks/', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })

  // Fetch chapter content
  const { data: chData, isLoading: loadCh } = useQuery({
    queryKey: ['chapter', book?.code, chapter],
    queryFn: () => api.get(`/bible/passage/?book=${book.code}&chapter=${chapter}`).then(r => r.data),
    enabled: !!(book && chapter && !verse),
  })

  // Fetch single verse
  const { data: verseData, isLoading: loadVerse } = useQuery({
    queryKey: ['verse', book?.code, chapter, verse],
    queryFn: () => api.get(`/bible/passage/?book=${book.code}&chapter=${chapter}&verse=${verse}`).then(r => r.data),
    enabled: !!(book && chapter && verse),
  })

  useEffect(() => {
    if (book && chapter) {
      const u = addToHistory(book.name, chapter)
      setHistory(u)
      if (onNavigate) onNavigate(book, chapter)
    }
  }, [book?.code, chapter])

  useEffect(() => { chapterRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }, [chapter, verse])

  const filtered = BOOKS.filter(b => {
    const mn = b.name.toLowerCase().includes(bSearch.toLowerCase())
    const mt = testament === 'all' || b.t === testament
    return mn && mt
  })

  // ── STEP 1: Book list ──────────────────────────────────────────────────────
  if (!book) {
    const ot = filtered.filter(b => b.t === 'OT')
    const nt = filtered.filter(b => b.t === 'NT')
    return (
      <div>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input className="input flex-1" placeholder="Search books..." value={bSearch} onChange={e=>setBSearch(e.target.value)}
            style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
          <div className="flex gap-1">
            {['all','OT','NT'].map(t => (
              <button key={t} onClick={() => setTestament(t)}
                className={clsx('px-3 py-2 rounded-lg font-ui text-xs font-medium transition-colors',
                  testament===t?'text-white':'hover:opacity-80')}
                style={{background:testament===t?'#d4900f':dark?'#1a1a1a':'#f0e8d4',color:testament===t?'#fff':sc}}>
                {t==='all'?'All':t==='OT'?'Old':'New'}
              </button>
            ))}
          </div>
        </div>

        {/* Reading history */}
        {history.length > 0 && !bSearch && (
          <div className="mb-5">
            <p className="font-ui text-xs uppercase tracking-wide mb-2 flex items-center gap-1" style={{color:sc}}><Clock size={11}/> Recently Read</p>
            <div className="flex gap-2 flex-wrap">
              {history.slice(0,5).map((h,i) => {
                const b = BOOKS.find(x => x.name === h.book)
                return b ? (
                  <button key={i} onClick={() => { setBook(b); setChapter(h.chapter) }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full font-ui text-xs transition-colors"
                    style={{background:dark?'#1a1a1a':'#fdf5e4',border:`1px solid ${dark?'#333':'#e5d9b6'}`,color:tc}}>
                    {h.book} {h.chapter}<ChevronRight size={11}/>
                  </button>
                ) : null
              })}
            </div>
          </div>
        )}

        {[['Old Testament',ot],['New Testament',nt]].map(([label,list]) => (
          list.length > 0 && (
            <div key={label} className="mb-5">
              <p className="font-ui text-xs uppercase tracking-wide mb-2" style={{color:sc}}>{label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {list.map(b => (
                  <button key={b.code} onClick={() => setBook(b)}
                    className="p-3 rounded-xl border text-left transition-all hover:border-primary-400 group"
                    style={{backgroundColor:cardBg,borderColor:cardBorder}}>
                    <p className="font-ui text-sm font-medium truncate group-hover:text-primary-500" style={{color:tc}}>{b.name}</p>
                    <p className="font-ui text-xs mt-0.5" style={{color:sc}}>{b.chapters} chapters</p>
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    )
  }

  // ── STEP 2: Chapter grid ────────────────────────────────────────────────────
  if (book && !chapter) {
    return (
      <div>
        <button onClick={() => setBook(null)} className="btn-ghost mb-4 text-sm"><ArrowLeft size={14}/> All Books</button>
        <h3 className="font-display text-xl font-semibold mb-4" style={{color:tc}}>{book.name}</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {Array.from({length:book.chapters},(_,i)=>i+1).map(ch => (
            <button key={ch} onClick={() => setChapter(ch)}
              className="p-2.5 rounded-lg border text-center font-ui text-sm font-medium transition-all hover:text-white"
              style={{backgroundColor:cardBg,borderColor:cardBorder,color:tc}}
              onMouseEnter={e=>{e.currentTarget.style.backgroundColor='#d4900f';e.currentTarget.style.borderColor='#d4900f';e.currentTarget.style.color='#fff'}}
              onMouseLeave={e=>{e.currentTarget.style.backgroundColor=cardBg;e.currentTarget.style.borderColor=cardBorder;e.currentTarget.style.color=tc}}>
              {ch}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── STEP 3: Verse list (select a specific verse) ────────────────────────────
  if (book && chapter && !verse) {
    const content = chData?.data?.content || chData?.data?.data?.content || ''
    // Parse verses list from API or generate 1..N
    const versesList = chData?.data?.data?.verses_list || chData?.data?.verses_list || []
    // Fallback: extract verse numbers from content using common pattern [1], [2]...
    const verseMatches = content.match(/\[(\d+)\]/g) || []
    const verseNums = versesList.length
      ? versesList.map(v => parseInt(v.id.split('.').pop()))
      : verseMatches.map(m => parseInt(m.replace(/[\[\]]/g,''))).filter((v,i,a)=>a.indexOf(v)===i)

    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => setChapter(null)} className="btn-ghost text-sm"><ArrowLeft size={14}/> Chapters</button>
          <span style={{color:sc}}>/</span>
          <h3 className="font-display text-lg font-semibold" style={{color:tc}}>{book.name} {chapter}</h3>

          {/* Audio chapter */}
          {supported && content && (
            <button onClick={() => isPlaying ? (isPaused?resume():pause()) : speak(content.replace(/\[\d+\]/g,''))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui text-xs ml-auto transition-all"
              style={{background:dark?'#1a1a1a':'#f0e8d4',color:isPlaying?'#d4900f':sc,border:`1px solid ${dark?'#333':'#e5d9b6'}`}}>
              {isPlaying?(isPaused?<Play size={13}/>:<Pause size={13}/>):<Volume2 size={13}/>}
              {isPlaying?(isPaused?'Resume':'Pause'):'Listen'}
            </button>
          )}
          {isPlaying && <button onClick={stop} className="p-1.5 rounded-lg" style={{color:sc}}><VolumeX size={14}/></button>}
        </div>

        {loadCh && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500"/></div>}

        {/* Verse number selector */}
        {verseNums.length > 0 && (
          <div className="mb-5">
            <p className="font-ui text-xs uppercase tracking-wide mb-2 flex items-center gap-1" style={{color:sc}}>
              Select a verse to read individually
            </p>
            <div className="flex flex-wrap gap-1.5">
              {verseNums.map(vn => (
                <button key={vn} onClick={() => setVerse(vn)}
                  className="w-9 h-9 rounded-lg font-ui text-sm font-medium transition-all hover:text-white flex items-center justify-center"
                  style={{background:dark?'#1a1a1a':'#f0e8d4',color:tc,border:`1px solid ${dark?'#333':'#e5d9b6'}`}}
                  onMouseEnter={e=>{e.currentTarget.style.background='#d4900f';e.currentTarget.style.color='#fff'}}
                  onMouseLeave={e=>{e.currentTarget.style.background=dark?'#1a1a1a':'#f0e8d4';e.currentTarget.style.color=tc}}>
                  {vn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full chapter text */}
        {content && (
          <div ref={chapterRef} className="rounded-2xl border p-5 md:p-7"
            style={{backgroundColor:cardBg,borderColor:cardBorder}}>
            <div className={clsx('font-body leading-loose whitespace-pre-wrap select-text',fsCls)} style={{color:dark?'#e5e5e5':'#374151'}}>
              {content}
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-between mt-8 pt-4" style={{borderTop:`1px solid ${cardBorder}`}}>
              <button onClick={() => {
                if (chapter > 1) setChapter(c=>c-1)
                else { const idx=BOOKS.findIndex(b=>b.code===book.code); if(idx>0){const pb=BOOKS[idx-1];setBook(pb);setChapter(pb.chapters)} }
              }} className="btn-secondary text-sm">
                ← {chapter > 1 ? `Chapter ${chapter-1}` : 'Prev Book'}
              </button>
              <span className="font-ui text-xs" style={{color:sc}}>{chapter} / {book.chapters}</span>
              <button onClick={() => {
                if (chapter < book.chapters) setChapter(c=>c+1)
                else { const idx=BOOKS.findIndex(b=>b.code===book.code); if(idx<BOOKS.length-1){setBook(BOOKS[idx+1]);setChapter(1)} }
              }} className="btn-primary text-sm">
                {chapter < book.chapters ? `Chapter ${chapter+1}` : 'Next Book'} →
              </button>
            </div>
          </div>
        )}

        {showCompare && <CompareModal api={api} reference={`${book.name} ${chapter}`} dark={dark} onClose={()=>setShowCompare(false)}/>}
      </div>
    )
  }

  // ── STEP 4: Single Verse view ───────────────────────────────────────────────
  if (book && chapter && verse) {
    const vText   = verseData?.data?.text  || ''
    const vRef    = verseData?.data?.reference || `${book.name} ${chapter}:${verse}`

    return (
      <div>
        {/* Breadcrumb: Book / Chapter / Verse */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          <button onClick={() => setBook(null)} className="font-ui text-sm hover:underline" style={{color:'#d4900f'}}>{book.name}</button>
          <span style={{color:sc}}>/</span>
          <button onClick={() => setVerse(null)} className="font-ui text-sm hover:underline" style={{color:'#d4900f'}}>Chapter {chapter}</button>
          <span style={{color:sc}}>/</span>
          <span className="font-ui text-sm font-semibold" style={{color:tc}}>Verse {verse}</span>
        </div>

        {loadVerse && <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500"/></div>}

        {vText && (
          <div className="rounded-2xl p-6" style={{background:'linear-gradient(135deg,#0f0d2e 0%,#1e1b4b 100%)'}}>
            <p className="font-display text-xl italic leading-relaxed mb-4" style={{color:'#fdf8ec'}}>
              "{vText}"
            </p>
            <p className="font-mono text-sm mb-5" style={{color:'#d4900f'}}>{vRef}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {supported && (
                <button onClick={() => isPlaying?(isPaused?resume():pause()):speak(vText)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-ui text-xs transition-all"
                  style={{background:'rgba(255,255,255,0.08)',color:'#e5e5e5'}}>
                  {isPlaying?(isPaused?<Play size={13}/>:<Pause size={13}/>):<Volume2 size={13}/>}
                  {isPlaying?(isPaused?'Resume':'Pause'):'Listen'}
                </button>
              )}
              <button onClick={() => navigator.clipboard.writeText(`"${vText}" — ${vRef}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-ui text-xs"
                style={{background:'rgba(255,255,255,0.08)',color:'#e5e5e5'}}>
                <Copy size={13}/> Copy
              </button>
              <button onClick={() => setShowCompare(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-ui text-xs"
                style={{background:'rgba(255,255,255,0.08)',color:'#e5e5e5'}}>
                <GitCompare size={13}/> Compare Versions
              </button>
              <button onClick={() => addBM.mutate({book:book.name,chapter,verse,note:vText.substring(0,200)})}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-ui text-xs"
                style={{background:'rgba(212,144,15,0.15)',color:'#d4900f',border:'1px solid rgba(212,144,15,0.3)'}}>
                <Bookmark size={13}/> Bookmark
              </button>
            </div>
          </div>
        )}

        {/* Navigate between verses */}
        <div className="flex items-center justify-between mt-4">
          {verse > 1 && <button onClick={() => setVerse(v=>v-1)} className="btn-secondary text-sm">← Verse {verse-1}</button>}
          <button onClick={() => setVerse(null)} className="btn-ghost text-sm mx-auto">View full chapter</button>
          <button onClick={() => setVerse(v=>v+1)} className="btn-primary text-sm">Verse {verse+1} →</button>
        </div>

        {showCompare && <CompareModal api={api} reference={vRef} dark={dark} onClose={() => setShowCompare(false)}/>}
      </div>
    )
  }
}

// ── Scripture Search ───────────────────────────────────────────────────────────
function ScriptureSearch({ api, darkMode, onOpenInReader, initialQuery='', initialOffset=0, onSearchChange, onClear }) {
  const qc = useQueryClient()
  const dark = darkMode
  const tc = dark?'#ffffff':'#1e1b4b'; const sc = dark?'#aaaaaa':'#6b7280'
  const cardBg = dark?'#111111':'#ffffff'; const cardBorder = dark?'#2a2a2a':'#e5d9b6'

  const [input,  setInput]  = useState(initialQuery||'')
  const [query,  setQuery]  = useState(initialQuery||'')
  const [offset, setOffset] = useState(initialOffset||0)
  const LIMIT = 50

  const { data, isLoading } = useQuery({
    queryKey: ['bible-search', query, offset],
    queryFn: () => api.get(`/bible/search/?q=${encodeURIComponent(query)}&limit=${LIMIT}&offset=${offset}`).then(r => r.data),
    enabled: query.length > 2,
  })

  const addBM = useMutation({
    mutationFn: d => api.post('/bible/bookmarks/', d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })

  const verses = data?.data?.verses || []
  const total  = data?.data?.total  || 0
  const hasMore = data?.data?.has_more

  return (
    <div>
      <form onSubmit={e=>{e.preventDefault();if(input.trim().length>2){setOffset(0);setQuery(input.trim());if(onSearchChange)onSearchChange(input.trim(),0)}}} className="flex gap-2 mb-5">
        <input type="search" className="input flex-1"
          placeholder='Search all scripture… "grace", "faith", "love one another"'
          value={input} onChange={e=>setInput(e.target.value)}
          style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
        <button type="submit" className="btn-primary px-4 flex-shrink-0">
          {isLoading?<Loader2 size={16} className="animate-spin"/>:<Search size={16}/>}
          <span className="hidden sm:inline">Search</span>
        </button>
        {(query||input) && (
          <button type="button" onClick={()=>{setInput('');setQuery('');setOffset(0);if(onClear)onClear()}}
            className="btn-secondary px-3 flex-shrink-0 text-sm">Clear</button>
        )}
      </form>

      {query && !isLoading && verses.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <p className="font-ui text-sm" style={{color:sc}}>{offset+1}–{Math.min(offset+verses.length,total)} of <strong style={{color:tc}}>{total}</strong> for "<em>{query}</em>"</p>
          <div className="flex gap-2">
            {offset > 0 && <button onClick={()=>{const o=Math.max(0,offset-LIMIT);setOffset(o);if(onSearchChange)onSearchChange(query,o)}} className="btn-secondary text-xs px-3 py-1.5">← Prev</button>}
            {hasMore && <button onClick={()=>{const o=offset+LIMIT;setOffset(o);if(onSearchChange)onSearchChange(query,o)}} className="btn-primary text-xs px-3 py-1.5">Next →</button>}
          </div>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-12"><Loader2 size={26} className="animate-spin text-primary-500"/></div>}

      <div className="space-y-3">
        {verses.map((v,i) => (
          <div key={v.id||i} className="rounded-2xl border p-4" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <button onClick={() => onOpenInReader(v.reference)}
                className="font-mono text-xs px-2.5 py-1 rounded-full transition-colors hover:bg-primary-100"
                style={{background:'rgba(212,144,15,0.1)',color:'#d4900f',border:'1px solid rgba(212,144,15,0.2)'}}
                title="Open in Reader">
                {v.reference}
              </button>
              <button onClick={() => addBM.mutate({book:v.reference?.split(' ')[0]||'',chapter:1,verse:1,note:v.text?.substring(0,150)})}
                className="p-1 transition-colors flex-shrink-0" style={{color:sc}}>
                <Bookmark size={14}/>
              </button>
            </div>
            <p className="font-body text-sm leading-relaxed" style={{color:dark?'#e5e5e5':'#374151'}}>{v.text}</p>
          </div>
        ))}
      </div>

      {!query && (
        <div className="text-center py-16">
          <Search size={40} className="text-parchment-300 mx-auto mb-4"/>
          <h3 className="font-display text-xl font-semibold mb-2" style={{color:tc}}>Search All of Scripture</h3>
          <p className="font-body text-sm" style={{color:sc}}>Your last search is remembered when you switch tabs.</p>
        </div>
      )}
    </div>
  )
}

// ── Bookmarks Panel ────────────────────────────────────────────────────────────
function BookmarksPanel({ api, dark }) {
  const qc = useQueryClient()
  const tc = dark?'#ffffff':'#1e1b4b'; const sc = dark?'#aaaaaa':'#6b7280'
  const { data, isLoading } = useQuery({ queryKey:['bookmarks'], queryFn:()=>api.get('/bible/bookmarks/').then(r=>r.data) })
  const rm = useMutation({ mutationFn:id=>api.delete(`/bible/bookmarks/${id}/`), onSuccess:()=>qc.invalidateQueries({queryKey:['bookmarks']}) })
  if (isLoading) return <Loader2 size={15} className="animate-spin text-primary-400 mx-auto mt-4"/>
  const list = data?.results || []
  return (
    <div>
      <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2" style={{color:tc}}>
        <Bookmark size={14} className="text-primary-500"/> Bookmarks ({list.length})
      </h3>
      {list.length === 0
        ? <p className="font-body text-xs italic" style={{color:sc}}>No bookmarks yet. Navigate to a verse and tap Bookmark.</p>
        : <div className="space-y-2 max-h-96 overflow-y-auto">
            {list.map(bm => (
              <div key={bm.id} className="flex items-start gap-2 p-2.5 rounded-xl border"
                style={{background:dark?'#1a1a1a':'#fdf5e4',borderColor:dark?'#333':'#e5d9b6'}}>
                <Bookmark size={12} className="text-primary-500 flex-shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs mb-0.5" style={{color:'#d4900f'}}>{bm.book} {bm.chapter}:{bm.verse}</p>
                  {bm.note && <p className="font-body text-xs line-clamp-2" style={{color:sc}}>{bm.note}</p>}
                </div>
                <button onClick={() => rm.mutate(bm.id)} className="text-xs flex-shrink-0" style={{color:sc}}>×</button>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Main BiblePage ─────────────────────────────────────────────────────────────
export default function BiblePage() {
  const api = useApiClient()
  const { darkMode } = useSettingsStore()
  const { lastBook, lastChapter, lastSearchQuery, lastSearchOffset, setLastBook, setLastSearch, clearLastSearch } = useAppStateStore()
  const dark = darkMode
  const tc = dark?'#ffffff':'#1e1b4b'

  const [tab,      setTab]      = useState(lastSearchQuery ? 'search' : 'reader')
  const [rBook,    setRBook]    = useState(lastBook || null)
  const [rChapter, setRChapter] = useState(lastChapter || null)

  const handleOpenInReader = (reference) => {
    if (!reference) return
    const m = reference.match(/^(.+?)\s+(\d+)/)
    if (!m) return
    const b = BOOKS.find(x => x.name.toLowerCase().startsWith(m[1].toLowerCase()))
    if (b) { setRBook(b); setRChapter(parseInt(m[2])); setTab('reader') }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold mb-1" style={{color:tc}}>Scripture</h1>
        <p className="font-body text-sm text-secondary-500">Read and search the Word of God</p>
      </div>

      <VerseOfDay api={api} dark={dark}/>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{background:dark?'#1a1a1a':'#ecddb8'}}>
        {[{id:'reader',label:'Bible Reader',icon:BookOpen},{id:'search',label:'Search',icon:Search}].map(({id,label,icon:Icon}) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg font-ui text-sm font-medium transition-all')}
            style={{
              backgroundColor: tab===id ? (dark?'#222':'#fff') : 'transparent',
              color: tab===id ? tc : sc,
              boxShadow: tab===id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {tab === 'reader' && (
            <BibleReader
              api={api}
              initialBook={rBook}
              initialChapter={rChapter}
              darkMode={dark}
              onNavigate={(b,ch) => { setRBook(b); setRChapter(ch); setLastBook(b,ch) }}
            />
          )}
          {tab === 'search' && (
            <ScriptureSearch
              api={api}
              darkMode={dark}
              onOpenInReader={handleOpenInReader}
              initialQuery={lastSearchQuery}
              initialOffset={lastSearchOffset}
              onSearchChange={(q,o) => setLastSearch(q,o)}
              onClear={clearLastSearch}
            />
          )}
        </div>
        <div className="rounded-2xl border p-4 h-fit" style={{backgroundColor:dark?'#111111':'#ffffff',borderColor:dark?'#2a2a2a':'#e5d9b6'}}>
          <BookmarksPanel api={api} dark={dark}/>
        </div>
      </div>
    </div>
  )
}