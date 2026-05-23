"use client"

import { useBookStore } from "@/lib/store"
import { AuthorCard } from "@/components/author-card"

export default function AuthorsPage() {
  const store = useBookStore()

  const authorData = store.authors.map(author => {
    const books = store.books
      .filter(b => b.authorId === author.id)
      .map(book => {
        const round = store.getActiveRound(book.id)
        const items = store.tocItems.filter(t => t.bookId === book.id)
        const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
        return { book, round, items, statuses }
      })
    return { author, books }
  })

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.05)] px-6 py-4">
        <p className="text-xs text-[#615d59]">
          共 <strong className="text-[rgba(0,0,0,0.95)]">{store.authors.length}</strong> 位作者 · <strong className="text-[rgba(0,0,0,0.95)]">{store.books.length}</strong> 本书
        </p>
      </div>
      <div className="flex flex-col gap-3 p-5">
        {authorData.map(ad => (
          <AuthorCard key={ad.author.id} author={ad.author} books={ad.books} />
        ))}
        {authorData.length === 0 && (
          <div className="py-16 text-center text-sm text-[#a39e98]">还没有添加任何书籍</div>
        )}
      </div>
    </div>
  )
}
