/**
 * DevotionalPage.jsx — Sprint 3 + dark mode + streak tracker
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sun, BookOpen, CheckCircle, ChevronRight, Loader2, Trophy, ArrowLeft, Lock, Search, Star, Flame } from 'lucide-react'
import { useApiClient } from '@/hooks/useApiClient'
import { useSettingsStore } from '@/store/settingsStore'
import { useStreak } from '@/hooks/useStreak'
import clsx from 'clsx'

const TAGS = [
  {label:'Prayer',tag:'prayer',emoji:'🙏'},{label:'Faith',tag:'faith',emoji:'✝️'},
  {label:'Psalms',tag:'psalms',emoji:'📜'},{label:'Gospels',tag:'gospel',emoji:'📖'},
  {label:'New Testament',tag:'new testament',emoji:'✨'},{label:'Strength',tag:'strength',emoji:'💪'},
  {label:'Grace',tag:'grace',emoji:'🕊️'},{label:'Wisdom',tag:'wisdom',emoji:'🌟'},
]

function DevCard({ dev, status, dark }) {
  const [open, setOpen] = useState(status === 'current')
  const tc = dark ? '#ffffff' : '#1e1b4b'
  const sc = dark ? '#aaaaaa' : '#6b7280'
  const cardBg = dark ? '#111111' : '#ffffff'
  const cardBorder = dark ? (status==='current'?'#d4900f':status==='completed'?'#166534':'#2a2a2a') : (status==='current'?'#d4900f':status==='completed'?'#bbf7d0':'#e5d9b6')

  return (
    <div className="rounded-2xl border overflow-hidden transition-all" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
      <button className="w-full text-left p-4 flex items-center gap-3" onClick={()=>status!=='upcoming'&&setOpen(o=>!o)}>
        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white',
          status==='current'?'bg-yellow-500':status==='completed'?'bg-green-500':'bg-gray-500')}>
          {status==='completed'?'✓':dev.day_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-ui text-xs px-2 py-0.5 rounded-full font-medium" style={{
              background:status==='current'?'rgba(212,144,15,0.15)':status==='completed'?'rgba(22,101,52,0.15)':'rgba(107,114,128,0.15)',
              color:status==='current'?'#d4900f':status==='completed'?'#16a34a':sc
            }}>{status==='current'?'Today':status==='completed'?'Done':`Day ${dev.day_number}`}</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full" style={{background:'rgba(212,144,15,0.1)',color:'#d4900f',border:'1px solid rgba(212,144,15,0.2)'}}>{dev.scripture_reference}</span>
          </div>
          <p className="font-display font-semibold mt-0.5 truncate text-sm" style={{color:status==='upcoming'?sc:tc}}>{dev.title}</p>
        </div>
        {status==='upcoming'?<Lock size={13} style={{color:sc}}/>:<ChevronRight size={15} className={clsx('transition-transform',open&&'rotate-90')} style={{color:sc}}/>}
      </button>
      {open&&status!=='upcoming'&&(
        <div className="px-4 pb-5" style={{borderTop:`1px solid ${cardBorder}`}}>
          {dev.scripture_text&&(
            <div className="rounded-xl p-4 my-3" style={{background:'#0f0d2e'}}>
              <p className="font-ui text-xs uppercase tracking-wide mb-2" style={{color:'#d4900f'}}>Scripture</p>
              <p className="font-display text-sm italic leading-relaxed" style={{color:'#fdf8ec'}}>"{dev.scripture_text}"</p>
              <p className="font-mono text-xs mt-2" style={{color:'#d4900f'}}>{dev.scripture_reference}</p>
            </div>
          )}
          <p className="font-body text-sm leading-relaxed mt-3" style={{color:dark?'#e0e0e0':'#374151'}}>{dev.content}</p>
          {dev.reflection_question&&(
            <div className="rounded-xl p-4 mt-4" style={{background:dark?'#1a1500':'#fffbeb',border:`1px solid ${dark?'#3d2800':'#fcd34d'}`}}>
              <p className="font-ui text-xs uppercase tracking-wide mb-1" style={{color:'#d97706'}}>Reflection</p>
              <p className="font-body text-sm italic leading-relaxed" style={{color:dark?'#e5e5e5':'#374151'}}>{dev.reflection_question}</p>
            </div>
          )}
          {dev.prayer&&(
            <div className="mt-4 pt-3" style={{borderTop:`1px solid ${cardBorder}`}}>
              <p className="font-ui text-xs uppercase tracking-wide mb-1" style={{color:sc}}>Prayer</p>
              <p className="font-body text-sm italic leading-relaxed" style={{color:dark?'#cccccc':'#4b5563'}}>{dev.prayer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StreakBadge({ streak, longestStreak, dark }) {
  if (streak === 0 && longestStreak === 0) return null
  return (
    <div className="flex items-center gap-4 rounded-2xl border p-4 mb-5" style={{backgroundColor:dark?'#111111':'#fff7ed',borderColor:dark?'#3d2800':'#fed7aa'}}>
      <div className="flex items-center gap-2">
        <Flame size={22} className={streak>0?'text-orange-500':'text-gray-400'}/>
        <div>
          <p className="font-display text-2xl font-bold leading-none" style={{color:streak>0?'#ea580c':'#9ca3af'}}>{streak}</p>
          <p className="font-ui text-xs" style={{color:dark?'#aaaaaa':'#6b7280'}}>day streak</p>
        </div>
      </div>
      <div className="h-8 w-px" style={{background:dark?'#333':'#fed7aa'}}/>
      <div>
        <p className="font-display text-xl font-bold leading-none" style={{color:dark?'#d4900f':'#92400e'}}>{longestStreak}</p>
        <p className="font-ui text-xs" style={{color:dark?'#aaaaaa':'#6b7280'}}>longest streak</p>
      </div>
      {streak >= 7 && <span className="ml-auto text-2xl">🏆</span>}
      {streak >= 3 && streak < 7 && <span className="ml-auto text-2xl">🔥</span>}
    </div>
  )
}

function ActivePlanView({ progress, api, onBack, dark }) {
  const qc = useQueryClient()
  const tc = dark?'#ffffff':'#1e1b4b'; const sc = dark?'#aaaaaa':'#6b7280'
  const cardBg = dark?'#111111':'#ffffff'; const cardBorder = dark?'#2a2a2a':'#e5d9b6'

  const {data:devs,isLoading} = useQuery({
    queryKey:['devotionals',progress.plan],
    queryFn:()=>api.get(`/devotional/entries/?plan=${progress.plan}`).then(r=>r.data),
  })

  const markComplete = useMutation({
    mutationFn:()=>api.patch(`/devotional/my-progress/${progress.id}/`,{current_day:progress.current_day+1}),
    onSuccess:()=>qc.invalidateQueries({queryKey:['my-progress']}),
  })

  const all = devs?.results||[]
  const current  = all.find(d=>d.day_number===progress.current_day)
  const completed = all.filter(d=>d.day_number<progress.current_day)
  const upcoming  = all.filter(d=>d.day_number>progress.current_day)
  const finished  = progress.current_day>(progress.plan_duration_days||999)
  const pct = Math.min(Math.round(((progress.current_day-1)/(progress.plan_duration_days||1))*100),100)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={onBack} className="btn-ghost text-sm"><ArrowLeft size={15}/> Plans</button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-bold truncate" style={{color:tc}}>{progress.plan_title}</h2>
          <p className="font-ui text-xs" style={{color:sc}}>{finished?'Completed ✓':`Day ${progress.current_day} of ${progress.plan_duration_days}`}</p>
        </div>
        {finished&&<span className="font-ui text-xs px-3 py-1.5 rounded-full flex items-center gap-1" style={{color:'#16a34a',background:'rgba(22,163,74,0.1)',border:'1px solid rgba(22,163,74,0.2)'}}><Trophy size={12}/> Done!</span>}
      </div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:dark?'#333':'#e5d9b6'}}>
          <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:'#d4900f'}}/>
        </div>
        <span className="font-ui text-xs" style={{color:sc}}>{pct}%</span>
      </div>
      {isLoading&&<div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-500"/></div>}
      {finished&&(
        <div className="rounded-2xl border p-8 text-center mb-4" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
          <Trophy size={40} className="text-primary-500 mx-auto mb-3"/>
          <h3 className="font-display text-2xl font-bold mb-2" style={{color:tc}}>Plan Complete! 🎉</h3>
          <p className="font-body" style={{color:sc}}>You have completed <strong>{progress.plan_title}</strong>. Keep growing!</p>
        </div>
      )}
      {!finished&&current&&(
        <div className="mb-4">
          <DevCard dev={current} status="current" dark={dark}/>
          <div className="mt-3 flex justify-end">
            <button onClick={()=>markComplete.mutate()} disabled={markComplete.isPending} className="btn-primary disabled:opacity-50">
              {markComplete.isPending?<Loader2 size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
              Mark Day {progress.current_day} Complete{progress.current_day<(progress.plan_duration_days||0)?` → Day ${progress.current_day+1}`:''}
            </button>
          </div>
        </div>
      )}
      {upcoming.length>0&&(
        <div className="mb-4">
          <p className="font-ui text-xs uppercase tracking-wide mb-3 flex items-center gap-2" style={{color:sc}}><ChevronRight size={13}/> Coming Next ({upcoming.length})</p>
          <div className="space-y-2">{upcoming.slice(0,3).map(d=><DevCard key={d.id} dev={d} status="upcoming" dark={dark}/>)}</div>
          {upcoming.length>3&&<p className="font-ui text-xs text-center py-2" style={{color:sc}}>+{upcoming.length-3} more days ahead</p>}
        </div>
      )}
      {completed.length>0&&(
        <div>
          <p className="font-ui text-xs uppercase tracking-wide mb-3 flex items-center gap-2" style={{color:'#16a34a'}}><CheckCircle size={13}/> Completed ({completed.length})</p>
          <div className="space-y-2">{[...completed].reverse().map(d=><DevCard key={d.id} dev={d} status="completed" dark={dark}/>)}</div>
        </div>
      )}
    </div>
  )
}

function BrowsePlans({ api, myProgress, joinPlan, onSelectPlan, dark }) {
  const [searchInput,setSearchInput]=useState('')
  const [searchQuery,setSearchQuery]=useState('')
  const [activeTag,setActiveTag]=useState('')
  const tc=dark?'#ffffff':'#1e1b4b'; const sc=dark?'#aaaaaa':'#6b7280'
  const cardBg=dark?'#111111':'#ffffff'; const cardBorder=dark?'#2a2a2a':'#e5d9b6'

  const {data:featured}=useQuery({queryKey:['featured-plans'],queryFn:()=>api.get('/devotional/featured/').then(r=>r.data)})
  const {data:results,isLoading:searching}=useQuery({
    queryKey:['plan-search',searchQuery,activeTag],
    queryFn:()=>api.get(`/devotional/plans/?q=${encodeURIComponent([searchQuery,activeTag].filter(Boolean).join(' '))}`).then(r=>r.data),
    enabled:!!(searchQuery||activeTag),
  })

  const getProgress=id=>myProgress?.results?.find(p=>p.plan===id)
  const plans=(searchQuery||activeTag)?(results?.results||[]):(featured?.results||[])

  return (
    <div>
      <form onSubmit={e=>{e.preventDefault();setSearchQuery(searchInput.trim())}} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:sc}}/>
          <input className="input pl-9 w-full" placeholder="Search plans... prayer, faith, psalms"
            value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
        </div>
        <button type="submit" className="btn-primary px-4 flex-shrink-0">Search</button>
        {(searchQuery||activeTag)&&<button type="button" onClick={()=>{setSearchInput('');setSearchQuery('');setActiveTag('')}} className="btn-secondary px-3 flex-shrink-0 text-sm">Clear</button>}
      </form>
      <div className="flex flex-wrap gap-2 mb-5">
        {TAGS.map(cat=>(
          <button key={cat.tag} onClick={()=>setActiveTag(activeTag===cat.tag?'':cat.tag)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-ui text-xs border transition-all"
            style={{background:activeTag===cat.tag?'#d4900f':'transparent',color:activeTag===cat.tag?'#ffffff':sc,borderColor:activeTag===cat.tag?'#d4900f':dark?'#333':'#e5d9b6'}}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>
      <p className="font-display text-base font-semibold mb-3" style={{color:tc}}>
        {(searchQuery||activeTag)?`Results${plans.length?` (${plans.length})`:''}`:'⭐ Recommended Plans'}
      </p>
      {searching&&<div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-primary-500"/></div>}
      {!searching&&plans.length===0&&(
        <div className="text-center py-12">
          {(searchQuery||activeTag)
            ?<p className="font-body" style={{color:sc}}>No plans found. Try different keywords.</p>
            :<><Sun size={36} className="mx-auto mb-4 text-parchment-300"/><p className="font-body" style={{color:sc}}>No reading plans yet. Check back soon.</p></>
          }
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {plans.map(plan=>{
          const prog=getProgress(plan.id); const joined=!!prog; const done=!!prog?.completed_at
          return (
            <div key={plan.id} className="rounded-2xl border p-5" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(212,144,15,0.1)'}}>
                  {done?<Trophy size={18} className="text-primary-500"/>:<BookOpen size={18} className="text-primary-500"/>}
                </div>
                <div className="flex flex-wrap gap-1 ml-auto">
                  {plan.is_featured&&<span className="font-ui text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{color:'#d97706',background:'rgba(217,119,6,0.1)',border:'1px solid rgba(217,119,6,0.2)'}}><Star size={10}/> Featured</span>}
                  {done&&<span className="font-ui text-xs px-2 py-0.5 rounded-full" style={{color:'#16a34a',background:'rgba(22,163,74,0.1)',border:'1px solid rgba(22,163,74,0.2)'}}>✓ Done</span>}
                  {joined&&!done&&<span className="font-ui text-xs px-2 py-0.5 rounded-full" style={{color:'#d4900f',background:'rgba(212,144,15,0.1)',border:'1px solid rgba(212,144,15,0.2)'}}>Day {prog.current_day}/{plan.duration_days}</span>}
                </div>
              </div>
              <h3 className="font-display text-base font-semibold mb-1" style={{color:tc}}>{plan.title}</h3>
              <p className="font-body text-xs line-clamp-2 mb-3" style={{color:sc}}>{plan.description}</p>
              {plan.tag_list?.length>0&&(
                <div className="flex flex-wrap gap-1 mb-3">
                  {plan.tag_list.map(t=><span key={t} className="font-ui text-xs px-2 py-0.5 rounded-full" style={{background:dark?'#1a1a1a':'#f5f5f5',color:sc}}>#{t}</span>)}
                </div>
              )}
              <div className="flex items-center gap-3 font-ui text-xs mb-4" style={{color:sc}}>
                <span>{plan.duration_days} days</span><span>·</span><span>{plan.devotional_count} readings</span>
              </div>
              {joined&&!done&&(
                <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{background:dark?'#333':'#e5d9b6'}}>
                  <div className="h-full rounded-full" style={{background:'#d4900f',width:`${((prog.current_day-1)/plan.duration_days)*100}%`}}/>
                </div>
              )}
              {!joined
                ?<button onClick={()=>joinPlan.mutate(plan.id)} disabled={joinPlan.isPending} className="btn-primary w-full justify-center text-sm">
                    {joinPlan.isPending?<Loader2 size={13} className="animate-spin"/>:<Sun size={13}/>} Start Plan
                  </button>
                :<button onClick={()=>onSelectPlan(prog)} className="btn-secondary w-full justify-center text-sm">
                    {done?'Review Plan':'Continue Reading'}<ChevronRight size={13}/>
                  </button>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DevotionalPage() {
  const api=useApiClient(); const qc=useQueryClient()
  const {darkMode:dark}=useSettingsStore()
  const [activePlan,setActivePlan]=useState(null)
  const tc=dark?'#ffffff':'#1e1b4b'; const sc=dark?'#aaaaaa':'#6b7280'
  const cardBg=dark?'#111111':'#ffffff'; const cardBorder=dark?'#2a2a2a':'#e5d9b6'

  const {data:myProgress}=useQuery({queryKey:['my-progress'],queryFn:()=>api.get('/devotional/my-progress/').then(r=>r.data)})
  const {streak,longestStreak}=useStreak(myProgress)

  const joinPlan=useMutation({
    mutationFn:id=>api.post('/devotional/my-progress/',{plan:id}),
    onSuccess:res=>{qc.invalidateQueries({queryKey:['my-progress']});setActivePlan(res.data)},
  })

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold mb-1" style={{color:tc}}>Devotionals</h1>
        <p className="font-body text-sm" style={{color:sc}}>Daily reading plans to deepen your walk with God</p>
      </div>

      <StreakBadge streak={streak} longestStreak={longestStreak} dark={dark}/>

      {myProgress?.results?.length>0&&!activePlan&&(
        <div className="mb-5">
          <p className="font-ui text-xs uppercase tracking-wide mb-3" style={{color:sc}}>My Plans</p>
          <div className="space-y-2">
            {myProgress.results.map(prog=>(
              <button key={prog.id} onClick={()=>setActivePlan(prog)}
                className="w-full rounded-2xl border p-4 flex items-center gap-4 transition-colors text-left"
                style={{backgroundColor:cardBg,borderColor:cardBorder}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#d4900f'}
                onMouseLeave={e=>e.currentTarget.style.borderColor=cardBorder}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'rgba(212,144,15,0.1)'}}>
                  {prog.completed_at?<Trophy size={15} className="text-primary-500"/>:<Sun size={15} className="text-primary-500"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-sm font-medium truncate" style={{color:tc}}>{prog.plan_title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:dark?'#333':'#e5d9b6'}}>
                      <div className="h-full rounded-full" style={{background:'#d4900f',width:`${Math.min(((prog.current_day-1)/(prog.plan_duration_days||1))*100,100)}%`}}/>
                    </div>
                    <span className="font-ui text-xs flex-shrink-0" style={{color:sc}}>{prog.completed_at?'Done ✓':`Day ${prog.current_day}/${prog.plan_duration_days}`}</span>
                  </div>
                </div>
                <ChevronRight size={15} style={{color:sc}}/>
              </button>
            ))}
          </div>
          <hr className="my-5" style={{borderColor:cardBorder}}/>
        </div>
      )}

      {activePlan
        ?<ActivePlanView progress={activePlan} api={api} onBack={()=>setActivePlan(null)} dark={dark}/>
        :<BrowsePlans api={api} myProgress={myProgress} joinPlan={joinPlan} onSelectPlan={setActivePlan} dark={dark}/>
      }
    </div>
  )
}