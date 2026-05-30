"use client"

import { use } from "react"
import Link from "next/link"
import { useBooks } from "@/lib/hooks/use-books"
import { useTocItems, useReplaceBookToc } from "@/lib/hooks/use-toc-items"
import { TocTreeEditor } from "@/components/toc-tree-editor"
import type { TocItem } from "@/lib/types"

export default function BookEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: books } = useBooks()
  const { data: tocItems } = useTocItems(id)
  const replaceBookToc = useReplaceBookToc()

  const book = books?.find(b => b.id === id)
  const items = tocItems ?? []

  function handleTocChange(newItems: TocItem[]) {
    replaceBookToc.mutate({
      bookId: id,
      items: newItems.map(item => ({
        title: item.title,
        indent: 0,
        order: item.sort_order,
      })),
    })
  }

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">书籍未找到</p>
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
