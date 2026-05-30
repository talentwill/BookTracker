"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useProfile } from "@/lib/hooks/use-profile"
import { parseOutline } from "@/lib/outline-parser"
import { useAddBook } from "@/lib/hooks/use-books"
import { useReplaceBookToc } from "@/lib/hooks/use-toc-items"
import { uploadCoverFromUrl, uploadCover } from "@/lib/supabase/storage"
import { TocTreeEditor } from "@/components/toc-tree-editor"
import type { TocItem } from "@/lib/types"

function tocItemsToRpcFormat(items: TocItem[]): Array<{ title: string; indent: number; order: number }> {
  const indentMap = new Map<string, number>()
  const itemMap = new Map(items.map(i => [i.id, i]))

  function getIndent(id: string): number {
    if (indentMap.has(id)) return indentMap.get(id)!
    const item = itemMap.get(id)
    if (!item || !item.parent_id) {
      indentMap.set(id, 0)
      return 0
    }
    const indent = getIndent(item.parent_id) + 1
    indentMap.set(id, indent)
    return indent
  }

  for (const item of items) getIndent(item.id)

  return items.map(item => ({
    title: item.title,
    indent: indentMap.get(item.id) ?? 0,
    order: item.sort_order,
  }))
}

export default function AddBookPage() {
  const router = useRouter()
  const { data: profile } = useProfile()
  const addBook = useAddBook()
  useReplaceBookToc()

  const [doubanUrl, setDoubanUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [publisher, setPublisher] = useState("")
  const [publishDate, setPublishDate] = useState("")
  const [isbn, setIsbn] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [doubanId, setDoubanId] = useState("")
  const [doubanRating, setDoubanRating] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [tocRawText, setTocRawText] = useState("")
  const [tocLoading, setTocLoading] = useState(false)
  const [tocError, setTocError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const canImport = title.trim().length > 0

  async function handleParse() {
    const trimmed = doubanUrl.trim()
    if (!trimmed) return
    if (!/douban\.com/.test(trimmed)) {
      setParseError("请输入有效的豆瓣链接")
      return
    }

    // Normalize Douban URL: strip query params, keep clean path
    const match = trimmed.match(/(https?:\/\/book\.douban\.com\/subject\/\d+\/?)/)
    const cleanUrl = match ? match[1] : trimmed
    setDoubanUrl(cleanUrl)

    // Extract doubanId from URL
    const idMatch = cleanUrl.match(/subject\/(\d+)/)
    if (idMatch) setDoubanId(idMatch[1])

    setParsing(true)
    setParseError(null)
    try {
      const res = await fetch("/api/douban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (data.error) {
        setParseError(data.error)
      } else {
        setTitle(data.title || "")
        setAuthorName(data.author || "")
        setPublisher(data.publisher || "")
        setPublishDate(data.publishDate || "")
        setIsbn(data.isbn || "")
        setCoverUrl(data.coverUrl || "")
        setDoubanRating(data.doubanRating || "")
        setImgError(false)

        if (data.tocText) {
          setTocRawText(data.tocText)
          const items = parseOutline(data.tocText, "temp")
          setTocItems(items)
        } else {
          setTocRawText("")
          setTocItems([])
        }
      }
    } catch {
      setParseError("网络请求失败，请重试")
    } finally {
      setParsing(false)
    }
  }

  async function handleAiParse(text: string) {
    if (!profile?.ai_api_key) {
      setTocError("请先在设置页面配置 AI API Key")
      setTocRawText(text)
      return
    }

    setTocLoading(true)
    setTocError(null)
    try {
      const res = await fetch("/api/toc-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          provider: profile.ai_provider,
          apiKey: profile.ai_api_key,
          baseUrl: profile.ai_base_url,
          model: profile.ai_model,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || `请求失败 (${res.status})`)
      }
      const data = await res.json()
      const items = parseOutline(data.outline, "temp")
      if (items.length === 0) {
        throw new Error("AI 返回的内容无法解析为目录")
      }
      setTocItems(items)
    } catch (err: unknown) {
      setTocError(err instanceof Error ? err.message : "AI 整理失败")
      setTocRawText(text)
    } finally {
      setTocLoading(false)
    }
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setImgError(false)
  }

  async function handleImport() {
    if (!canImport || addBook.isPending) return

    try {
      // Upload cover to Supabase storage
      let coverStoragePath: string | undefined
      if (coverFile) {
        coverStoragePath = await uploadCover(coverFile, crypto.randomUUID())
      } else if (coverUrl && doubanId) {
        coverStoragePath = await uploadCoverFromUrl(coverUrl, doubanId)
      }

      const hasStructuredToc = tocItems.length > 0
      const tocText = hasStructuredToc ? "" : tocRawText.trim()

      const meta: Record<string, unknown> = {}
      if (publisher.trim()) meta.publisher = publisher.trim()
      if (publishDate.trim()) meta.publishDate = publishDate.trim()
      if (isbn.trim()) meta.isbn = isbn.trim()
      if (coverStoragePath) meta.coverUrl = coverStoragePath
      if (doubanRating.trim()) meta.doubanRating = doubanRating.trim()
      if (doubanId) meta.doubanId = doubanId
      if (doubanUrl.trim()) meta.doubanUrl = doubanUrl.trim()
      if (hasStructuredToc) meta.tocItems = tocItemsToRpcFormat(tocItems)

      const result = await addBook.mutateAsync({
        title: title.trim(),
        authorName: authorName.trim() || "未知作者",
        tocText,
        meta: Object.keys(meta).length > 0 ? meta : undefined,
      })

      router.push("/books/" + result.bookId)
    } catch (err) {
      console.error("Failed to add book:", err)
    }
  }

  const displayCover = coverPreview || coverUrl

  return (
    <div className="mx-auto max-w-2xl px-6 py-5">
      <Link href="/bookshelf" className="mb-4 inline-block text-sm text-[#0075de] hover:underline">
        &larr; 返回书架
      </Link>

      <h1 className="text-xl font-bold text-foreground mb-6">添加书籍</h1>

      {/* Section 1: Douban Import */}
      <section className="mb-6">
        <label className="text-[13px] font-medium text-foreground block mb-1.5">
          豆瓣链接
        </label>
        <div className="flex gap-2">
          <input
            value={doubanUrl}
            onChange={e => setDoubanUrl(e.target.value)}
            placeholder="https://book.douban.com/subject/..."
            className="flex-1 h-9 px-3 border border-border rounded-md text-[13px] outline-none focus:border-[#0075de]"
            onKeyDown={e => { if (e.key === "Enter") handleParse() }}
          />
          <button
            onClick={handleParse}
            disabled={parsing || !doubanUrl.trim()}
            className="shrink-0 h-9 px-4 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md disabled:opacity-50 cursor-pointer"
          >
            {parsing ? "解析中..." : "解析"}
          </button>
        </div>
        {parseError && <p className="mt-1.5 text-[12px] text-[#d83931]">{parseError}</p>}
      </section>

      <div className="border-t border-border mb-6" />

      {/* Section 2: Book Info */}
      <section className="mb-6">
        <div className="flex gap-4">
          {/* Cover */}
          <div
            className="relative w-[120px] h-[168px] shrink-0 rounded-lg overflow-hidden border border-border bg-[linear-gradient(135deg,#f6f5f4,#e8e5e0)] dark:bg-[linear-gradient(135deg,#2a2a2a,#1f1f1f)] group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayCover && !imgError ? (
              <img
                src={displayCover}
                alt="封面"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">📘</div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-[12px] font-medium">更换封面</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="text-[13px] font-medium text-foreground block mb-1">
                书名 <span className="text-muted-foreground">*</span>
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="输入书名"
                className="w-full h-9 px-3 border border-border rounded-md text-[13px] outline-none focus:border-[#0075de]"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-foreground block mb-1">
                作者
              </label>
              <input
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="输入作者名"
                className="w-full h-9 px-3 border border-border rounded-md text-[13px] outline-none focus:border-[#0075de]"
              />
            </div>
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div>
            <label className="text-[12px] text-muted-foreground block mb-1">出版社</label>
            <input
              value={publisher}
              onChange={e => setPublisher(e.target.value)}
              placeholder="出版社"
              className="w-full h-8 px-2.5 border border-border rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground block mb-1">出版日期</label>
            <input
              value={publishDate}
              onChange={e => setPublishDate(e.target.value)}
              placeholder="2024-01"
              className="w-full h-8 px-2.5 border border-border rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground block mb-1">ISBN</label>
            <input
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              placeholder="978-..."
              className="w-full h-8 px-2.5 border border-border rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
          <div>
            <label className="text-[12px] text-muted-foreground block mb-1">豆瓣评分</label>
            <div className="h-8 px-2.5 flex items-center text-[12px] text-foreground/70">
              {doubanRating || <span className="text-muted-foreground/40">—</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border mb-6" />

      {/* Section 3: TOC */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[13px] font-medium text-foreground">
            目录 <span className="text-muted-foreground text-[12px] font-normal">(可选)</span>
          </label>
          {!tocLoading && (
            <button
              onClick={() => {
                if (tocRawText.trim()) {
                  handleAiParse(tocRawText)
                }
              }}
              disabled={!tocRawText.trim()}
              className="text-[12px] font-semibold text-[#0075de] hover:text-[#005bab] disabled:text-muted-foreground/40 disabled:cursor-not-allowed cursor-pointer"
            >
              ✨ AI 整理
            </button>
          )}
        </div>

        {tocLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-[13px] text-muted-foreground">
            <div className="w-4 h-4 border-2 border-[#0075de] border-t-transparent rounded-full animate-spin" />
            AI 整理中...
          </div>
        )}

        {tocError && !tocLoading && (
          <p className="mb-2 text-[12px] text-[#d83931]">{tocError}</p>
        )}

        {!tocLoading && (
          <TocTreeEditor
            items={tocItems}
            onChange={setTocItems}
            bookId="temp"
          />
        )}
      </section>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
        <Link
          href="/bookshelf"
          className="h-9 px-4 inline-flex items-center justify-center text-[13px] font-semibold text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          取消
        </Link>
        <button
          onClick={handleImport}
          disabled={!canImport || addBook.isPending}
          className="h-9 px-5 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {addBook.isPending ? "导入中..." : "导入书籍"}
        </button>
      </div>
    </div>
  )
}
