"use client"

import Link from "next/link"
import type { Author, Book, TocItem, ChapterStatus } from "@/lib/types"

interface TodayReadingListProps {
  items: Array<{
    book: Book
    tocItem: TocItem
    status: ChapterStatus
  }>
  authors: Author[]
  allTocItems: TocItem[]
  onToggle: (tocItemId: string, roundId: string) => void
  onSchedule: (tocItemId: string, roundId: string, date: string) => void
}

function formatDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildFullPath(tocItem: TocItem, allTocItems: TocItem[]): string {
  const parts: string[] = [tocItem.title]
  let current = tocItem
  while (current.parentId) {
    const parent = allTocItems.find(t => t.id === current.parentId)
    if (!parent) break
    parts.unshift(parent.title)
    current = parent
  }
  return parts.join(" / ")
}

export function TodayReadingList({ items, authors, allTocItems, onToggle, onSchedule }: TodayReadingListProps) {
  const tomorrowStr = formatDaysFromNow(1)
  const nextWeekStr = formatDaysFromNow(7)

  // Group by book
  const grouped = new Map<string, { book: Book; items: typeof items }>()
  for (const item of items) {
    const existing = grouped.get(item.book.id)
    if (existing) {
      existing.items.push(item)
    } else {
      grouped.set(item.book.id, { book: item.book, items: [item] })
    }
  }

  if (items.length === 0) {
    return <div className="py-8 text-center text-sm text-[#a39e98]">今天没有排期阅读的章节</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {[...grouped.values()].map(({ book, items: bookItems }) => {
        const author = authors.find(a => a.id === book.authorId)
        const done = bookItems.filter(i => i.status.checked)
        const pending = bookItems.filter(i => !i.status.checked)
        return (
          <div key={book.id} className="rounded-lg border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-1.5 border-b border-[rgba(0,0,0,0.05)] px-3.5 py-2">
              <Link href={`/books/${book.id}`} className="text-[13px] font-semibold text-[rgba(0,0,0,0.95)] hover:underline">
                《{book.title}》
              </Link>
              {author && (
                <Link href={`/authors/${author.id}`} className="text-[12px] text-[#615d59] hover:underline">
                  {author.name}
                </Link>
              )}
            </div>
            <div className="flex flex-col">
              {pending.map(item => (
                <div key={item.tocItem.id} className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.03)] px-3.5 py-2">
                  <span className="text-sm text-[#097fe8]">○</span>
                  <span className="flex-1 truncate text-[13px] text-[rgba(0,0,0,0.95)]">
                    {buildFullPath(item.tocItem, allTocItems)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => onSchedule(item.tocItem.id, item.status.roundId, tomorrowStr)}
                      className="rounded bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[11px] font-semibold text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]"
                    >
                      明天
                    </button>
                    <button
                      onClick={() => onSchedule(item.tocItem.id, item.status.roundId, nextWeekStr)}
                      className="rounded bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[11px] font-semibold text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]"
                    >
                      下周
                    </button>
                    <button
                      onClick={() => onToggle(item.tocItem.id, item.status.roundId)}
                      className="rounded bg-[#0075de] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#005bab]"
                    >
                      已读
                    </button>
                  </div>
                </div>
              ))}
              {done.map(item => (
                <div key={item.tocItem.id} className="flex items-center gap-3 border-b border-[rgba(0,0,0,0.03)] px-3.5 py-2 opacity-50">
                  <span className="text-sm text-[#1aae39]">✓</span>
                  <span className="flex-1 truncate text-[13px] text-[#615d59] line-through">
                    {buildFullPath(item.tocItem, allTocItems)}
                  </span>
                  <button
                    onClick={() => onToggle(item.tocItem.id, item.status.roundId)}
                    className="shrink-0 rounded bg-[#e6f9ee] px-2 py-0.5 text-[11px] font-semibold text-[#1aae39] hover:bg-[#d0f0dd]"
                  >
                    撤销
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
