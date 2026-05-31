/**
 * App.jsx — with settings + dark mode + app state restoration
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSettingsStore } from '@/store/settingsStore'

import AppLayout       from '@/components/layout/AppLayout'
import ProtectedRoute  from '@/components/layout/ProtectedRoute'
import LandingPage     from '@/pages/LandingPage'
import SignInPage      from '@/pages/SignInPage'
import SignUpPage      from '@/pages/SignUpPage'
import Dashboard       from '@/pages/Dashboard'
import BiblePage       from '@/pages/BiblePage'
import DevotionalPage  from '@/pages/DevotionalPage'
import NotesPage       from '@/pages/NotesPage'
import CommunityPage   from '@/pages/CommunityPage'
import ProfilePage     from '@/pages/ProfilePage'
import SettingsPage    from '@/pages/SettingsPage'

export default function App() {
  const { applyAll } = useSettingsStore()

  useEffect(() => { applyAll() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/bible"      element={<BiblePage />} />
            <Route path="/devotional" element={<DevotionalPage />} />
            <Route path="/notes"      element={<NotesPage />} />
            <Route path="/community"  element={<CommunityPage />} />
            <Route path="/profile"    element={<ProfilePage />} />
            <Route path="/settings"   element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}