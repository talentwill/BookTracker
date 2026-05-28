"use client"

import { useState, useMemo } from "react"
import { useBookStore } from "@/lib/store"

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

function toLocalDateKey(ts: number): string {
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
        src={coverUrl}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

export default function TimelinePage() {
  const [selectedBookId, setSelectedBookId] = useState<string>("all")
  const store = useBookStore()

  const bookMap = useMemo(() => new Map(store.books.map(b => [b.id, b])), [store.books])
  const tocItemMap = useMemo(() => new Map(store.tocItems.map(t => [t.id, t])), [store.tocItems])

  const { groups, booksWithRecords } = useMemo(() => {
    const completedStatuses = store.chapterStatuses.filter(
      s => s.checked && s.checkedAt !== null
    )

    const completedBookIds = new Set<string>()
    const dateMap = new Map<string, DayGroup>()

    for (const status of completedStatuses) {
      const tocItem = tocItemMap.get(status.tocItemId)
      if (!tocItem) continue

      const book = bookMap.get(tocItem.bookId)
      if (!book) continue

      completedBookIds.add(tocItem.bookId)

      if (selectedBookId !== "all" && tocItem.bookId !== selectedBookId) continue

      const dateKey = toLocalDateKey(status.checkedAt!)

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
      if (!group.chaptersByBook.has(tocItem.bookId)) {
        group.chaptersByBook.set(tocItem.bookId, [])
      }
      group.chaptersByBook.get(tocItem.bookId)!.push({
        bookId: book.id,
        tocItemId: tocItem.id,
        chapterTitle: tocItem.title,
      })
      group.totalChapters++
    }

    const groups = [...dateMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    const booksWithRecords = store.books.filter(book => completedBookIds.has(book.id))

    return { groups, booksWithRecords }
  }, [store.chapterStatuses, store.tocItems, store.books, selectedBookId, tocItemMap, bookMap])

  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)]">阅读时间线</h1>
        <select
          value={selectedBookId}
          onChange={e => setSelectedBookId(e.target.value)}
          className="border border-[rgba(0,0,0,0.15)] rounded-md px-3 py-1.5 text-[13px] text-[rgba(0,0,0,0.85)] bg-white outline-none focus:border-[#0075de]"
        >
          <option value="all">全部书籍</option>
          {booksWithRecords.map(book => (
            <option key={book.id} value={book.id}>{book.title}</option>
          ))}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#615d59]">
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
                <span className="text-[13px] font-semibold text-[rgba(0,0,0,0.85)]">
                  {group.dateLabel} · {group.weekday}
                </span>
                <span className="text-[12px] text-[#615d59]">
                  {group.totalChapters}章
                </span>
              </div>

              {/* Dashed branch line + book groups */}
              <div className="ml-2.5 border-l-2 border-dashed border-[#d0cfcf] pl-5 mt-2 mb-2">
                {[...group.chaptersByBook.entries()].map(([bookId, chapters]) => {
                  const book = bookMap.get(bookId)
                  return (
                    <div key={bookId} className="mb-3 last:mb-0">
                      {/* Book row */}
                      <div className="flex items-center gap-2 mb-1">
                        <CoverThumb coverUrl={book?.coverUrl} title={book?.title ?? ""} />
                        <span className="text-[13px] font-medium text-[rgba(0,0,0,0.85)]">
                          {book?.title ?? "未知"}
                        </span>
                      </div>

                      {/* Chapter chips */}
                      <div className="ml-8 flex flex-wrap gap-1.5">
                        {chapters.map(ch => (
                          <span
                            key={ch.tocItemId}
                            className="inline-flex items-center gap-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] px-2.5 py-1 text-[12px] text-[rgba(0,0,0,0.65)]"
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
                <div className="ml-2.5 w-0.5 h-4 border-l-2 border-dashed border-[#d0cfcf]" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
