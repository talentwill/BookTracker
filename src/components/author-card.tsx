"use client"

import Link from "next/link"
import type { Author, Book, ReadingRound, ChapterStatus, TocItem } from "@/lib/types"

interface AuthorCardProps {
  author: Author
  books: Array<{
    book: Book
    round: ReadingRound | undefined
    items: TocItem[]
    statuses: ChapterStatus[]
  }>
}

export function AuthorCard({ author, books }: AuthorCardProps) {
  const totalCount = books.length
  const doneCount = books.filter(b => {
    const checked = b.statuses.filter(s => s.checked).length
    return b.items.length > 0 && checked === b.items.length
  }).length
  const readingCount = totalCount - doneCount

  const statusLabel = doneCount > 0
    ? { bg: "bg-[#e6f9ee]", text: "text-[#1aae39]", label: `${doneCount}本已读完` }
    : { bg: "bg-[#f2f9ff]", text: "text-[#097fe8]", label: "在读" }

  return (
    <Link href={`/authors/${author.id}`}>
      <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-border px-5 py-4 transition-shadow hover:shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-xl">
          {author.name[0]}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[15px] font-bold text-foreground">{author.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusLabel.bg} ${statusLabel.text}`}>
              {statusLabel.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            共 {totalCount} 本书 · {doneCount} 本完成 · {readingCount} 本在读
          </p>
        </div>
        <span className="text-muted-foreground">→</span>
      </div>
    </Link>
  )
}
