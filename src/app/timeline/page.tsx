"use client"

import { useState } from "react"
import { useBookStore } from "@/lib/store"

interface DayGroup {
  dateKey: string
  dateLabel: string
  weekday: string
  chapters: Array<{
    bookId: string
    tocItemId: string
    chapterTitle: string
  }>
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function formatDateLabel(dateKey: string): { month: string; day: string; weekday: string } {
  const d = new Date(dateKey + "T00:00:00")
  return {
    month: `${d.getMonth() + 1}月`,
    day: `${d.getDate()}日`,
    weekday: WEEKDAYS[d.getDay()],
  }
}

export default function TimelinePage() {
  const [selectedBookId, setSelectedBookId] = useState<string>("all")
  const store = useBookStore()

  // Aggregate completed chapters by date
  const completedStatuses = store.chapterStatuses.filter(
    s => s.checked && s.checkedAt !== null
  )

  // Build tocItemId → book map
  const tocItemMap = new Map(store.tocItems.map(t => [t.id, t]))

  // Build book id → book map for O(1) lookups
  const bookMap = new Map(store.books.map(b => [b.id, b]))

  // Group by date
  const dateMap = new Map<string, DayGroup>()

  for (const status of completedStatuses) {
    const tocItem = tocItemMap.get(status.tocItemId)
    if (!tocItem) continue

    const book = bookMap.get(tocItem.bookId)
    if (!book) continue

    // Filter by selected book
    if (selectedBookId !== "all" && tocItem.bookId !== selectedBookId) continue

    const dateKey = new Date(status.checkedAt!).toISOString().slice(0, 10)

    if (!dateMap.has(dateKey)) {
      const { month, day, weekday } = formatDateLabel(dateKey)
      dateMap.set(dateKey, {
        dateKey,
        dateLabel: `${month}${day}`,
        weekday,
        chapters: [],
      })
    }

    dateMap.get(dateKey)!.chapters.push({
      bookId: book.id,
      tocItemId: tocItem.id,
      chapterTitle: tocItem.title,
    })
  }

  // Sort by date descending
  const groups = [...dateMap.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  // Books that have reading records
  const completedBookIds = new Set(
    completedStatuses.map(s => tocItemMap.get(s.tocItemId)?.bookId).filter(Boolean)
  )
  const booksWithRecords = store.books.filter(book => completedBookIds.has(book.id))

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
        <div className="relative">
          {groups.map((group, groupIdx) => {
            // Group chapters by book within each day
            const chaptersByBook = new Map<string, typeof group.chapters>()
            for (const ch of group.chapters) {
              if (!chaptersByBook.has(ch.bookId)) chaptersByBook.set(ch.bookId, [])
              chaptersByBook.get(ch.bookId)!.push(ch)
            }

            return (
              <div key={group.dateKey} className="mb-6">
                {/* Date node - hollow pill */}
                <div className="inline-flex items-center gap-2 border-2 border-[#0075de] rounded-[20px] px-3.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0075de]" />
                  <span className="text-[13px] font-semibold text-[rgba(0,0,0,0.85)]">
                    {group.dateLabel} · {group.weekday}
                  </span>
                  <span className="text-[12px] text-[#615d59]">
                    {group.chapters.length}章
                  </span>
                </div>

                {/* Dashed branch line + book groups */}
                <div className="ml-2.5 border-l-2 border-dashed border-[#d0cfcf] pl-5 mt-2 mb-2">
                  {[...chaptersByBook.entries()].map(([bookId, chapters]) => {
                    const book = bookMap.get(bookId)
                    return (
                      <div key={bookId} className="mb-3 last:mb-0">
                        {/* Book row */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-8 rounded-[3px] bg-[#fef3e0] flex items-center justify-center text-[12px] shrink-0 overflow-hidden">
                            {book?.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                              />
                            ) : (
                              "📘"
                            )}
                          </div>
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
                  <div className="ml-2.5 w-0.5 h-4 bg-[#e0dfde]" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
