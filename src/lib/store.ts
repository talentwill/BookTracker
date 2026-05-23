import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import type { Author, Book, TocItem, ReadingRound, ChapterStatus } from "./types"
import { parseOutline } from "./outline-parser"

interface BookStore {
  authors: Author[]
  books: Book[]
  tocItems: TocItem[]
  rounds: ReadingRound[]
  chapterStatuses: ChapterStatus[]

  addBook: (title: string, authorName: string, tocText: string) => string
  deleteBook: (bookId: string) => void
  toggleChapter: (tocItemId: string, roundId: string) => void
  scheduleChapter: (tocItemId: string, roundId: string, date: string | null) => void
  markDone: (tocItemId: string, roundId: string) => void
  startNewRound: (bookId: string, inheritSchedule: boolean) => string
  updateAuthor: (authorId: string, updates: { name?: string; note?: string }) => void
  getActiveRound: (bookId: string) => ReadingRound | undefined
  getChapterStatusForRound: (tocItemId: string, roundId: string) => ChapterStatus | undefined
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      authors: [],
      books: [],
      tocItems: [],
      rounds: [],
      chapterStatuses: [],

      addBook: (title, authorName, tocText) => {
        const bookId = uuid()
        let authorId = get().authors.find(a => a.name === authorName)?.id
        if (!authorId) {
          authorId = uuid()
          set(s => ({ authors: [...s.authors, { id: authorId, name: authorName, createdAt: Date.now() }] }))
        }
        const book: Book = { id: bookId, title, authorId, tocText, createdAt: Date.now() }
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
