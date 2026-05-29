export interface Author {
  id: string
  name: string
  note?: string
  created_at: string
}

export interface Book {
  id: string
  title: string
  author_id: string
  toc_text: string
  created_at: string
  publisher?: string
  publish_date?: string
  isbn?: string
  cover_url?: string
  douban_rating?: string
  douban_url?: string
  reading_status?: 'reading' | 'finished' | 'dropped' | 'idle' | 'want'
  started_reading_at?: string
  finished_reading_at?: string
  tags?: string[]
  authors?: Author
}

export interface TocItem {
  id: string
  book_id: string
  parent_id: string | null
  title: string
  sort_order: number
}

export interface ReadingRound {
  id: string
  book_id: string
  round_number: number
  started_at: string
  status: 'active' | 'completed'
}

export interface ChapterStatus {
  toc_item_id: string
  round_id: string
  checked: boolean
  checked_at: string | null
  scheduled_date: string | null
}
