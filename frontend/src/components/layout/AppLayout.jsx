/**
 * src/components/layout/AppLayout.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * FIX: Sidebar layout issue
 *   - Mobile (<lg):  sidebar is a FIXED overlay (slides in from left)
 *   - Desktop (lg+): sidebar is STATIC — takes physical space, pushes content right
 *
 * The bug was using `fixed` positioning on desktop which caused the sidebar
 * to float over the content instead of beside it.
 *
 * Layout structure:
 *   <div class="flex">               ← flex row
 *     <aside class="lg:static">      ← takes space on desktop
 *     <div class="flex-1">           ← content fills remaining width
 */
import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import {
  BookOpen, Home, Users, FileText,
  Sun, Menu, Settings, X
} from 'lucide-react'
import clsx from 'clsx'
import { useSettingsStore } from '@/store/settingsStore'

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: Home     },
  { to: '/bible',      label: 'Scripture',   icon: BookOpen },
  { to: '/devotional', label: 'Devotionals', icon: Sun      },
  { to: '/notes',      label: 'My Notes',    icon: FileText },
  { to: '/community',  label: 'Community',   icon: Users    },
]

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useUser()
  const { darkMode } = useSettingsStore()

  const navLinkClass = ({ isActive }) => clsx(
    'flex items-center gap-3 px-3 py-2.5 rounded-xl',
    'font-ui text-sm transition-all duration-150',
    isActive
      ? 'bg-primary-500/20 text-primary-300 font-medium'
      : 'text-parchment-300 hover:bg-white/10 hover:text-parchment-100'
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-parchment-50 leading-none">
              LogosLight
            </h1>
            <p className="font-ui text-xs text-parchment-400 mt-0.5">Know God Deeply</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            className={navLinkClass}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-2 border-t border-white/10 pt-3">
        <NavLink to="/settings" onClick={() => setMobileOpen(false)}
          className={navLinkClass}>
          <Settings size={18} />
          Settings
        </NavLink>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="flex-1 min-w-0">
            <p className="font-ui text-sm font-medium text-parchment-100 truncate">
              {user?.fullName || user?.username}
            </p>
            <p className="font-ui text-xs text-parchment-400 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    /* Root: full height flex row */
    <div className={clsx(
      'min-h-screen flex',
      darkMode ? 'bg-black' : 'bg-parchment-100'
    )}>

      {/* ── MOBILE: Fixed overlay sidebar ─────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar panel */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 z-50 bg-gray-950',
        'transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:hidden'   /* hidden on desktop — desktop uses the static version below */
      )}>
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-parchment-400
                     hover:text-parchment-100 hover:bg-white/10"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── DESKTOP: Static sidebar (pushes content) ──────────────────── */}
      <aside className={clsx(
        'hidden lg:flex lg:flex-col',   /* only shows on lg+ */
        'w-64 flex-shrink-0',           /* fixed width, never shrinks */
        'bg-gray-950',                  /* always dark sidebar */
        'min-h-screen sticky top-0',    /* stays on screen while scrolling */
      )}>
        <SidebarContent />
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Mobile topbar */}
        <header className={clsx(
          'lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30',
          'bg-gray-950 text-parchment-100'
        )}>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-primary-400">LogosLight</span>
          <UserButton afterSignOutUrl="/" />
        </header>

        {/* Page content */}
        <main className={clsx(
          'flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8',
          darkMode ? 'bg-black text-white' : 'bg-parchment-100'
        )}>
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30
                        bg-gray-950 border-t border-white/10 flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx(
                'flex-1 flex flex-col items-center gap-1 py-2',
                'font-ui text-xs transition-colors',
                isActive ? 'text-primary-400' : 'text-parchment-500 hover:text-parchment-200'
              )}>
              <Icon size={20} />
             <span className="text-[10px]">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
