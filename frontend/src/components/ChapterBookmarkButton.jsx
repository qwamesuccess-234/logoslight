/**
 * ChapterBookmarkButton.jsx
 * One-tap button to bookmark an entire chapter.
 * Drop this inside the chapter header in BiblePage.
 *
 * Usage:
 *   import ChapterBookmarkButton from '@/components/ChapterBookmarkButton'
 *   <ChapterBookmarkButton api={api} book={book.name} chapter={chapter} />
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'

export default function ChapterBookmarkButton({ api, book, chapter, dark }) {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const add = useMutation({
    mutationFn: () => api.post('/bible/bookmarks/', {
      book,
      chapter,
      verse: 1,
      note: `${book} chapter ${chapter}`,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] })
      setSaved(true)
      // Reset after 3 seconds so user can see the feedback
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <button
      onClick={() => !saved && add.mutate()}
      disabled={add.isPending}
      title={saved ? 'Chapter bookmarked!' : `Bookmark ${book} ${chapter}`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-ui text-xs font-medium transition-all"
      style={{
        backgroundColor: saved
          ? 'rgba(212,144,15,0.15)'
          : dark ? '#1a1a1a' : '#f5f5f5',
        color: saved
          ? '#d4900f'
          : dark ? '#aaaaaa' : '#6b7280',
        border: `1px solid ${saved ? 'rgba(212,144,15,0.3)' : dark ? '#333' : '#e5d9b6'}`,
      }}
    >
      {add.isPending
        ? <Loader2 size={13} className="animate-spin" />
        : saved
          ? <BookmarkCheck size={13} />
          : <Bookmark size={13} />
      }
      {saved ? 'Saved!' : 'Bookmark Chapter'}
    </button>
  )
}