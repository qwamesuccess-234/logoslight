/**
 * appStateStore.js
 * Persists last visited page state across sessions.
 * - Bible: last book + chapter
 * - Scripture search: last query + results
 * - Community: last selected community + channel
 */
import { create } from 'zustand'

const KEY = 'logoslight_app_state'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

const saved = load()

export const useAppStateStore = create((set, get) => ({
  // Bible Reader
  lastBook:    saved.lastBook    || null,
  lastChapter: saved.lastChapter || null,

  // Scripture Search — persists query + results until user clears
  lastSearchQuery:   saved.lastSearchQuery   || '',
  lastSearchOffset:  saved.lastSearchOffset  || 0,

  // Community
  lastCommunityId: saved.lastCommunityId || null,
  lastChannelId:   saved.lastChannelId   || null,

  // Actions
  setLastBook: (book, chapter) => {
    set({ lastBook: book, lastChapter: chapter })
    save({ ...get(), lastBook: book, lastChapter: chapter })
  },

  setLastSearch: (query, offset = 0) => {
    set({ lastSearchQuery: query, lastSearchOffset: offset })
    save({ ...get(), lastSearchQuery: query, lastSearchOffset: offset })
  },

  clearLastSearch: () => {
    set({ lastSearchQuery: '', lastSearchOffset: 0 })
    save({ ...get(), lastSearchQuery: '', lastSearchOffset: 0 })
  },

  setLastCommunity: (communityId, channelId) => {
    set({ lastCommunityId: communityId, lastChannelId: channelId })
    save({ ...get(), lastCommunityId: communityId, lastChannelId: channelId })
  },
}))