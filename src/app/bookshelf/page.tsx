"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useBooks } from "@/lib/hooks/use-books"
import { BookCard } from "@/components/book-card"

const supabase = createClient()

type Filter = "all" | "reading" | "done" | "today" | "unfinished"

export default function BookshelfPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const { data: books } = useBooks()
  const today = new Date().toISOString().slice(0, 10)

  const { data: allRounds } = useQuery({
    queryKey: ["reading-rounds", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reading_rounds").select("*")
      if (error) throw error
      return data ?? []
    },
  })

  const { data: allTocItems } = useQuery({
    queryKey: ["toc-items", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("toc_items").select("*").order("sort_order")
      if (error) throw error
      return data ?? []
    },
  })

  const { data: allStatuses } = useQuery({
    queryKey: ["chapter-statuses", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapter_statuses").select("*")
      if (error) throw error
      return data ?? []
    },
  })

  const bookCards = useMemo(() => {
    if (!books || !allRounds || !allTocItems || !allStatuses) return []

    return books.map(book => {
      const author = book.authors
      const activeRound = allRounds
        .filter((r: any) => r.book_id === book.id && r.status === "active")
        .sort((a: any, b: any) => b.round_number - a.round_number)[0]
      const items = allTocItems.filter((t: any) => t.book_id === book.id)
      const statuses = allStatuses.filter((s: any) => s.round_id === (activeRound?.id ?? ""))
      const checkedCount = statuses.filter((s: any) => s.checked).length
      const totalCount = items.length
      const isComplete = totalCount > 0 && checkedCount === totalCount
      const hasToday = statuses.some((s: any) => !s.checked && s.scheduled_date === today)
      const hasUnfinished = items.length > 0 && statuses.filter((s: any) => s.checked).length < items.length
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
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] px-6 py-3">
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
      </div>

      <div className="grid gap-4 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {filtered.map(b => (
          <BookCard key={b.book.id} {...b} />
        ))}
      </div>
    </div>
  )
}

