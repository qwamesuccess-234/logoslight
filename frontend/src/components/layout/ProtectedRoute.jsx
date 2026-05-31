import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return (
    <div className="min-h-screen bg-secondary-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-700 border-t-primary-500 rounded-full animate-spin"/>
    </div>
  )
  if (!isSignedIn) return <Navigate to="/sign-in" replace />
  return <Outlet />
}