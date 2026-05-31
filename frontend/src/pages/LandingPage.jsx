/**
 * src/pages/LandingPage.jsx
 * Beautiful landing page for unauthenticated visitors
 */
import { Link } from 'react-router-dom'
import { BookOpen, Sun, Users, FileText, ArrowRight, Star } from 'lucide-react'
import { SignedIn, SignedOut } from '@clerk/clerk-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-secondary-950 text-parchment-100 overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header className="relative">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#d4900f20_0%,_transparent_60%)]" />

        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary-400" />
            <span className="font-display font-bold text-xl text-parchment-50">LogosLight</span>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link to="/sign-in" className="btn-ghost text-parchment-300">Sign in</Link>
              <Link to="/sign-up" className="btn-primary">Get started</Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="btn-primary">Go to Dashboard <ArrowRight size={16} /></Link>
            </SignedIn>
          </div>
        </nav>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-500/10 border border-primary-500/30 rounded-full mb-8">
            <Star size={14} className="text-primary-400" />
            <span className="font-ui text-xs text-primary-300 uppercase tracking-wider">
              Know God More Deeply
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-parchment-50 leading-tight mb-6">
            Light for the{' '}
            <span className="text-primary-400 italic">Word</span>
          </h1>

          <p className="font-body text-lg md:text-xl text-parchment-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Read scripture, journal your insights, follow daily devotionals,
            and grow together with a community seeking God.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/sign-up" className="btn-primary text-base px-8 py-3">
              Begin your journey
              <ArrowRight size={18} />
            </Link>
            <Link to="/sign-in" className="btn-ghost text-parchment-300 text-base">
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: BookOpen, title: 'Scripture Reader', desc: 'Search and read the Bible with multiple translations side by side.' },
            { icon: Sun, title: 'Daily Devotionals', desc: 'Structured reading plans to guide your daily time with God.' },
            { icon: FileText, title: 'Study Notes', desc: 'Journal your reflections tied to specific verses and chapters.' },
            { icon: Users, title: 'Community', desc: 'Discuss scripture, share insights, and grow together.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-secondary-900 border border-secondary-800 rounded-2xl p-6 hover:border-primary-700/50 transition-colors">
              <div className="w-10 h-10 bg-primary-500/15 rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} className="text-primary-400" />
              </div>
              <h3 className="font-display font-semibold text-parchment-100 mb-2">{title}</h3>
              <p className="font-body text-sm text-parchment-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}