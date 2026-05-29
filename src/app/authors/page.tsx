"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ReadingRound, TocItem, ChapterStatus } from "@/lib/types"
import { useAuthors } from "@/lib/hooks/use-authors"
import { useBooks } from "@/lib/hooks/use-books"
import { AuthorCard } from "@/components/author-card"

const supabase = createClient()

export default function AuthorsPage() {
  const { data: authors } = useAuthors()
  const { data: books } = useBooks()

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

  const authorData = useMemo(() => {
    if (!authors || !books || !allRounds || !allTocItems || !allStatuses) return []

    return authors.map(author => {
      const authorBooks = books
        .filter(b => b.author_id === author.id)
        .map(book => {
          const activeRound = allRounds
            .filter((r) => r.book_id === book.id && r.status === "active")
            .sort((a, b) => b.round_number - a.round_number)[0]
          const items = allTocItems.filter((t) => t.book_id === book.id)
          const statuses = allStatuses.filter((s) => s.round_id === (activeRound?.id ?? ""))
          return {
            book,
            round: activeRound,
            items,
            statuses,
          }
        })
      return { author, books: authorBooks }
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

