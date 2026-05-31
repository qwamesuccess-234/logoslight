/**
 * src/hooks/useReadingHistory.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks recently opened Bible books/chapters in localStorage.
 * Offline-friendly — no backend needed.
 */
const STORAGE_KEY = 'logoslight_reading_history'
const MAX_HISTORY = 10

export function useReadingHistory() {
  function getHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  function addToHistory(book, chapter) {
    const history = getHistory()
    const entry = {
      book,
      chapter,
      openedAt: new Date().toISOString(),
    }
    // Remove duplicate if same book+chapter already exists
    const filtered = history.filter(
      h => !(h.book === book && h.chapter === chapter)
    )
    // Add to front, keep max 10
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}
    return updated
  }

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return { getHistory, addToHistory, clearHistory }
}