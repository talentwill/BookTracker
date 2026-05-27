import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import type { Author, Book, TocItem, ReadingRound, ChapterStatus } from "./types"
import { parseOutline } from "./outline-parser"

function getDepth(items: TocItem[], id: string): number {
  const map = new Map(items.map(i => [i.id, i]))
  let depth = 0
  let current = map.get(id)
  while (current?.parentId) {
    depth++
    current = map.get(current.parentId)
  }
  return depth
}

interface BookStore {
  authors: Author[]
  books: Book[]
  tocItems: TocItem[]
  rounds: ReadingRound[]
  chapterStatuses: ChapterStatus[]

  addBook: (title: string, authorName: string, tocText: string, meta?: { publisher?: string; publishDate?: string; isbn?: string; coverUrl?: string }) => string
  deleteBook: (bookId: string) => void
  toggleChapter: (tocItemId: string, roundId: string) => void
  scheduleChapter: (tocItemId: string, roundId: string, date: string | null) => void
  markDone: (tocItemId: string, roundId: string) => void
  startNewRound: (bookId: string, inheritSchedule: boolean) => string
  updateAuthor: (authorId: string, updates: { name?: string; note?: string }) => void
  getActiveRound: (bookId: string) => ReadingRound | undefined
  getChapterStatusForRound: (tocItemId: string, roundId: string) => ChapterStatus | undefined
  updateBookStatus: (bookId: string, status: Book['readingStatus']) => void
  updateBookDate: (bookId: string, field: 'startedReadingAt' | 'finishedReadingAt', value: number | null) => void
  addBookTag: (bookId: string, tag: string) => void
  removeBookTag: (bookId: string, tag: string) => void
  updateBookTitle: (bookId: string, title: string) => void
  updateBookAuthor: (bookId: string, authorName: string) => void
  replaceBookToc: (bookId: string, items: TocItem[]) => void
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      authors: [],
      books: [],
      tocItems: [],
      rounds: [],
      chapterStatuses: [],

      addBook: (title, authorName, tocText, meta) => {
        const bookId = uuid()
        let authorId = get().authors.find(a => a.name === authorName)?.id
        if (!authorId) {
          authorId = uuid()
          const newAuthorId = authorId
          set(s => ({ authors: [...s.authors, { id: newAuthorId, name: authorName, createdAt: Date.now() }] }))
        }
        const book: Book = { id: bookId, title, authorId, tocText, createdAt: Date.now(), ...meta }
        const items = parseOutline(tocText, bookId)
        const roundId = uuid()
        const round: ReadingRound = { id: roundId, bookId, roundNumber: 1, startedAt: Date.now(), status: "active" }
        const statuses: ChapterStatus[] = items.map(item => ({
          tocItemId: item.id,
          roundId,
          checked: false,
          checkedAt: null,
          scheduledDate: null,
        }))
        set(s => ({
          books: [...s.books, book],
          tocItems: [...s.tocItems, ...items],
          rounds: [...s.rounds, round],
          chapterStatuses: [...s.chapterStatuses, ...statuses],
        }))
        return bookId
      },

      deleteBook: (bookId) => {
        set(s => {
          const tocIds = new Set(s.tocItems.filter(t => t.bookId === bookId).map(t => t.id))
          const roundIds = new Set(s.rounds.filter(r => r.bookId === bookId).map(r => r.id))
          return {
            books: s.books.filter(b => b.id !== bookId),
            tocItems: s.tocItems.filter(t => t.bookId !== bookId),
            rounds: s.rounds.filter(r => r.bookId !== bookId),
            chapterStatuses: s.chapterStatuses.filter(c => !tocIds.has(c.tocItemId) || !roundIds.has(c.roundId)),
          }
        })
      },

      toggleChapter: (tocItemId, roundId) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, checked: !c.checked, checkedAt: !c.checked ? Date.now() : null }
              : c
          ),
        }))
      },

      scheduleChapter: (tocItemId, roundId, date) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, scheduledDate: date }
              : c
          ),
        }))
      },

      markDone: (tocItemId, roundId) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, checked: true, checkedAt: Date.now() }
              : c
          ),
        }))
      },

      startNewRound: (bookId, inheritSchedule) => {
        const s = get()
        const bookRounds = s.rounds.filter(r => r.bookId === bookId)
        const lastRound = bookRounds.reduce((a, b) => b.roundNumber > a.roundNumber ? b : a, bookRounds[0])
        const newRoundNumber = (lastRound?.roundNumber ?? 0) + 1
        const roundId = uuid()
        const items = s.tocItems.filter(t => t.bookId === bookId)
        const lastRoundStatuses = lastRound
          ? Object.fromEntries(s.chapterStatuses.filter(c => c.roundId === lastRound.id).map(c => [c.tocItemId, c]))
          : {}
        const newStatuses: ChapterStatus[] = items.map(item => ({
          tocItemId: item.id,
          roundId,
          checked: false,
          checkedAt: null,
          scheduledDate: inheritSchedule ? (lastRoundStatuses[item.id]?.scheduledDate ?? null) : null,
        }))
        if (lastRound) {
          set(s2 => ({
            rounds: [...s2.rounds.map(r => r.id === lastRound.id ? { ...r, status: "completed" as const } : r), { id: roundId, bookId, roundNumber: newRoundNumber, startedAt: Date.now(), status: "active" as const }],
            chapterStatuses: [...s2.chapterStatuses, ...newStatuses],
          }))
        }
        return roundId
      },

      updateAuthor: (authorId, updates) => {
        set(s => ({
          authors: s.authors.map(a => a.id === authorId ? { ...a, ...updates } : a),
        }))
      },

      updateBookStatus: (bookId, status) => {
        set(s => ({
          books: s.books.map(b =>
            b.id === bookId ? { ...b, readingStatus: status } : b
          ),
        }))
      },

      updateBookDate: (bookId, field, value) => {
        set(s => ({
          books: s.books.map(b =>
            b.id === bookId ? { ...b, [field]: value ?? undefined } : b
          ),
        }))
      },

      addBookTag: (bookId, tag) => {
        const trimmed = tag.trim()
        if (!trimmed) return
        set(s => ({
          books: s.books.map(b => {
            if (b.id !== bookId) return b
            const tags = b.tags ?? []
            if (tags.includes(trimmed)) return b
            return { ...b, tags: [...tags, trimmed] }
          }),
        }))
      },

      removeBookTag: (bookId, tag) => {
        set(s => ({
          books: s.books.map(b => {
            if (b.id !== bookId) return b
            return { ...b, tags: (b.tags ?? []).filter(t => t !== tag) }
          }),
        }))
      },

      updateBookTitle: (bookId, title) => {
        set(s => ({
          books: s.books.map(b =>
            b.id === bookId ? { ...b, title } : b
          ),
        }))
      },

      updateBookAuthor: (bookId, authorName) => {
        const trimmed = authorName.trim()
        if (!trimmed) return
        set(s => {
          const existingAuthorId = s.authors.find(a => a.name === trimmed)?.id
          if (!existingAuthorId) {
            const authorId = uuid()
            return {
              authors: [...s.authors, { id: authorId, name: trimmed, createdAt: Date.now() }],
              books: s.books.map(b =>
                b.id === bookId ? { ...b, authorId } : b
              ),
            }
          }
          return {
            books: s.books.map(b =>
              b.id === bookId ? { ...b, authorId: existingAuthorId } : b
            ),
          }
        })
      },

      replaceBookToc: (bookId, items) => {
        set(s => {
          const oldItems = s.tocItems.filter(t => t.bookId === bookId)
          const oldTocIds = new Set(oldItems.map(t => t.id))

          // Build title→oldId map for remapping
          const titleToOldId = new Map<string, string>()
          for (const item of oldItems) {
            titleToOldId.set(item.title, item.id)
          }

          const activeRoundIds = new Set(
            s.rounds.filter(r => r.bookId === bookId && r.status === "active").map(r => r.id)
          )

          // Get all old statuses (active + completed)
          const oldStatuses = s.chapterStatuses.filter(c => oldTocIds.has(c.tocItemId))

          const newStatuses: ChapterStatus[] = []
          for (const item of items) {
            const matchedOldId = titleToOldId.get(item.title)

            for (const round of s.rounds.filter(r => r.bookId === bookId)) {
              if (activeRoundIds.has(round.id)) {
                // Active round: fresh status
                newStatuses.push({
                  tocItemId: item.id,
                  roundId: round.id,
                  checked: false,
                  checkedAt: null,
                  scheduledDate: null,
                })
              } else if (matchedOldId) {
                // Completed round: carry over old status if title matched
                const oldStatus = oldStatuses.find(
                  c => c.tocItemId === matchedOldId && c.roundId === round.id
                )
                if (oldStatus) {
                  newStatuses.push({
                    ...oldStatus,
                    tocItemId: item.id, // remap to new item ID
                  })
                }
              }
            }
          }

          return {
            tocItems: [
              ...s.tocItems.filter(t => t.bookId !== bookId),
              ...items,
            ],
            chapterStatuses: [
              ...s.chapterStatuses.filter(c => !oldTocIds.has(c.tocItemId)),
              ...newStatuses,
            ],
            books: s.books.map(b =>
              b.id === bookId
                ? { ...b, tocText: items.map(i => `${"  ".repeat(getDepth(items, i.id))}- ${i.title}`).join("\n") }
                : b
            ),
          }
        })
      },

      getActiveRound: (bookId) => {
        const s = get()
        return s.rounds
          .filter(r => r.bookId === bookId && r.status === "active")
          .sort((a, b) => b.roundNumber - a.roundNumber)[0]
      },

      getChapterStatusForRound: (tocItemId, roundId) => {
        return get().chapterStatuses.find(c => c.tocItemId === tocItemId && c.roundId === roundId)
      },
    }),
    { name: "book-tracker-store" }
  )
)
