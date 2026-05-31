/**
 * EmojiPicker.jsx
 * Wrapper around @emoji-mart/react.
 * Install: npm install @emoji-mart/react @emoji-mart/data
 *
 * Usage:
 *   import EmojiPicker from '@/components/EmojiPicker'
 *   <EmojiPicker onSelect={(emoji) => setInput(i => i + emoji)} onClose={() => setOpen(false)} dark={darkMode}/>
 */
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

export default function EmojiPicker({ onSelect, onClose, dark = true, position = 'bottom' }) {
  return (
    <div
      className={`absolute z-50 shadow-2xl ${position === 'top' ? 'bottom-10' : 'top-10'} left-0`}
      // Close on outside click
      onMouseLeave={() => {}}
    >
      {/* Invisible backdrop to close picker */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div className="relative z-50">
        <Picker
          data={data}
          onEmojiSelect={(e) => { onSelect(e.native); onClose() }}
          theme={dark ? 'dark' : 'light'}
          previewPosition="none"
          skinTonePosition="none"
          maxFrequentRows={2}
          perLine={8}
          emojiSize={22}
          emojiButtonSize={32}
          searchPosition="top"
        />
      </div>
    </div>
  )
}