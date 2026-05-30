"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { TocItem, ChapterStatus } from "@/lib/types"
import { useBooks } from "@/lib/hooks/use-books"
import { getCoverUrl } from "@/lib/supabase/storage"

interface DayGroup {
  dateKey: string
  dateLabel: string
  weekday: string
  chaptersByBook: Map<string, Array<{
    bookId: string
    tocItemId: string
    chapterTitle: string
  }>>
  totalChapters: number
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function toLocalDateKey(ts: string): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateKey: string): { month: string; day: string; weekday: string } {
  const d = new Date(dateKey + "T00:00:00")
  return {
    month: `${d.getMonth() + 1}月`,
    day: `${d.getDate()}日`,
    weekday: WEEKDAYS[d.getDay()],
  }
}

function CoverThumb({ coverUrl, title }: { coverUrl?: string; title: string }) {
  const [imgError, setImgError] = useState(false)

  if (!coverUrl || imgError) {
    return (
      <div className="w-6 h-8 rounded-[3px] bg-[#fef3e0] flex items-center justify-center text-[12px] shrink-0">
        📘
      </div>
    )
  }

  return (
    <div className="w-6 h-8 rounded-[3px] bg-[#fef3e0] shrink-0 overflow-hidden">
      <img
        src={coverUrl.startsWith('http') ? coverUrl : getCoverUrl(coverUrl)}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

export default function TimelinePage() {
  const [selectedBookId, setSelectedBookId] = useState<string>("all")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: books } = useBooks()

  const { data: allTocItems } = useQuery<TocItem[]>({
    queryKey: ["toc-items", "all"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("toc_items").select("*").order("sort_order")
      if (error) throw error
      return (data ?? []) as TocItem[]
    },
  })

  const { data: allStatuses } = useQuery<ChapterStatus[]>({
    queryKey: ["chapter-statuses", "all"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("chapter_statuses").select("*")
      if (error) throw error
      return (data ?? []) as ChapterStatus[]
    },
  })

  useEffect(() => {
    if (!searchOpen) return
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [searchOpen])

  const bookMap = useMemo(() => new Map((books ?? []).map(b => [b.id, b])), [books])
  const tocItemMap = useMemo(() => new Map((allTocItems ?? []).map((t) => [t.id, t])), [allTocItems])

  const { groups, booksWithRecords } = useMemo(() => {
    if (!books || !allTocItems || !allStatuses) {
      return { groups: [], booksWithRecords: [] }
    }

    const completedStatuses = allStatuses.filter(
      (s) => s.checked && s.checked_at !== null
    )

    const completedBookIds = new Set<string>()
    const dateMap = new Map<string, DayGroup>()

    for (const status of completedStatuses) {
      const tocItem = tocItemMap.get(status.toc_item_id)
      if (!tocItem) continue

      const book = bookMap.get(tocItem.book_id)
      if (!book) continue

      completedBookIds.add(tocItem.book_id)

      if (selectedBookId !== "all" && tocItem.book_id !== selectedBookId) continue

      const dateKey = toLocalDateKey(status.checked_at!)

      if (!dateMap.has(dateKey)) {
        const { month, day, weekday } = formatDateLabel(dateKey)
        dateMap.set(dateKey, {
          dateKey,
          dateLabel: `${month}${day}`,
          weekday,
          chaptersByBook: new Map(),
          totalChapters: 0,
        })
      }

      const group = dateMap.get(dateKey)!
      if (!group.chaptersByBook.has(tocItem.book_id)) {
        group.chaptersByBook.set(tocItem.book_id, [])
      }
      group.chaptersByBook.get(tocItem.book_id)!.push({
        bookId: book.id,
        tocItemId: tocItem.id,
        chapterTitle: tocItem.title,
      })
      group.totalChapters++
    }

    const groups = [...dateMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    const booksWithRecords = books.filter((book) => completedBookIds.has(book.id))

    return { groups, booksWithRecords }
  }, [allStatuses, allTocItems, books, selectedBookId, tocItemMap, bookMap])

  const selectedBookTitle = selectedBookId === "all"
    ? "全部书籍"
    : bookMap.get(selectedBookId)?.title ?? "全部书籍"

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return booksWithRecords
    const q = searchQuery.toLowerCase()
    return booksWithRecords.filter((b) => b.title.toLowerCase().includes(q))
  }, [booksWithRecords, searchQuery])

  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">阅读时间线</h1>
        <div className="relative" ref={searchRef}>
          <input
            ref={inputRef}
            type="text"
            value={searchOpen ? searchQuery : selectedBookTitle}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { setSearchOpen(true); setSearchQuery("") }}
            placeholder="搜索书籍..."
            className="border border-input rounded-md px-3 py-1.5 text-[13px] text-foreground/85 bg-background outline-none focus:border-[#0075de] w-64"
          />
          {searchOpen && (
            <div className="absolute top-full right-0 mt-1 w-full max-h-60 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={() => { setSelectedBookId("all"); setSearchOpen(false); setSearchQuery("") }}
                className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted ${selectedBookId === "all" ? "text-[#0075de] font-medium" : "text-foreground/85"}`}
              >
                全部书籍
              </button>
              {filteredBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => { setSelectedBookId(book.id); setSearchOpen(false); setSearchQuery("") }}
                  className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted ${selectedBookId === book.id ? "text-[#0075de] font-medium" : "text-foreground/85"}`}
                >
                  {book.title}
                </button>
              ))}
              {filteredBooks.length === 0 && (
                <div className="px-3 py-2 text-[12px] text-muted-foreground">无匹配书籍</div>
              )}
            </div>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-[15px]">
            {selectedBookId === "all"
              ? "还没有阅读记录，开始你的阅读之旅吧"
              : "这本书还没有阅读记录"}
          </p>
        </div>
      ) : (
        <div>
          {groups.map((group, groupIdx) => (
            <div key={group.dateKey} className="mb-6">
              {/* Date node - hollow pill */}
              <div className="inline-flex items-center gap-2 border-2 border-[#0075de] rounded-[20px] px-3.5 py-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0075de]" />
                <span className="text-[13px] font-semibold text-foreground/85">
                  {group.dateLabel} · {group.weekday}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {group.totalChapters}章
                </span>
              </div>

              {/* Dashed branch line + book groups */}
              <div className="ml-2.5 border-l-2 border-dashed border-border pl-5 mt-2 mb-2">
                {[...group.chaptersByBook.entries()].map(([bookId, chapters]) => {
                  const book = bookMap.get(bookId)
                  return (
                    <div key={bookId} className="mb-3 last:mb-0">
                      {/* Book row */}
                      <div className="flex items-center gap-2 mb-1">
                        <CoverThumb coverUrl={book?.cover_url} title={book?.title ?? ""} />
                        <span className="text-[13px] font-medium text-foreground/85">
                          {book?.title ?? "未知"}
                        </span>
                      </div>

                      {/* Chapter chips */}
                      <div className="ml-8 flex flex-wrap gap-1.5">
                        {chapters.map(ch => (
                          <span
                            key={ch.tocItemId}
                            className="inline-flex items-center gap-1 bg-card border border-border rounded-[12px] px-2.5 py-1 text-[12px] text-foreground/70"
                          >
                            <span className="w-[5px] h-[5px] rounded-full bg-[#0075de]" />
                            {ch.chapterTitle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Divider between days */}
              {groupIdx < groups.length - 1 && (
                <div className="ml-2.5 w-0.5 h-4 border-l-2 border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
