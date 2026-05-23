"use client"

import type { Book, TocItem, ChapterStatus } from "@/lib/types"

interface TodayReadingListProps {
  items: Array<{
    book: Book
    tocItem: TocItem
    status: ChapterStatus
  }>
  onToggle: (tocItemId: string, roundId: string) => void
}

export function TodayReadingList({ items, onToggle }: TodayReadingListProps) {
  const done = items.filter(i => i.status.checked)
  const pending = items.filter(i => !i.status.checked)

  return (
    <div className="flex flex-col gap-1.5">
      {done.map(item => (
        <div key={item.tocItem.id} className="flex items-center gap-3 rounded-lg bg-[#f6f5f4] px-3.5 py-2.5 opacity-50">
          <span className="text-base text-[#1aae39]">✓</span>
          <span className="flex-1 text-[13px] text-[#615d59] line-through">
            {item.book.title} · {item.tocItem.title}
          </span>
          <span className="text-[11px] text-[#a39e98]">已完成</span>
        </div>
      ))}
      {pending.map(item => (
        <div key={item.tocItem.id} className="flex items-center gap-3 rounded-lg border border-[rgba(0,117,222,0.2)] bg-white px-3.5 py-2.5">
          <span className="text-base text-[#097fe8]">○</span>
          <span className="flex-1 text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
            {item.book.title} · {item.tocItem.title}
          </span>
          <button
            onClick={() => onToggle(item.tocItem.id, item.status.roundId)}
            className="rounded bg-[#0075de] px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-[#005bab]"
          >
            打勾
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-[#a39e98]">今天没有排期阅读的章节</div>
      )}
    </div>
  )
}
