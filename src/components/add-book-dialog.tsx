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
  const store = useBookStore()
  const router = useRouter()

  const canImport = title.trim().length > 0 && tocText.trim().length > 0

  function handleImport() {
    if (!canImport) return
    const bookId = store.addBook(title.trim(), authorName.trim(), tocText)
    setTitle("")
    setAuthorName("")
    setTocText("")
    onOpenChange(false)
    router.push("/books/" + bookId)
  }

  function handleCancel() {
    setTitle("")
    setAuthorName("")
    setTocText("")
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

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
              目录 <span className="text-[#a39e98]">*</span>
            </label>
            <Textarea
              value={tocText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTocText(e.target.value)}
              placeholder={`- 第一部分 基础\n\t- 第一章 概述\n\t- 第二章 入门\n- 第二部分 进阶\n\t- 第三章 实战`}
              className="min-h-[160px] font-mono text-[13px] border-[rgba(0,0,0,0.1)]"
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
