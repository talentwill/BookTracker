"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { useAIConfigStore } from "@/lib/ai-config-store"
import { parseOutline } from "@/lib/outline-parser"
import { TocTreeEditor } from "@/components/toc-tree-editor"
import type { TocItem } from "@/lib/types"

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX_WIDTH = 400
        const ratio = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.7))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AddBookPage() {
  const router = useRouter()
  const store = useBookStore()
  const aiConfig = useAIConfigStore()

  const [doubanUrl, setDoubanUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [publisher, setPublisher] = useState("")
  const [publishDate, setPublishDate] = useState("")
  const [isbn, setIsbn] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [customCover, setCustomCover] = useState<string | null>(null)

  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [tocRawText, setTocRawText] = useState("")
  const [tocLoading, setTocLoading] = useState(false)
  const [tocError, setTocError] = useState<string | null>(null)
  const [showTocEditor, setShowTocEditor] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const canImport = title.trim().length > 0

  async function handleParse() {
    const trimmed = doubanUrl.trim()
    if (!trimmed) return
    if (!/douban\.com/.test(trimmed)) {
      setParseError("请输入有效的豆瓣链接")
      return
    }

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

        if (data.tocText) {
          await handleAiParse(data.tocText)
        }
      }
    } catch {
      setParseError("网络请求失败，请重试")
    } finally {
      setParsing(false)
    }
  }

  async function handleAiParse(text: string) {
    const provider = aiConfig.defaultProvider
    const config = aiConfig[provider]
    if (!config.apiKey) {
      setTocError(`请先在设置页面配置 ${provider === "claude" ? "Claude" : "OpenAI"} API Key`)
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
          provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
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
      setShowTocEditor(true)
    } catch (err: unknown) {
      setTocError(err instanceof Error ? err.message : "AI 整理失败")
      setTocRawText(text)
    } finally {
      setTocLoading(false)
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setCustomCover(compressed)
    } catch {
      // silently fail
    }
  }

  function handleImport() {
    if (!canImport) return

    const effectiveCover = customCover || coverUrl || undefined
    const meta: { publisher?: string; publishDate?: string; isbn?: string; coverUrl?: string } = {}
    if (publisher.trim()) meta.publisher = publisher.trim()
    if (publishDate.trim()) meta.publishDate = publishDate.trim()
    if (isbn.trim()) meta.isbn = isbn.trim()
    if (effectiveCover) meta.coverUrl = effectiveCover

    const tocText = tocItems.length > 0
      ? tocItems.map(i => `${"  ".repeat(getDepth(tocItems, i.id))}- ${i.title}`).join("\n")
      : tocRawText.trim()

    const bookId = store.addBook(
      title.trim(),
      authorName.trim() || "未知作者",
      tocText,
      Object.keys(meta).length > 0 ? meta : undefined
    )

    if (bookId) {
      if (tocItems.length > 0) {
        const realItems = parseOutline(tocText, bookId)
        store.replaceBookToc(bookId, realItems)
      }
      router.push("/books/" + bookId)
    } else {
      router.push("/bookshelf")
    }
  }

  function getDepth(items: TocItem[], id: string): number {
    const map = new Map(items.map(i => [i.id, i]))
    let depth = 0
    let current = map.get(id)
    while (current?.parentId) {
      depth++
      current = map.get(current.parentId)
    }
    return depth
  }

  const displayCover = customCover || coverUrl

  return (
    <div className="mx-auto max-w-2xl px-6 py-5">
      <Link href="/bookshelf" className="mb-4 inline-block text-sm text-[#0075de] hover:underline">
        &larr; 返回书架
      </Link>

      <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)] mb-6">添加书籍</h1>

      {/* Section 1: Douban Import */}
      <section className="mb-6">
        <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)] block mb-1.5">
          豆瓣链接
        </label>
        <div className="flex gap-2">
          <input
            value={doubanUrl}
            onChange={e => setDoubanUrl(e.target.value)}
            placeholder="https://book.douban.com/subject/..."
            className="flex-1 h-9 px-3 border border-[rgba(0,0,0,0.1)] rounded-md text-[13px] outline-none focus:border-[#0075de]"
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

      <div className="border-t border-[rgba(0,0,0,0.06)] mb-6" />

      {/* Section 2: Book Info */}
      <section className="mb-6">
        <div className="flex gap-4">
          {/* Cover */}
          <div
            className="relative w-[120px] h-[168px] shrink-0 rounded-lg overflow-hidden border border-[rgba(0,0,0,0.1)] bg-[linear-gradient(135deg,#f6f5f4,#e8e5e0)] group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayCover ? (
              <img
                src={displayCover}
                alt="封面"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
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
              <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)] block mb-1">
                书名 <span className="text-[#a39e98]">*</span>
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="输入书名"
                className="w-full h-9 px-3 border border-[rgba(0,0,0,0.1)] rounded-md text-[13px] outline-none focus:border-[#0075de]"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)] block mb-1">
                作者
              </label>
              <input
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="输入作者名"
                className="w-full h-9 px-3 border border-[rgba(0,0,0,0.1)] rounded-md text-[13px] outline-none focus:border-[#0075de]"
              />
            </div>
          </div>
        </div>

        {/* Metadata row */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">出版社</label>
            <input
              value={publisher}
              onChange={e => setPublisher(e.target.value)}
              placeholder="出版社"
              className="w-full h-8 px-2.5 border border-[rgba(0,0,0,0.1)] rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">出版日期</label>
            <input
              value={publishDate}
              onChange={e => setPublishDate(e.target.value)}
              placeholder="2024-01"
              className="w-full h-8 px-2.5 border border-[rgba(0,0,0,0.1)] rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">ISBN</label>
            <input
              value={isbn}
              onChange={e => setIsbn(e.target.value)}
              placeholder="978-..."
              className="w-full h-8 px-2.5 border border-[rgba(0,0,0,0.1)] rounded-md text-[12px] outline-none focus:border-[#0075de]"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-[rgba(0,0,0,0.06)] mb-6" />

      {/* Section 3: TOC */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
            目录 <span className="text-[#9b958e] text-[12px] font-normal">(可选)</span>
          </label>
          {!showTocEditor && !tocLoading && (
            <button
              onClick={() => {
                if (tocRawText.trim()) {
                  handleAiParse(tocRawText)
                }
              }}
              disabled={!tocRawText.trim()}
              className="text-[12px] font-semibold text-[#0075de] hover:text-[#005bab] disabled:text-[#c5bfb8] disabled:cursor-not-allowed cursor-pointer"
            >
              ✨ AI 整理
            </button>
          )}
        </div>

        {tocLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-[13px] text-[#615d59]">
            <div className="w-4 h-4 border-2 border-[#0075de] border-t-transparent rounded-full animate-spin" />
            AI 整理中...
          </div>
        )}

        {tocError && !tocLoading && (
          <p className="mb-2 text-[12px] text-[#d83931]">{tocError}</p>
        )}

        {showTocEditor && !tocLoading ? (
          <TocTreeEditor
            items={tocItems}
            onChange={setTocItems}
            bookId="temp"
          />
        ) : !tocLoading ? (
          <div>
            <textarea
              value={tocRawText}
              onChange={e => setTocRawText(e.target.value)}
              placeholder={"粘贴目录文本，然后点击「AI 整理」自动格式化\n\n支持各种格式，AI 会自动识别并整理成标准大纲"}
              className="w-full min-h-[120px] px-3 py-2 border border-[rgba(0,0,0,0.1)] rounded-md text-[13px] font-mono outline-none focus:border-[#0075de] resize-y"
            />
            <p className="mt-1.5 text-[11px] text-[#9b958e]">目录为可选，可稍后在编辑页添加</p>
          </div>
        ) : null}
      </section>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-3 border-t border-[rgba(0,0,0,0.06)] pt-5">
        <Link
          href="/bookshelf"
          className="h-9 px-4 inline-flex items-center justify-center text-[13px] font-semibold text-[#615d59] hover:bg-[#f6f5f4] rounded-md transition-colors"
        >
          取消
        </Link>
        <button
          onClick={handleImport}
          disabled={!canImport}
          className="h-9 px-5 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          导入书籍
        </button>
      </div>
    </div>
  )
}
