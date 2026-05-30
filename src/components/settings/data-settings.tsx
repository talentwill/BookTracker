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

      const [booksRes, chaptersRes, notesRes] = await Promise.all([
        supabase.from("books").select("*").eq("user_id", user.id),
        supabase.from("chapters").select("*").eq("user_id", user.id),
        supabase.from("notes").select("*").eq("user_id", user.id),
      ])

      if (booksRes.error) throw booksRes.error
      if (chaptersRes.error) throw chaptersRes.error
      if (notesRes.error) throw notesRes.error

      const data = {
        exported_at: new Date().toISOString(),
        books: booksRes.data ?? [],
        chapters: chaptersRes.data ?? [],
        notes: notesRes.data ?? [],
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

      const supabase = createClient()

      if (data.books.length > 0) {
        const booksWithUser = data.books.map((b: Record<string, unknown>) => ({ ...b, user_id: user.id }))
        const { error } = await supabase.from("books").upsert(booksWithUser, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.chapters) && data.chapters.length > 0) {
        const chaptersWithUser = data.chapters.map((c: Record<string, unknown>) => ({ ...c, user_id: user.id }))
        const { error } = await supabase.from("chapters").upsert(chaptersWithUser, { onConflict: "id" })
        if (error) throw error
      }

      if (Array.isArray(data.notes) && data.notes.length > 0) {
        const notesWithUser = data.notes.map((n: Record<string, unknown>) => ({ ...n, user_id: user.id }))
        const { error } = await supabase.from("notes").upsert(notesWithUser, { onConflict: "id" })
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
        <p className="text-[13px] text-muted-foreground mb-3">将所有书籍、章节和笔记导出为 JSON 文件</p>
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
