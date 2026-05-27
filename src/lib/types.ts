export interface Author {
  id: string
  name: string
  note?: string
  createdAt: number
}

export interface Book {
  id: string
  title: string
  authorId: string
  tocText: string
  createdAt: number
  publisher?: string
  publishDate?: string
  isbn?: string
  coverUrl?: string
  readingStatus?: 'reading' | 'finished' | 'dropped' | 'idle' | 'want'
  startedReadingAt?: number
  finishedReadingAt?: number
  tags?: string[]
}

export interface TocItem {
  id: string
  bookId: string
  parentId: string | null
  title: string
  order: number
}

export interface ReadingRound {
  id: string
  bookId: string
  roundNumber: number
  startedAt: number
  status: 'active' | 'completed'
}

export interface ChapterStatus {
  tocItemId: string
  roundId: string
  checked: boolean
  checkedAt: number | null
  scheduledDate: string | null
}
