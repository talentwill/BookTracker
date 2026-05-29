"use client"

import Link from "next/link"
import { getCoverUrl } from "@/lib/supabase/storage"
import { formatToday } from "@/lib/utils"
import type { Book, Author, ReadingRound, ChapterStatus, TocItem } from "@/lib/types"

interface BookCardProps {
  book: Book
  author: Author | undefined
  round: ReadingRound | undefined
  items: TocItem[]
  statuses: ChapterStatus[]
}

const gradients = [
  "linear-gradient(135deg,#f6f5f4,#e8e5e0)",
  "linear-gradient(135deg,#f2f9ff,#e0ecf8)",
  "linear-gradient(135deg,#fef6ee,#f8e8d0)",
  "linear-gradient(135deg,#e6f9ee,#d0f0dc)",
  "linear-gradient(135deg,#f3e8ff,#e4d0f8)",
]

export function BookCard({ book, author, round, items, statuses }: BookCardProps) {
  const checkedCount = statuses.filter(s => s.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const isComplete = totalCount > 0 && checkedCount === totalCount

  const todayScheduled = statuses.filter(s => {
    if (s.checked) return false
    return s.scheduled_date === formatToday()
  }).length

  const today = formatToday()
  const tomorrow = new Date(today + "T00:00:00")
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`
  const tomorrowScheduled = statuses.filter(s => {
    if (s.checked) return false
    return s.scheduled_date === tomorrowStr
  }).length

  const gradientIndex = book.title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length

  return (
    <Link href={`/books/${book.id}`} className="group">
      <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.1)] transition-shadow hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_7px]">
        <div
          className="relative flex h-[130px] items-center justify-center"
          style={{ background: gradients[gradientIndex] }}
        >
          {book.cover_url ? (
            <img
              src={book.cover_url.startsWith('http') ? book.cover_url : getCoverUrl(book.cover_url)}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          ) : (
            <span className="text-[44px]">📘</span>
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            <span className="rounded-full bg-[#f2f9ff] px-2 py-0.5 text-[10px] font-semibold text-[#097fe8]">
              第{round?.round_number ?? 1}轮
            </span>
            {isComplete && (
              <span className="rounded-full bg-[#e6f9ee] px-2 py-0.5 text-[10px] font-semibold text-[#1aae39]">
                ✓ 已完成
              </span>
            )}
          </div>
        </div>
        <div className="p-3.5">
          <h3 className="mb-0.5 truncate text-[15px] font-bold text-[rgba(0,0,0,0.95)]">{book.title}</h3>
          <p className="mb-2.5 text-xs">
            <span className="text-[#0075de] hover:underline">{author?.name ?? "未知"}</span>
          </p>
          <div className="mb-1 h-[5px] overflow-hidden rounded-full bg-[#f2f9ff]">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? "bg-[#1aae39]" : "bg-[#0075de]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#a39e98]">
            <span>{checkedCount}/{totalCount} 章节</span>
            {todayScheduled > 0 ? (
              <span className="font-medium text-[#097fe8]">今天 {todayScheduled}章</span>
            ) : tomorrowScheduled > 0 ? (
              <span className="font-medium text-[#dd5b00]">明天 {tomorrowScheduled}章</span>
            ) : (
              <span>{isComplete ? "已完成" : "未排期"}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
