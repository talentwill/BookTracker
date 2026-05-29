"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DatePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  initialDate?: string
  onConfirm: (date: string) => void
}

function formatToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DatePickerDialog({
  open,
  onOpenChange,
  title = "选择打卡日期",
  initialDate,
  onConfirm,
}: DatePickerDialogProps) {
  const [date, setDate] = useState(initialDate ?? formatToday())

  useEffect(() => {
    if (open) {
      setDate(initialDate ?? formatToday())
    }
  }, [open, initialDate])

  const handleConfirm = useCallback(() => {
    onConfirm(date)
    onOpenChange(false)
  }, [date, onConfirm, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleConfirm()
      }
    },
    [handleConfirm]
  )

  const quickDates = [
    { label: "今天", offset: 0 },
    { label: "昨天", offset: -1 },
    { label: "前天", offset: -2 },
  ]

  const setQuickDate = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    setDate(`${y}-${m}-${day}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex gap-2">
            {quickDates.map(q => (
              <button
                key={q.label}
                type="button"
                onClick={() => setQuickDate(q.offset)}
                className="rounded-full bg-[rgba(0,0,0,0.05)] px-3 py-1 text-xs font-medium text-[#615d59] hover:bg-[#0075de] hover:text-white transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-lg border border-[rgba(0,0,0,0.15)] bg-white px-3 py-2 text-sm text-[rgba(0,0,0,0.95)] outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de]"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-[rgba(0,0,0,0.1)] pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="bg-[#0075de] hover:bg-[#005bab]"
            onClick={handleConfirm}
          >
            确认
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
