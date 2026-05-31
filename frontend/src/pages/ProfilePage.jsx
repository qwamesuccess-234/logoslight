/**
 * ProfilePage.jsx — dark mode aware
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser, UserButton } from '@clerk/clerk-react'
import { Save, Edit2, BookOpen, FileText, Bookmark, X } from 'lucide-react'
import { useApiClient } from '@/hooks/useApiClient'
import { useSettingsStore } from '@/store/settingsStore'

export default function ProfilePage() {
  const api=useApiClient(); const qc=useQueryClient()
  const {user:cu}=useUser()
  const {darkMode}=useSettingsStore()
  const dark=darkMode
  const tc=dark?'#ffffff':'#1e1b4b'; const sc=dark?'#aaaaaa':'#6b7280'
  const cardBg=dark?'#111111':'#ffffff'; const cardBorder=dark?'#2a2a2a':'#e5d9b6'
  const [editing,setEditing]=useState(false)
  const [form,setForm]=useState({username:'',bio:''})

  const {data:profile,isLoading}=useQuery({
    queryKey:['my-profile'],
    queryFn:()=>api.get('/auth/users/me/').then(r=>r.data),
  })

  const {data:stats}=useQuery({
    queryKey:['profile-stats'],
    queryFn:async()=>{
      const [n,b,p]=await Promise.all([
        api.get('/notes/').then(r=>r.data.count??0),
        api.get('/bible/bookmarks/').then(r=>r.data.count??0),
        api.get('/devotional/my-progress/').then(r=>r.data.count??0),
      ])
      return{notes:n,bookmarks:b,plans:p}
    },
  })

  const update=useMutation({
    mutationFn:d=>api.patch('/auth/users/me/',d),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['my-profile']});setEditing(false)},
  })

  if(isLoading)return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-parchment-300 border-t-primary-500 rounded-full animate-spin"/></div>

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="font-display text-3xl font-bold mb-6" style={{color:tc}}>My Profile</h1>

      <div className="rounded-2xl border p-6 mb-6" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
        <div className="flex items-start gap-5 mb-5">
          <div className="flex-shrink-0"><UserButton afterSignOutUrl="/"/></div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-bold truncate" style={{color:tc}}>{cu?.fullName||profile?.username||'Anonymous'}</h2>
            <p className="font-ui text-sm truncate" style={{color:sc}}>{profile?.email}</p>
            <p className="font-ui text-xs mt-1" style={{color:sc}}>
              Member since {profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'—'}
            </p>
          </div>
          {!editing
            ?<button onClick={()=>{setForm({username:profile?.username||'',bio:profile?.bio||''});setEditing(true)}} className="btn-secondary flex-shrink-0"><Edit2 size={14}/> Edit</button>
            :<button onClick={()=>setEditing(false)} className="btn-ghost flex-shrink-0 p-2"><X size={16}/></button>
          }
        </div>

        {!editing&&(
          <div style={{borderTop:`1px solid ${cardBorder}`,paddingTop:'1rem'}}>
            {profile?.bio
              ?<p className="font-body leading-relaxed" style={{color:dark?'#e0e0e0':'#374151'}}>{profile.bio}</p>
              :<p className="font-body text-sm italic" style={{color:sc}}>No bio yet — click Edit to add one.</p>
            }
          </div>
        )}

        {editing&&(
          <div style={{borderTop:`1px solid ${cardBorder}`,paddingTop:'1rem'}} className="space-y-4">
            <div>
              <label className="font-ui text-xs font-medium mb-1 block" style={{color:sc}}>Username</label>
              <input className="input w-full" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
            </div>
            <div>
              <label className="font-ui text-xs font-medium mb-1 block" style={{color:sc}}>Bio</label>
              <textarea className="input w-full resize-y min-h-[80px]" placeholder="Share your faith journey…" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setEditing(false)} className="btn-secondary">Cancel</button>
              <button onClick={()=>update.mutate(form)} disabled={update.isPending} className="btn-primary disabled:opacity-50">
                <Save size={14}/> {update.isPending?'Saving…':'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {label:'Study Notes',value:stats?.notes??'—',icon:FileText},
          {label:'Bookmarks',value:stats?.bookmarks??'—',icon:Bookmark},
          {label:'Reading Plans',value:stats?.plans??'—',icon:BookOpen},
        ].map(({label,value,icon:Icon})=>(
          <div key={label} className="rounded-2xl border p-4 text-center" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
            <Icon size={20} className="text-primary-500 mx-auto mb-2"/>
            <p className="font-display text-2xl font-bold" style={{color:tc}}>{value}</p>
            <p className="font-ui text-xs mt-0.5" style={{color:sc}}>{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{backgroundColor:dark?'#111111':'#fdf5e4',borderColor:cardBorder}}>
        <p className="font-ui text-xs text-center leading-relaxed" style={{color:sc}}>
          To change your <strong style={{color:tc}}>email</strong>, <strong style={{color:tc}}>password</strong>, or connected accounts — click your avatar above.
        </p>
      </div>
    </div>
  )
}