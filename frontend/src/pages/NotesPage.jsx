/**
 * NotesPage.jsx — dark mode aware
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react'
import { useApiClient } from '@/hooks/useApiClient'
import { useSettingsStore } from '@/store/settingsStore'

export default function NotesPage() {
  const api=useApiClient(); const qc=useQueryClient()
  const {darkMode}=useSettingsStore()
  const dark=darkMode
  const tc=dark?'#ffffff':'#1e1b4b'; const sc=dark?'#aaaaaa':'#6b7280'
  const cardBg=dark?'#111111':'#ffffff'; const cardBorder=dark?'#2a2a2a':'#e5d9b6'
  const inputStyle={backgroundColor:dark?'#1a1a1a':'undefined',color:tc,borderColor:dark?'#333':'undefined'}

  const [editing,setEditing]=useState(null)
  const [creating,setCreating]=useState(false)
  const [form,setForm]=useState({title:'',content:'',book:'',tags:''})

  const {data:notes,isLoading}=useQuery({queryKey:['notes'],queryFn:()=>api.get('/notes/').then(r=>r.data)})

  const create=useMutation({
    mutationFn:d=>api.post('/notes/',d),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['notes']});setCreating(false);setForm({title:'',content:'',book:'',tags:''})},
  })
  const update=useMutation({
    mutationFn:({id,...d})=>api.patch(`/notes/${id}/`,d),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['notes']});setEditing(null)},
  })
  const del=useMutation({
    mutationFn:id=>api.delete(`/notes/${id}/`),
    onSuccess:()=>qc.invalidateQueries({queryKey:['notes']}),
  })

  const NoteForm=({onSave,onCancel,initial={}})=>{
    const [f,setF]=useState({title:'',content:'',book:'',tags:'',...initial})
    return (
      <div className="rounded-2xl border p-5 space-y-3" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
        <input className="input w-full" placeholder="Note title" value={f.title} onChange={e=>setF({...f,title:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
        <textarea className="input w-full min-h-[140px] resize-y" placeholder="Write your reflection…" value={f.content} onChange={e=>setF({...f,content:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Bible book (e.g. John)" value={f.book} onChange={e=>setF({...f,book:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
          <input className="input flex-1" placeholder="Tags (comma-separated)" value={f.tags} onChange={e=>setF({...f,tags:e.target.value})} style={dark?{backgroundColor:'#1a1a1a',color:tc,borderColor:'#333'}:{}}/>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary"><X size={14}/> Cancel</button>
          <button onClick={()=>onSave(f)} className="btn-primary"><Save size={14}/> Save</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1" style={{color:tc}}>Study Notes</h1>
          <p className="font-body text-sm" style={{color:sc}}>Your personal scripture journal</p>
        </div>
        <button onClick={()=>setCreating(true)} className="btn-primary"><Plus size={16}/> New Note</button>
      </div>

      {creating&&<div className="mb-6"><NoteForm onSave={d=>create.mutate(d)} onCancel={()=>setCreating(false)}/></div>}

      {isLoading&&<div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-500"/></div>}

      <div className="space-y-4">
        {notes?.results?.map(note=>(
          <div key={note.id}>
            {editing===note.id
              ? <NoteForm initial={note} onSave={d=>update.mutate({id:note.id,...d})} onCancel={()=>setEditing(null)}/>
              : (
                <div className="rounded-2xl border p-5" style={{backgroundColor:cardBg,borderColor:cardBorder}}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-semibold" style={{color:tc}}>{note.title}</h3>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {note.book&&<span className="scripture-badge">{note.book}</span>}
                        {note.tags&&<span className="font-ui text-xs" style={{color:sc}}>{note.tags}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>setEditing(note.id)} className="p-1.5 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors"><Edit2 size={14} style={{color:sc}}/></button>
                      <button onClick={()=>del.mutate(note.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 size={14} className="text-red-400"/></button>
                    </div>
                  </div>
                  <p className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{color:dark?'#e0e0e0':'#374151'}}>{note.content}</p>
                  <p className="font-ui text-xs mt-3" style={{color:sc}}>{new Date(note.updated_at).toLocaleDateString()}</p>
                </div>
              )
            }
          </div>
        ))}
      </div>

      {notes?.results?.length===0&&!isLoading&&!creating&&(
        <div className="text-center py-16">
          <FileText size={40} className="text-parchment-300 mx-auto mb-4"/>
          <h3 className="font-display text-xl font-semibold mb-2" style={{color:tc}}>No notes yet</h3>
          <p className="font-body text-sm mb-6" style={{color:sc}}>Start journaling your Bible reflections.</p>
          <button onClick={()=>setCreating(true)} className="btn-primary"><Plus size={16}/> Write your first note</button>
        </div>
      )}
    </div>
  )
}