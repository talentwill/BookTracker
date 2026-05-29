"use client"

import { useBookStore } from "@/lib/store"
import { StatCard } from "@/components/stat-card"
import { TodayReadingList } from "@/components/today-reading-list"
import { BookCard } from "@/components/book-card"
import Link from "next/link"

export default function HomePage() {
  const store = useBookStore()
  const today = new Date().toISOString().slice(0, 10)

  const todayItems: Array<{ book: typeof store.books[0]; tocItem: typeof store.tocItems[0]; status: typeof store.chapterStatuses[0] }> = []
  for (const book of store.books) {
    const round = store.getActiveRound(book.id)
    if (!round) continue
    const statuses = store.chapterStatuses.filter(c => c.roundId === round.id && c.scheduledDate === today)
    for (const status of statuses) {
      const tocItem = store.tocItems.find(t => t.id === status.tocItemId)
      if (tocItem) todayItems.push({ book, tocItem, status })
    }
  }

  const todayDone = todayItems.filter(i => i.status.checked).length
  const todayPending = todayItems.filter(i => !i.status.checked).length

  const readingBooks = store.books
    .map(book => {
      const author = store.authors.find(a => a.id === book.authorId)
      const round = store.getActiveRound(book.id)
      const items = store.tocItems.filter(t => t.bookId === book.id)
      const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
      const checkedCount = statuses.filter(s => s.checked).length
      return { book, author, round, items, statuses, isComplete: items.length > 0 && checkedCount === items.length }
    })
    .filter(b => !b.isComplete)

  const dateStr = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })

  const streak = calculateStreak(store.chapterStatuses)

  return (
    <div className="px-6 py-6">
      <div className="mb-5">
        <p className="text-sm text-[#615d59]">{dateStr}</p>
      </div>

      <div className="mb-6 flex gap-3">
        <StatCard label="今日待读" value={todayPending} sub="章节数" variant="blue" />
        <StatCard label="今日已完成" value={todayDone} sub={todayDone > 0 ? "继续加油！" : "开始今天的阅读吧"} variant="green" />
        <StatCard
          label="在读书籍"
          value={readingBooks.length}
          sub={`总进度 ${Math.round(readingBooks.reduce((s, b) => s + (b.statuses.filter(st => st.checked).length / Math.max(b.items.length, 1)) * 100, 0) / Math.max(readingBooks.length, 1))}%`}
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
          authors={store.authors}
          allTocItems={store.tocItems}
          onToggle={(tocItemId, roundId, checkedAt) => store.toggleChapter(tocItemId, roundId, checkedAt)}
          onSchedule={(tocItemId, roundId, date) => store.scheduleChapter(tocItemId, roundId, date)}
        />
      </div>

      {readingBooks.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[rgba(0,0,0,0.95)]">最近在读</h2>
            <Link href="/bookshelf" className="text-xs font-medium text-[#097fe8] hover:underline">查看书架 →</Link>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2">
            {readingBooks.slice(0, 5).map(b => (
              <div key={b.book.id} className="min-w-[180px]">
                <BookCard book={b.book} author={b.author} round={b.round} items={b.items} statuses={b.statuses} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function calculateStreak(statuses: Array<{ checked: boolean; checkedAt: number | null }>): number {
  const checkedDates = new Set<string>()
  for (const s of statuses) {
    if (s.checkedAt) {
      checkedDates.add(new Date(s.checkedAt).toISOString().slice(0, 10))
    }
  }
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (checkedDates.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
