/**
 * useStreak.js
 * Calculates consecutive reading days from UserPlanProgress.
 * Stored in localStorage — offline-friendly.
 */
import { useEffect, useState } from 'react'

const KEY = 'logoslight_streak'

export function useStreak(myProgress) {
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [lastReadDate, setLastReadDate] = useState(null)

  useEffect(() => {
    if (!myProgress?.results?.length) return

    // Load saved streak data
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    // Check if any plan was progressed today
    const hasProgressToday = myProgress.results.some(p => {
      if (!p.started_at) return false
      const updated = new Date(p.started_at).toDateString()
      return updated === today
    })

    let currentStreak = saved.currentStreak || 0
    let longest = saved.longestStreak || 0

    if (hasProgressToday) {
      if (saved.lastReadDate === yesterday) {
        // Consecutive day
        currentStreak = (saved.currentStreak || 0) + 1
      } else if (saved.lastReadDate !== today) {
        // New streak started
        currentStreak = 1
      }
      longest = Math.max(longest, currentStreak)
      const updated = { currentStreak, longestStreak: longest, lastReadDate: today }
      localStorage.setItem(KEY, JSON.stringify(updated))
      setStreak(currentStreak)
      setLongestStreak(longest)
      setLastReadDate(today)
    } else {
      // Check if streak is broken (missed yesterday)
      if (saved.lastReadDate && saved.lastReadDate !== today && saved.lastReadDate !== yesterday) {
        const reset = { currentStreak: 0, longestStreak: longest, lastReadDate: saved.lastReadDate }
        localStorage.setItem(KEY, JSON.stringify(reset))
        setStreak(0)
      } else {
        setStreak(saved.currentStreak || 0)
      }
      setLongestStreak(saved.longestStreak || 0)
      setLastReadDate(saved.lastReadDate)
    }
  }, [myProgress])

  return { streak, longestStreak, lastReadDate }
}