/**
 * src/store/settingsStore.js
 * FIX: Dark mode now applies TRUE black (#000000) not secondary-950 (dark blue)
 */
import { create } from 'zustand'

const KEY = 'logoslight_settings'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      darkMode: state.darkMode,
      fontSize: state.fontSize,
      fontStyle: state.fontStyle,
    }))
  } catch {}
}

function applyDark(dark) {
  const html = document.documentElement
  if (dark) {
    html.classList.add('dark')
    // Force true black — override Tailwind secondary-950 blue
    document.body.style.backgroundColor = '#000000'
    document.body.style.color = '#ffffff'
  } else {
    html.classList.remove('dark')
    document.body.style.backgroundColor = ''
    document.body.style.color = ''
  }
}

const defaults = { darkMode: false, fontSize: 'base', fontStyle: 'serif' }
const saved    = load()

export const useSettingsStore = create((set, get) => ({
  ...defaults,
  ...saved,

  toggleDarkMode: () => {
    const next = !get().darkMode
    set({ darkMode: next })
    applyDark(next)
    save({ ...get(), darkMode: next })
  },

  setFontSize: (size) => {
    set({ fontSize: size })
    document.documentElement.setAttribute('data-font-size', size)
    save({ ...get(), fontSize: size })
  },

  setFontStyle: (style) => {
    set({ fontStyle: style })
    document.documentElement.setAttribute('data-font-style', style)
    save({ ...get(), fontStyle: style })
  },

  // Call once on app mount to restore saved settings
  applyAll: () => {
    const { darkMode, fontSize, fontStyle } = get()
    applyDark(darkMode)
    document.documentElement.setAttribute('data-font-size', fontSize)
    document.documentElement.setAttribute('data-font-style', fontStyle)
  },
}))