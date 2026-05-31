/**
 * src/components/layout/OfflineBanner.jsx
 * Shows a banner at the top when the user is offline.
 * Auto-hides when connection is restored.
 */
import { useOffline } from '@/hooks/useOffline'
import { WifiOff, Wifi } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

export default function OfflineBanner() {
  const { isOffline } = useOffline()
  const [showRestored, setShowRestored] = useState(false)
  const [prevOffline, setPrevOffline] = useState(false)

  // Show "Back online" message briefly when connection is restored
  useEffect(() => {
    if (prevOffline && !isOffline) {
      setShowRestored(true)
      const t = setTimeout(() => setShowRestored(false), 3000)
      return () => clearTimeout(t)
    }
    setPrevOffline(isOffline)
  }, [isOffline])

  if (!isOffline && !showRestored) return null

  return (
    <div className={clsx(
      'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2',
      'py-2 px-4 font-ui text-sm font-medium transition-all',
      isOffline
        ? 'bg-red-600 text-white'
        : 'bg-green-600 text-white'
    )}>
      {isOffline ? (
        <>
          <WifiOff size={15} />
          You are offline — showing cached content
        </>
      ) : (
        <>
          <Wifi size={15} />
          Back online ✓
        </>
      )}
    </div>
  )
}