"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ReadingRound, TocItem, ChapterStatus, Author } from "@/lib/types"
import { useBooks } from "@/lib/hooks/use-books"
import { useToggleChapter, useScheduleChapter } from "@/lib/hooks/use-chapter-statuses"
import { StatCard } from "@/components/stat-card"
import { TodayReadingList } from "@/components/today-reading-list"
import { BookCard } from "@/components/book-card"
import { formatToday } from "@/lib/utils"
import Link from "next/link"

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const { data: books } = useBooks()
  const toggleChapter = useToggleChapter()
  const scheduleChapter = useScheduleChapter()
  const today = formatToday()

  const { data: allRounds } = useQuery<ReadingRound[]>({
    queryKey: ["reading-rounds", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reading_rounds").select("*")
      if (error) throw error
      return (data ?? []) as ReadingRound[]
    },
  })

  const { data: allTocItems } = useQuery<TocItem[]>({
    queryKey: ["toc-items", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("toc_items").select("*").order("sort_order")
      if (error) throw error
      return (data ?? []) as TocItem[]
    },
  })

  const { data: allStatuses } = useQuery<ChapterStatus[]>({
    queryKey: ["chapter-statuses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapter_statuses").select("*")
      if (error) throw error
      return (data ?? []) as ChapterStatus[]
    },
  })

  // Extract unique authors from books' joined relation
  const authors = useMemo(() => {
    if (!books) return []
    const map = new Map<string, Author>()
    for (const b of books) {
      if (b.authors) map.set(b.authors.id, b.authors)
    }
    return [...map.values()]
  }, [books])

  // Compute today's reading items
  const todayItems = useMemo(() => {
    if (!books || !allRounds || !allTocItems || !allStatuses) return []
    const items: Array<{ book: typeof books[number]; tocItem: TocItem; status: ChapterStatus }> = []
    for (const book of books) {
      const activeRound = allRounds
        .filter((r) => r.book_id === book.id && r.status === "active")
        .sort((a, b) => b.round_number - a.round_number)[0]
      if (!activeRound) continue
      const statuses = allStatuses.filter(
        (s) => s.round_id === activeRound.id && s.scheduled_date === today
      )
      for (const status of statuses) {
        const tocItem = allTocItems.find((t) => t.id === status.toc_item_id)
        if (tocItem) items.push({ book, tocItem, status })
      }
    }
    return items
  }, [books, allRounds, allTocItems, allStatuses, today])

  const todayDone = todayItems.filter(i => i.status.checked).length
  const todayPending = todayItems.filter(i => !i.status.checked).length

  // Compute reading books (not yet complete)
  const readingBooks = useMemo(() => {
    if (!books || !allRounds || !allTocItems || !allStatuses) return []
    return books
      .map(book => {
        const author = book.authors
        const activeRound = allRounds
          .filter((r) => r.book_id === book.id && r.status === "active")
          .sort((a, b) => b.round_number - a.round_number)[0]
        const items = allTocItems.filter((t) => t.book_id === book.id)
        const statuses = allStatuses.filter(
          (s) => s.round_id === (activeRound?.id ?? "")
        )
        const checkedCount = statuses.filter((s) => s.checked).length
        return {
          book,
          author,
          round: activeRound,
          items,
          statuses,
          isComplete: items.length > 0 && checkedCount === items.length,
        }
      })
      .filter(b => !b.isComplete)
  }, [books, allRounds, allTocItems, allStatuses])

  const dateStr = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  const streak = calculateStreak(allStatuses ?? [])

  return (
    <div>
      <div className="flex items-center justify-between px-6" style={{ height: '49px' }}>
        <p className="text-sm text-[#615d59]">{dateStr}</p>
        <Link
          href="/books/add"
          className="inline-flex items-center justify-center h-8 px-3 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md transition-colors"
        >
          + 添加书籍
        </Link>
      </div>

      <div className="px-6 pb-6">

      <div className="mb-6 flex gap-3">
        <StatCard label="今日待读" value={todayPending} sub="章节数" variant="blue" />
        <StatCard
          label="今日已完成"
          value={todayDone}
          sub={todayDone > 0 ? "继续加油！" : "开始今天的阅读吧"}
          variant="green"
        />
        <StatCard
          label="在读书籍"
          value={readingBooks.length}
          sub={`总进度 ${Math.round(
            readingBooks.reduce(
              (s, b) =>
                s +
                (b.statuses.filter((st) => st.checked).length /
                  Math.max(b.items.length, 1)) *
                  100,
              0
            ) / Math.max(readingBooks.length, 1)
          )}%`}
          variant="gray"
        />
        <StatCard label="连续阅读" value={streak} sub="天 🔥" variant="gray" />
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[rgba(0,0,0,0.95)]">今日阅读清单</h2>
        </div>
        <TodayReadingList
          items={todayItems}
          authors={authors}
          allTocItems={allTocItems ?? []}
          onToggle={(tocItemId, roundId, checkedAt) => {
            toggleChapter.mutate({ tocItemId, roundId, checked: checkedAt !== undefined, checkedAt: checkedAt ? new Date(checkedAt).toISOString() : undefined })
          }}
          onSchedule={(tocItemId, roundId, date) => {
            scheduleChapter.mutate({ tocItemId, roundId, date })
          }}
        />
      </div>

      {readingBooks.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[rgba(0,0,0,0.95)]">最近在读</h2>
            <Link href="/bookshelf" className="text-xs font-medium text-[#097fe8] hover:underline">
              查看书架 →
            </Link>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2">
            {readingBooks.slice(0, 5).map(b => (
              <div key={b.book.id} className="min-w-[180px]">
                <BookCard
                  book={b.book}
                  author={b.author}
                  round={b.round}
                  items={b.items}
                  statuses={b.statuses}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function calculateStreak(
  statuses: Array<{ checked: boolean; checked_at: string | null }>
): number {
  const checkedDates = new Set<string>()
  for (const s of statuses) {
    if (s.checked_at) {
      const d = new Date(s.checked_at)
      checkedDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
    }
  }
  let streak = 0
  const d = new Date()
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (checkedDates.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
