"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ReadingRound, TocItem, ChapterStatus } from "@/lib/types"
import Link from "next/link"
import { useBooks } from "@/lib/hooks/use-books"
import { BookCard } from "@/components/book-card"
import { formatToday } from "@/lib/utils"

const supabase = createClient()

type Filter = "all" | "reading" | "done" | "today" | "unfinished"

export default function BookshelfPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const { data: books } = useBooks()
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

  const bookCards = useMemo(() => {
    if (!books || !allRounds || !allTocItems || !allStatuses) return []

    return books.map(book => {
      const author = book.authors
      const activeRound = allRounds
        .filter((r) => r.book_id === book.id && r.status === "active")
        .sort((a, b) => b.round_number - a.round_number)[0]
      const items = allTocItems.filter((t) => t.book_id === book.id)
      const statuses = allStatuses.filter((s) => s.round_id === (activeRound?.id ?? ""))
      const checkedCount = statuses.filter((s) => s.checked).length
      const totalCount = items.length
      const isComplete = totalCount > 0 && checkedCount === totalCount
      const hasToday = statuses.some((s) => !s.checked && s.scheduled_date === today)
      const hasUnfinished = items.length > 0 && statuses.filter((s) => s.checked).length < items.length
      return {
        book,
        author,
        round: activeRound,
        items,
        statuses,
        isComplete,
        hasToday,
        hasUnfinished,
        checkedCount,
        totalCount,
      }
    })
  }, [books, allRounds, allTocItems, allStatuses, today])

  const filtered = bookCards.filter(b => {
    if (filter === "all") return true
    if (filter === "reading") return !b.isComplete
    if (filter === "done") return b.isComplete
    if (filter === "today") return b.hasToday
    if (filter === "unfinished") return b.hasUnfinished
    return true
  })

  const counts = {
    all: bookCards.length,
    reading: bookCards.filter(b => !b.isComplete).length,
    done: bookCards.filter(b => b.isComplete).length,
    today: bookCards.filter(b => b.hasToday).length,
    unfinished: bookCards.filter(b => b.hasUnfinished).length,
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `全部 (${counts.all})` },
    { key: "reading", label: `在读 (${counts.reading})` },
    { key: "done", label: `已完成 (${counts.done})` },
    { key: "today", label: `今天有排期 (${counts.today})` },
    { key: "unfinished", label: `未读 (${counts.unfinished})` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between px-6" style={{ height: '49px' }}>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === f.key ? "bg-[#0075de] text-white" : "bg-[#f2f9ff] text-[#097fe8] hover:bg-[#e0ecf8]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link
          href="/books/add"
          className="inline-flex items-center justify-center h-8 px-3 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md transition-colors shrink-0"
        >
          + 添加书籍
        </Link>
      </div>

      <div className="grid gap-4 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {filtered.map(b => (
          <BookCard key={b.book.id} {...b} />
        ))}
      </div>
    </div>
  )
}

