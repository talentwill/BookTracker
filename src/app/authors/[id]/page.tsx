"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { BookCard } from "@/components/book-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const store = useBookStore()
  const author = store.authors.find(a => a.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")

  if (!author) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">作者未找到</p>
        <Link href="/authors" className="text-[#0075de] hover:underline">返回作者列表</Link>
      </div>
    )
  }

  const books = store.books.filter(b => b.authorId === id)
  const totalChapters = books.reduce((sum, book) => {
    const round = store.getActiveRound(book.id)
    const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
    return sum + statuses.filter(s => s.checked).length
  }, 0)

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
            共 {books.length} 本书 · {books.filter(b => {
              const round = store.getActiveRound(b.id)
              const items = store.tocItems.filter(t => t.bookId === b.id)
              const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
              return items.length > 0 && statuses.filter(s => s.checked).length === items.length
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
        {books.map(book => {
          const round = store.getActiveRound(book.id)
          const items = store.tocItems.filter(t => t.bookId === book.id)
          const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
          return (
            <BookCard key={book.id} book={book} author={author} round={round} items={items} statuses={statuses} />
          )
        })}
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
              onClick={() => { store.updateAuthor(id, { name: editName }); setEditOpen(false) }}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
