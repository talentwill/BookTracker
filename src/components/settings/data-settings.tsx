"use client"

import { useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

export function DataSettings() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleExport() {
    if (!user) return
    setExporting(true)
    setMessage(null)

    try {
      const supabase = createClient()

      const [authorsRes, booksRes] = await Promise.all([
        supabase.from("authors").select("*").eq("user_id", user.id),
        supabase.from("books").select("*").eq("user_id", user.id),
      ])

      if (authorsRes.error) throw authorsRes.error
      if (booksRes.error) throw booksRes.error

      const userBookIds = (booksRes.data ?? []).map(b => b.id)

      const [tocItemsRes, roundsRes] = await Promise.all([
        userBookIds.length > 0 ? supabase.from("toc_items").select("*").in("book_id", userBookIds) : Promise.resolve({ data: [], error: null }),
        userBookIds.length > 0 ? supabase.from("reading_rounds").select("*").in("book_id", userBookIds) : Promise.resolve({ data: [], error: null }),
      ])

      if (tocItemsRes.error) throw tocItemsRes.error
      if (roundsRes.error) throw roundsRes.error

      const tocItemIds = (tocItemsRes.data ?? []).map(t => t.id)
      const roundIds = (roundsRes.data ?? []).map(r => r.id)

      let statusesData: unknown[] = []
      if (tocItemIds.length > 0 && roundIds.length > 0) {
        const { data, error } = await supabase.from("chapter_statuses").select("*").in("toc_item_id", tocItemIds)
        if (error) throw error
        statusesData = data ?? []
      }

      const data = {
        exported_at: new Date().toISOString(),
        authors: authorsRes.data ?? [],
        books: booksRes.data ?? [],
        toc_items: tocItemsRes.data ?? [],
        reading_rounds: roundsRes.data ?? [],
        chapter_statuses: statusesData,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `booktracker-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMessage({ type: "success", text: "导出成功" })
    } catch (err) {
      setMessage({ type: "error", text: `导出失败: ${err instanceof Error ? err.message : "未知错误"}` })
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setImporting(true)
    setMessage(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data.books)) {
        throw new Error("无效的 JSON 文件: 缺少 books 数组")
      }

      const hasNewFormat = Array.isArray(data.toc_items) || Array.isArray(data.reading_rounds) || Array.isArray(data.chapter_statuses)
      const hasOldFormat = Array.isArray(data.chapters) || Array.isArray(data.notes)
      if (data.books.length === 0 && !hasNewFormat) {
        throw new Error("JSON 文件中没有可导入的数据")
      }
      if (hasOldFormat && !hasNewFormat) {
        throw new Error("此文件为旧版导出格式，新版导入不支持 chapters/notes 字段。请先升级到最新版重新导出")
      }

      const supabase = createClient()

      if (data.books.length > 0) {
        const booksWithUser = data.books.map((b: Record<string, unknown>) => ({ ...b, user_id: user.id }))
        const { error } = await supabase.from("books").upsert(booksWithUser, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.authors) && data.authors.length > 0) {
        const authorsWithUser = data.authors.map((a: Record<string, unknown>) => ({ ...a, user_id: user.id }))
        const { error } = await supabase.from("authors").upsert(authorsWithUser, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.toc_items) && data.toc_items.length > 0) {
        const { error } = await supabase.from("toc_items").upsert(data.toc_items, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.reading_rounds) && data.reading_rounds.length > 0) {
        const { error } = await supabase.from("reading_rounds").upsert(data.reading_rounds, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.chapter_statuses) && data.chapter_statuses.length > 0) {
        const { error } = await supabase.from("chapter_statuses").upsert(data.chapter_statuses, { onConflict: "toc_item_id,round_id" })
        if (error) throw error
      }

      setMessage({ type: "success", text: "导入成功" })
    } catch (err) {
      setMessage({ type: "error", text: `导入失败: ${err instanceof Error ? err.message : "未知错误"}` })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-1">导出数据</h2>
        <p className="text-[13px] text-muted-foreground mb-3">将所有书籍、目录和阅读进度导出为 JSON 文件</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-[#0075de] text-white border-none rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#005bab] disabled:opacity-50"
        >
          {exporting ? "导出中..." : "导出全部数据"}
        </button>
      </div>

      <div className="border-t border-border" />

      {/* Import */}
      <div>
        <h2 className="text-[14px] font-semibold text-foreground mb-1">导入数据</h2>
        <p className="text-[13px] text-muted-foreground mb-3">从 JSON 文件导入数据（已有数据会被更新）</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <label
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center bg-background border border-input rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer hover:border-foreground/30 transition-colors"
        >
          {importing ? "导入中..." : "选择文件"}
        </label>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-[13px] ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
