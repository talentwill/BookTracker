"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useAuthors } from "@/lib/hooks/use-authors"
import { useBooks } from "@/lib/hooks/use-books"
import { AuthorCard } from "@/components/author-card"

const supabase = createClient()

export default function AuthorsPage() {
  const { data: authors } = useAuthors()
  const { data: books } = useBooks()

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

  const authorData = useMemo(() => {
    if (!authors || !books || !allRounds || !allTocItems || !allStatuses) return []

    return authors.map(author => {
      const authorBooks = books
        .filter(b => b.author_id === author.id)
        .map(book => {
          const activeRound = allRounds
            .filter((r: any) => r.book_id === book.id && r.status === "active")
            .sort((a: any, b: any) => b.round_number - a.round_number)[0]
          const items = allTocItems.filter((t: any) => t.book_id === book.id)
          const statuses = allStatuses.filter((s: any) => s.round_id === (activeRound?.id ?? ""))
          return {
            book: mapBook(book),
            round: activeRound ? mapRound(activeRound) : undefined,
            items: items.map(mapTocItem),
            statuses: statuses.map(mapChapterStatus),
          }
        })
      return { author: mapAuthor(author), books: authorBooks }
    })
  }, [authors, books, allRounds, allTocItems, allStatuses])

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.05)] px-6 py-4">
        <p className="text-xs text-[#615d59]">
          共 <strong className="text-[rgba(0,0,0,0.95)]">{authors?.length ?? 0}</strong> 位作者 · <strong className="text-[rgba(0,0,0,0.95)]">{books?.length ?? 0}</strong> 本书
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

// --- Mapping helpers: Supabase snake_case -> component camelCase ---

function mapBook(book: any) {
  return {
    id: book.id,
    title: book.title,
    authorId: book.author_id,
    tocText: book.toc_text ?? "",
    createdAt: book.created_at,
    publisher: book.publisher,
    publishDate: book.publish_date,
    isbn: book.isbn,
    coverUrl: book.cover_url,
    doubanRating: book.douban_rating,
    doubanUrl: book.douban_url,
    readingStatus: book.reading_status,
    startedReadingAt: book.started_reading_at,
    finishedReadingAt: book.finished_reading_at,
    tags: book.tags,
  }
}

function mapAuthor(author: any) {
  return {
    id: author.id,
    name: author.name,
    note: author.note,
    createdAt: author.created_at,
  }
}

function mapTocItem(item: any) {
  return {
    id: item.id,
    bookId: item.book_id,
    parentId: item.parent_id,
    title: item.title,
    order: item.sort_order,
  }
}

function mapChapterStatus(status: any) {
  return {
    tocItemId: status.toc_item_id,
    roundId: status.round_id,
    checked: status.checked,
    checkedAt: status.checked_at,
    scheduledDate: status.scheduled_date,
  }
}

function mapRound(round: any) {
  return {
    id: round.id,
    bookId: round.book_id,
    roundNumber: round.round_number,
    startedAt: round.started_at,
    status: round.status,
  }
}
