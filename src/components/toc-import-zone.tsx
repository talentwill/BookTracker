"use client"

import { useState } from "react"
import { useProfile } from "@/lib/hooks/use-profile"
import { parseOutline } from "@/lib/outline-parser"
import type { TocItem } from "@/lib/types"

interface TocImportZoneProps {
  bookId: string
  onImport: (items: TocItem[]) => void
}

export function TocImportZone({ bookId, onImport }: TocImportZoneProps) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: profile } = useProfile()

  async function handleImport() {
    if (!text.trim()) return

    if (!profile?.ai_api_key) {
      setError("请先在设置页面配置 AI API Key")
      return
    }

    setLoading(true)
    setError(null)

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
        const data = await res.json()
        throw new Error(data.error || `请求失败 (${res.status})`)
      }

      const data = await res.json()
      const items = parseOutline(data.outline, bookId)

      if (items.length === 0) {
        throw new Error("AI 返回的内容无法解析为目录，请检查原始文本")
      }

      onImport(items)
      setText("")
      setExpanded(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "导入失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-[#f5d6a3] rounded-lg bg-[#fef3e0] mb-3 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer"
      >
        <span className="text-[12px] font-semibold text-[#b55a00]">📥 粘贴目录文本</span>
        <span className="text-[#b55a00] text-[12px]">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="粘贴从豆瓣、书籍目录页等获取的目录文本，AI 会自动整理成标准格式..."
            className="w-full h-24 border border-border rounded-md px-3 py-2 text-[12px] font-mono resize-none outline-none bg-background focus:border-[#0075de]"
          />

          {error && (
            <p className="mt-1.5 text-[12px] text-[#d83931]">{error}</p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">将替换当前目录内容</span>
            <button
              onClick={handleImport}
              disabled={loading || !text.trim()}
              className="bg-[#0075de] text-white border-none rounded-md px-3 py-1.5 text-[12px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#005bab]"
            >
              {loading ? "AI 整理中..." : "AI 整理并导入"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
