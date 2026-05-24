"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBookStore } from "@/lib/store"

interface AddBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddBookDialog({ open, onOpenChange }: AddBookDialogProps) {
  const [title, setTitle] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [tocText, setTocText] = useState("")
  const [doubanUrl, setDoubanUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{
    publisher?: string
    publishDate?: string
    isbn?: string
  } | null>(null)
  const store = useBookStore()
  const router = useRouter()

  const canImport = title.trim().length > 0 && tocText.trim().length > 0

  async function handleParse() {
    const trimmed = doubanUrl.trim()
    if (!trimmed) return
    if (!/douban\.com/.test(trimmed)) {
      setParseError("请输入有效的豆瓣链接")
      return
    }

    setParsing(true)
    setParseError(null)
    setMeta(null)
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
        setMeta({
          publisher: data.publisher,
          publishDate: data.publishDate,
          isbn: data.isbn,
        })
      }
    } catch {
      setParseError("网络请求失败，请重试")
    } finally {
      setParsing(false)
    }
  }

  function handleImport() {
    if (!canImport) return
    const bookId = store.addBook(title.trim(), authorName.trim() || "未知作者", tocText, meta ?? undefined)
    setTitle("")
    setAuthorName("")
    setTocText("")
    setDoubanUrl("")
    setParseError(null)
    setMeta(null)
    onOpenChange(false)
    if (bookId) {
      router.push("/books/" + bookId)
    } else {
      router.push("/bookshelf")
    }
  }

  function handleCancel() {
    setTitle("")
    setAuthorName("")
    setTocText("")
    setDoubanUrl("")
    setParseError(null)
    setMeta(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[rgba(0,0,0,0.95)] text-base">
            添加书籍
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-1">
          {/* Douban import */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
              豆瓣链接
            </label>
            <div className="flex gap-2">
              <Input
                value={doubanUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoubanUrl(e.target.value)}
                placeholder="https://book.douban.com/subject/..."
                className="border-[rgba(0,0,0,0.1)] flex-1"
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") handleParse() }}
              />
              <Button
                onClick={handleParse}
                disabled={parsing || !doubanUrl.trim()}
                className="shrink-0 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white"
              >
                {parsing ? "解析中..." : "解析"}
              </Button>
            </div>
            {parseError && (
              <p className="text-[12px] text-[#d83931]">{parseError}</p>
            )}
          </div>

          <div className="border-t border-[rgba(0,0,0,0.08)]" />

          {/* Manual fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
              书名 <span className="text-[#a39e98]">*</span>
            </label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="输入书名"
              className="border-[rgba(0,0,0,0.1)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
              作者
            </label>
            <Input
              value={authorName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthorName(e.target.value)}
              placeholder="输入作者名"
              className="border-[rgba(0,0,0,0.1)]"
            />
          </div>

          {/* Metadata display (read-only) */}
          {meta && (meta.publisher || meta.publishDate || meta.isbn) && (
            <div className="rounded-lg bg-[#f6f5f4] px-3 py-2 text-[12px] text-[#615d59] space-y-0.5">
              {meta.publisher && <p>出版社：{meta.publisher}</p>}
              {meta.publishDate && <p>出版日期：{meta.publishDate}</p>}
              {meta.isbn && <p>ISBN：{meta.isbn}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
              目录 <span className="text-[#a39e98]">*</span>
            </label>
            <Textarea
              value={tocText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTocText(e.target.value)}
              placeholder={"粘贴目录文本，支持两种格式：\n\n- 第一部分 基础\n\t- 第一章 概述\n\t- 第二章 入门\n- 第二部分 进阶\n\t- 第三章 实战\n\n或纯缩进文本：\n第一部分 基础\n\t第一章 概述\n\t第二章 入门\n第二部分 进阶\n\t第三章 实战"}
              className="min-h-[160px] font-mono text-[13px] border-[rgba(0,0,0,0.1)]"
              style={{ tabSize: 4 }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel} className="text-[13px] font-semibold text-[#615d59]">
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
            className="text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white"
          >
            导入书籍
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
