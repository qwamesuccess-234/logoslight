/**
 * src/pages/Dashboard.jsx
 * FIX: Verse of the day now fetches from API properly.
 * Shows hardcoded fallback ONLY if API is completely unavailable.
 * Dark mode cards use true black background.
 */
import { useQuery } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { BookOpen, FileText, Users, Bookmark, ArrowRight, Sun, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApiClient } from '@/hooks/useApiClient'
import { useSettingsStore } from '@/store/settingsStore'
import { useStreak } from '@/hooks/useStreak'
import clsx from 'clsx'

// ── Verse of the Day card ─────────────────────────────────────────────────────
function VerseCard({ api }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verse-of-day'],
    queryFn:  () => api.get('/bible/verse-of-the-day/').then(r => r.data),
    staleTime: 1000 * 60 * 60,   // 1 hour — verse doesn't change during day
    retry: 2,
  })

  return (
    <div className="rounded-2xl p-6 mb-6"
      style={{ background: 'linear-gradient(135deg, #0f0d2e 0%, #1e1b4b 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sun size={16} style={{ color: '#d4900f' }} />
        <span style={{
          fontFamily:    'DM Sans, sans-serif',
          fontSize:      '0.7rem',
          color:         '#d4900f',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          fontWeight:    600,
        }}>
          Verse of the Day
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" style={{ color: '#d4900f' }} />
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading verse...</span>
        </div>
      )}

      {/* API returned real text */}
      {!isLoading && data?.text && (
        <>
          <blockquote style={{
            fontFamily:  'Georgia, "Playfair Display", serif',
            fontStyle:   'italic',
            fontSize:    'clamp(1rem, 2.5vw, 1.2rem)',
            color:       '#fdf8ec',
            lineHeight:  1.75,
            marginBottom: '0.75rem',
            borderLeft:  'none',
            padding:     0,
          }}>
            "{data.text}"
          </blockquote>
          <span style={{
            display:       'inline-flex',
            alignItems:    'center',
            padding:       '0.25rem 0.75rem',
            background:    'rgba(212,144,15,0.15)',
            border:        '1px solid rgba(212,144,15,0.35)',
            borderRadius:  '9999px',
            fontFamily:    'monospace',
            fontSize:      '0.75rem',
            color:         '#d4900f',
          }}>
            {data.reference}
          </span>
        </>
      )}

      {/* API error or empty text — show hint */}
      {!isLoading && (!data?.text) && (
        <div>
          <blockquote style={{
            fontFamily:   'Georgia, serif',
            fontStyle:    'italic',
            fontSize:     '1rem',
            color:        '#fdf8ec',
            lineHeight:   1.75,
            marginBottom: '0.75rem',
            borderLeft:   'none',
            padding:      0,
          }}>
            "Your word is a lamp to my feet and a light to my path."
          </blockquote>
          <span style={{
            display:    'inline-flex',
            padding:    '0.25rem 0.75rem',
            background: 'rgba(212,144,15,0.15)',
            border:     '1px solid rgba(212,144,15,0.35)',
            borderRadius: '9999px',
            fontFamily: 'monospace',
            fontSize:   '0.75rem',
            color:      '#d4900f',
          }}>
            Psalm 119:105
          </span>
          {data?.error && (
            <p style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '0.5rem' }}>
              {data?.hint || 'Set BIBLE_API_BIBLE_ID in backend/.env to load live verses'}
            </p>
          )}
          {isError && (
            <p style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '0.5rem' }}>
              Could not reach the Bible API — check Django is running
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, to, color, darkMode }) {
  return (
    <Link to={to}
      className="rounded-2xl p-4 border hover:scale-[1.02] transition-transform block"
      style={{
        backgroundColor: darkMode ? '#111111' : '#ffffff',
        borderColor:     darkMode ? '#2a2a2a' : '#e5d9b6',
        boxShadow:       '0 1px 3px rgba(0,0,0,0.1)',
      }}>
      <Icon size={20} className={`${color} mb-2`} />
      <p className="text-2xl font-bold" style={{ color: darkMode ? '#ffffff' : '#1e1b4b' }}>
        {value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: darkMode ? '#aaaaaa' : '#6b7280' }}>
        {label}
      </p>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const api      = useApiClient()
  const { user } = useUser()
  const { darkMode } = useSettingsStore()

  const { data: bookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn:  () => api.get('/bible/bookmarks/').then(r => r.data),
  })

  const { data: notes } = useQuery({
    queryKey: ['notes'],
    queryFn:  () => api.get('/notes/').then(r => r.data),
  })

  const { data: plans } = useQuery({
    queryKey: ['my-progress'],
    queryFn:  () => api.get('/devotional/my-progress/').then(r => r.data),
  })

  const { streak, longestStreak } = useStreak(plans)
  const firstName = user?.firstName || user?.username || 'Friend'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const textColor = darkMode ? '#ffffff' : '#1e1b4b'
  const subColor  = darkMode ? '#aaaaaa' : '#6b7280'

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">

      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-1"
          style={{ fontFamily: 'Georgia, serif', color: textColor }}>
          {greeting}, {firstName} ✦
        </h1>
        <p className="text-sm" style={{ color: subColor }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border p-4 mb-4"
          style={{backgroundColor:darkMode?'#111111':'#fff7ed',borderColor:darkMode?'#3d2800':'#fed7aa'}}>
          <span className="text-2xl">{streak >= 7 ? '🏆' : '🔥'}</span>
          <div>
            <p className="font-display text-xl font-bold leading-none" style={{color:'#ea580c'}}>{streak} day streak</p>
            <p className="font-ui text-xs" style={{color:darkMode?'#aaa':'#6b7280'}}>Best: {longestStreak} days — keep reading daily!</p>
          </div>
        </div>
      )}
      {/* Verse of the Day */}
      <VerseCard api={api} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Bookmarks"     value={bookmarks?.count ?? '—'} icon={Bookmark} to="/bible"      color="text-blue-500"   darkMode={darkMode} />
        <StatCard label="My Notes"      value={notes?.count     ?? '—'} icon={FileText} to="/notes"      color="text-green-500"  darkMode={darkMode} />
        <StatCard label="Reading Plans" value={plans?.count     ?? '—'} icon={BookOpen} to="/devotional" color="text-yellow-500" darkMode={darkMode} />
        <StatCard label="Community"     value="Join"                    icon={Users}    to="/community"  color="text-purple-500" darkMode={darkMode} />
      </div>

      {/* Active reading plans */}
      {plans?.results?.filter(p => !p.completed_at).length > 0 && (
        <div className="rounded-2xl border p-5 mb-6"
          style={{
            backgroundColor: darkMode ? '#111111' : '#ffffff',
            borderColor:     darkMode ? '#2a2a2a' : '#e5d9b6',
          }}>
          <h2 className="text-lg font-semibold mb-4"
            style={{ fontFamily: 'Georgia, serif', color: textColor }}>
            Continue Reading
          </h2>
          <div className="space-y-2">
            {plans.results.filter(p => !p.completed_at).slice(0, 3).map(prog => (
              <Link key={prog.id} to="/devotional"
                className="flex items-center gap-4 p-3 rounded-xl transition-colors group"
                style={{ ':hover': { backgroundColor: darkMode ? '#1a1a1a' : '#fdf5e4' } }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(212,144,15,0.15)' }}>
                  <Sun size={16} style={{ color: '#d4900f' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: textColor }}>
                    {prog.plan_title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: darkMode ? '#333' : '#e5d9b6' }}>
                      <div className="h-full rounded-full" style={{
                        backgroundColor: '#d4900f',
                        width: `${Math.min(((prog.current_day - 1) / (prog.plan_duration_days || 1)) * 100, 100)}%`
                      }} />
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: subColor }}>
                      Day {prog.current_day}/{prog.plan_duration_days}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: subColor }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="rounded-2xl border p-5"
        style={{
          backgroundColor: darkMode ? '#111111' : '#ffffff',
          borderColor:     darkMode ? '#2a2a2a' : '#e5d9b6',
        }}>
        <h2 className="text-lg font-semibold mb-4"
          style={{ fontFamily: 'Georgia, serif', color: textColor }}>
          Quick Access
        </h2>
        <div className="space-y-2">
          {[
            { label: 'Read Scripture',     desc: 'Browse books, chapters, and search verses', to: '/bible'      },
            { label: "Today's Devotional", desc: 'Continue your reading plan',                to: '/devotional' },
            { label: 'New Study Note',     desc: 'Journal your reflections',                  to: '/notes'      },
            { label: 'Community',          desc: 'Discuss the Word with others',              to: '/community'  },
          ].map(({ label, desc, to }) => (
            <Link key={to} to={to}
              className="flex items-center justify-between p-3 rounded-xl transition-colors group"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = darkMode ? '#1a1a1a' : '#fdf5e4'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>{label}</p>
                <p className="text-xs" style={{ color: subColor }}>{desc}</p>
              </div>
              <ArrowRight size={16} style={{ color: subColor }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}