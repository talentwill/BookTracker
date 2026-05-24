"use client"

import { use } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { TocTreeEditor } from "@/components/toc-tree-editor"
import type { TocItem } from "@/lib/types"

export default function BookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const store = useBookStore()
  const book = store.books.find(b => b.id === id)
  const items = store.tocItems.filter(t => t.bookId === id)

  function handleTocChange(newItems: TocItem[]) {
    store.replaceBookToc(id, newItems)
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">书籍未找到</p>
        <Link href="/bookshelf" className="text-[#0075de] hover:underline">返回书架</Link>
      </div>
    )
  }

  return (
    <div className="px-6 py-5">
      <Link href={`/books/${id}`} className="mb-4 inline-block text-sm text-[#0075de] hover:underline">
        &larr; 返回书籍详情
      </Link>

      <TocTreeEditor items={items} onChange={handleTocChange} bookId={id} title={`${book.title} — 编辑目录`} />
    </div>
  )
}
