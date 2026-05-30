"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ReadingRound, TocItem, ChapterStatus } from "@/lib/types"
import { useAuthor, useUpdateAuthor } from "@/lib/hooks/use-authors"
import { useBooks } from "@/lib/hooks/use-books"
import { BookCard } from "@/components/book-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: author } = useAuthor(id)
  const { data: books } = useBooks()
  const updateAuthor = useUpdateAuthor()
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")

  const { data: allRounds } = useQuery<ReadingRound[]>({
    queryKey: ["reading-rounds", "all"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("reading_rounds").select("*")
      if (error) throw error
      return (data ?? []) as ReadingRound[]
    },
  })

  const { data: allTocItems } = useQuery<TocItem[]>({
    queryKey: ["toc-items", "all"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("toc_items").select("*").order("sort_order")
      if (error) throw error
      return (data ?? []) as TocItem[]
    },
  })

  const { data: allStatuses } = useQuery<ChapterStatus[]>({
    queryKey: ["chapter-statuses", "all"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from("chapter_statuses").select("*")
      if (error) throw error
      return (data ?? []) as ChapterStatus[]
    },
  })

  const authorBooks = useMemo(() => {
    if (!books || !allRounds || !allTocItems || !allStatuses) return []

    return books
      .filter(b => b.author_id === id)
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
  }, [books, allRounds, allTocItems, allStatuses, id])

  const totalChapters = authorBooks.reduce((sum, b) => {
    return sum + b.statuses.filter(s => s.checked).length
  }, 0)

  if (!author) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">作者未找到</p>
        <Link href="/authors" className="text-[#0075de] hover:underline">返回作者列表</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-3">
        <Link href="/authors" className="text-sm text-[#0075de] hover:underline">← 返回作者列表</Link>
      </div>

      <div className="flex items-center gap-4 border-b border-[rgba(0,0,0,0.1)] px-6 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] text-[28px]">
          {author.name[0]}
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[rgba(0,0,0,0.95)]">{author.name}</h1>
          <p className="mt-0.5 text-[13px] text-[#615d59]">
            共 {authorBooks.length} 本书 · {authorBooks.filter(b => {
              const checked = b.statuses.filter(s => s.checked).length
              return b.items.length > 0 && checked === b.items.length
            }).length} 本已读完 · 总计阅读 {totalChapters} 个章节
          </p>
        </div>
        <button
          onClick={() => { setEditName(author.name); setEditOpen(true) }}
          className="ml-auto rounded-md bg-[rgba(0,0,0,0.05)] px-3 py-1.5 text-xs font-medium text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]"
        >
          编辑
        </button>
      </div>

      <div className="grid gap-4 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
        {authorBooks.map(b => (
          <BookCard key={b.book.id} book={b.book} author={author} round={b.round} items={b.items} statuses={b.statuses} />
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑作者</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">作者名</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-[rgba(0,0,0,0.1)] pt-4">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>取消</Button>
            <Button
              className="bg-[#0075de] hover:bg-[#005bab]"
              onClick={() => { updateAuthor.mutate({ authorId: id, updates: { name: editName } }); setEditOpen(false) }}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

