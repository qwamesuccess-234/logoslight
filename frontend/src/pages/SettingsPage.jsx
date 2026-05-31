/**
 * src/pages/SettingsPage.jsx
 * FIX: Dark mode preview shows true black, toggle is visible in both modes
 */
import { useSettingsStore } from '@/store/settingsStore'
import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'

const FONT_SIZES = [
  { id: 'sm',   label: 'Small',       cls: 'text-sm'  },
  { id: 'base', label: 'Medium',      cls: 'text-base'},
  { id: 'lg',   label: 'Large',       cls: 'text-lg'  },
  { id: 'xl',   label: 'Extra Large', cls: 'text-xl'  },
]

const FONT_STYLES = [
  { id: 'serif',    label: 'Serif',              desc: 'Classic — great for long reading',        cls: 'font-serif'  },
  { id: 'sans',     label: 'Sans-Serif',         desc: 'Clean and modern',                        cls: 'font-sans'   },
  { id: 'dyslexic', label: 'Dyslexia-Friendly',  desc: 'Wider spacing — easier to read',          cls: 'font-sans tracking-wide' },
]

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 mb-5">
      <h2 className="text-base font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { darkMode, fontSize, fontStyle, toggleDarkMode, setFontSize, setFontStyle } =
    useSettingsStore()

  return (
    /* Page always renders on dark background for consistency */
    <div className="max-w-2xl mx-auto" style={{ color: '#fff' }}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>
          Settings
        </h1>
        <p className="text-gray-400 text-sm">Customise your reading experience</p>
      </div>

      {/* ── Dark / Light Mode ──────────────────────────────────────────── */}
      <Section title="Appearance">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {darkMode
              ? <Moon size={15} className="text-yellow-400" />
              : <Sun  size={15} className="text-yellow-500" />
            }
            <div>
              <p className="text-sm font-medium text-white">
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </p>
              <p className="text-xs text-gray-400">
                {darkMode ? 'Black background, white text' : 'Light parchment background'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={toggleDarkMode}
            className={clsx(
              'relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 p-1',
              darkMode ? 'bg-yellow-500' : 'bg-gray-500'
            )}
            aria-label="Toggle dark mode"
          >
            <span className={clsx(
              'block w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300',
              darkMode ? 'translate-x-7' : 'translate-x-0'
            )} />

          </button>
        </div>

        {/* Preview box */}
        <div
          className="rounded-xl p-4 border transition-all"
          style={{
            backgroundColor: darkMode ? '#000000' : '#fdf8ec',
            borderColor:     darkMode ? '#333333' : '#e5d9b6',
          }}
        >
          <p style={{
            fontFamily:  'Georgia, serif',
            fontStyle:   'italic',
            fontSize:    '0.95rem',
            color:       darkMode ? '#ffffff' : '#1e1b4b',
            lineHeight:  1.7,
            marginBottom: '0.5rem',
          }}>
            "Your word is a lamp to my feet and a light to my path."
          </p>
          <p style={{
            fontFamily:    'monospace',
            fontSize:      '0.75rem',
            color:         darkMode ? '#d4900f' : '#9a6700',
            letterSpacing: '0.05em',
          }}>
            Psalm 119:105
          </p>
        </div>
      </Section>

      {/* ── Font Size ─────────────────────────────────────────────────── */}
      <Section title="Font Size">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {FONT_SIZES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={clsx(
                'p-3 rounded-xl border-2 text-center transition-all',
                fontSize === f.id
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-gray-600 hover:border-gray-400'
              )}
            >
              <p className={clsx('font-bold text-white leading-none mb-1', f.cls)}>Aa</p>
              <p className="text-gray-400 text-xs mt-1">{f.label}</p>
            </button>
          ))}
        </div>

        {/* Live preview */}
        <div className="rounded-xl p-4 bg-black border border-gray-700">
          <p className={clsx('text-white leading-relaxed', {
            'text-sm':  fontSize === 'sm',
            'text-base': fontSize === 'base',
            'text-lg':  fontSize === 'lg',
            'text-xl':  fontSize === 'xl',
          })
          }>
            "For God so loved the world that He gave His one and only Son,
            that whoever believes in Him shall not perish but have eternal life."
          </p>
          <p className="text-yellow-500 text-xs font-mono mt-2">John 3:16</p>
        </div>
      </Section>

      {/* ── Font Style ────────────────────────────────────────────────── */}
      <Section title="Font Style">
        <div className="space-y-2">
          {FONT_STYLES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontStyle(f.id)}
              className={clsx(
                'w-full p-4 rounded-xl border-2 text-left transition-all',
                fontStyle === f.id
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-gray-600 hover:border-gray-400'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={clsx('text-gray-300 text-xs mb-1 italic', f.cls)}>
                    "In the beginning God created the heavens and the earth."
                  </p>
                  <p className="text-white text-sm font-medium">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
                {fontStyle === f.id && (
                  <span className="w-5 h-5 bg-yellow-500 rounded-full flex items-center
                                   justify-center text-black text-xs font-bold flex-shrink-0 ml-3">
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── About ─────────────────────────────────────────────────────── */}
      <Section title="About LogosLight">
        <div className="space-y-3">
          {[
            ['Version',           '1.0.0'],
            ['Bible Translation', 'King James Version (KJV)'],
            ['Bible API',         'scripture.api.bible'],
            ['Auth',              'Clerk'],
            ['Database',          'Supabase PostgreSQL'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
          <hr className="border-gray-700" />
          <p className="text-gray-500 text-xs italic text-center leading-relaxed">
            "This is also what you can do for the Lord — so let it be from the heart,
            to appreciate the Almighty. He is Great in all the earth."
          </p>
        </div>
      </Section>
    </div>
  )
}