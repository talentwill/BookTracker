"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { TableView } from "@/components/table-view"
import { RoundSelector } from "@/components/round-selector"
import { NewRoundDialog } from "@/components/new-round-dialog"

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [roundDialogOpen, setRoundDialogOpen] = useState(false)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const store = useBookStore()

  const book = store.books.find(b => b.id === id)
  const author = book ? store.authors.find(a => a.id === book.authorId) : undefined
  const items = store.tocItems.filter(t => t.bookId === id)
  const activeRound = book ? store.getActiveRound(id) : undefined
  const selectedRound = selectedRoundId
    ? store.rounds.find(r => r.id === selectedRoundId)
    : activeRound
  const roundId = selectedRound?.id ?? ""

  const statuses = new Map(
    store.chapterStatuses
      .filter(c => c.roundId === roundId)
      .map(c => [c.tocItemId, c])
  )

  const checkedCount = [...statuses.values()].filter(s => s.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">书籍未找到</p>
        <Link href="/bookshelf" className="text-[#0075de] hover:underline">返回书架</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-5">
        <Link href="/bookshelf" className="mb-3 inline-block text-sm text-[#0075de] hover:underline">
          &larr; 返回书架
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-[88px] w-16 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f6f5f4,#e8e5e0)] text-2xl border border-[rgba(0,0,0,0.1)]">
            📘
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)]">{book.title}</h1>
            <p className="mt-0.5 text-[13px] text-[#615d59]">
              <Link href={`/authors/${book.authorId}`} className="text-[#0075de] hover:underline">
                {author?.name ?? "未知"}
              </Link>
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="max-w-[280px] flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[#615d59]">阅读进度</span>
                  <span className="font-semibold text-[#097fe8]">{checkedCount}/{totalCount} &middot; {progress}%</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#f2f9ff]">
                  <div className="h-full rounded-full bg-[#0075de] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
          {selectedRound && (
            <RoundSelector
              rounds={store.rounds.filter(r => r.bookId === id)}
              selectedRound={selectedRound}
              onSelectRound={(round) => setSelectedRoundId(round.id)}
              onNewRound={() => setRoundDialogOpen(true)}
            />
          )}
        </div>
      </div>

      {selectedRound && (
        <TableView
          items={items}
          statuses={statuses}
          round={selectedRound}
          onSchedule={(tocItemId, date) => store.scheduleChapter(tocItemId, roundId, date)}
          onToggle={(tocItemId) => store.toggleChapter(tocItemId, roundId)}
        />
      )}
      <NewRoundDialog
        open={roundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        roundNumber={(store.rounds.filter(r => r.bookId === id).reduce((max, r) => Math.max(max, r.roundNumber), 0)) + 1}
        onConfirm={(inherit) => {
          store.startNewRound(id, inherit)
        }}
      />
    </div>
  )
}
