"use client"

import { useState } from "react"
import { useBookStore } from "@/lib/store"
import { BookCard } from "@/components/book-card"
import { AddBookDialog } from "@/components/add-book-dialog"

type Filter = "all" | "reading" | "done" | "today"

export default function BookshelfPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const [addOpen, setAddOpen] = useState(false)
  const store = useBookStore()
  const today = new Date().toISOString().slice(0, 10)

  const bookCards = store.books.map(book => {
    const author = store.authors.find(a => a.id === book.authorId)
    const round = store.getActiveRound(book.id)
    const items = store.tocItems.filter(t => t.bookId === book.id)
    const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
    const checkedCount = statuses.filter(s => s.checked).length
    const totalCount = items.length
    const isComplete = totalCount > 0 && checkedCount === totalCount
    const hasToday = statuses.some(s => !s.checked && s.scheduledDate === today)
    return { book, author, round, items, statuses, isComplete, hasToday, checkedCount, totalCount }
  })

  const filtered = bookCards.filter(b => {
    if (filter === "all") return true
    if (filter === "reading") return !b.isComplete
    if (filter === "done") return b.isComplete
    if (filter === "today") return b.hasToday
    return true
  })

  const counts = {
    all: bookCards.length,
    reading: bookCards.filter(b => !b.isComplete).length,
    done: bookCards.filter(b => b.isComplete).length,
    today: bookCards.filter(b => b.hasToday).length,
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `全部 (${counts.all})` },
    { key: "reading", label: `在读 (${counts.reading})` },
    { key: "done", label: `已完成 (${counts.done})` },
    { key: "today", label: `今天有排期 (${counts.today})` },
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
        <button
          onClick={() => setAddOpen(true)}
          className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] transition-colors hover:bg-[#f6f5f4]"
        >
          <div className="text-center text-[#a39e98]">
            <div className="mb-1 text-3xl">+</div>
            <div className="text-[13px] font-medium">添加书籍</div>
          </div>
        </button>
      </div>

      <AddBookDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
