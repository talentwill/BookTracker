"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface NewRoundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  round_number: number
  onConfirm: (inheritSchedule: boolean) => void
}

export function NewRoundDialog({ open, onOpenChange, round_number, onConfirm }: NewRoundDialogProps) {
  const [inherit, setInherit] = useState(true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开始第 {round_number} 轮阅读</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-[13px] text-muted-foreground">是否继承上一轮的排期计划？</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setInherit(true)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                inherit ? "border-[#0075de] bg-[#f2f9ff]" : "border-border"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">继承排期</div>
              <div className="text-xs text-muted-foreground">保留上一轮的计划日期，在此基础上调整</div>
            </button>
            <button
              onClick={() => setInherit(false)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                !inherit ? "border-[#0075de] bg-[#f2f9ff]" : "border-border"
              }`}
            >
              <div className="text-sm font-semibold text-foreground">清空重来</div>
              <div className="text-xs text-muted-foreground">所有章节重置为未排期，重新规划阅读计划</div>
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button className="bg-[#0075de] hover:bg-[#005bab]" onClick={() => { onConfirm(inherit); onOpenChange(false) }}>
            开始新一轮
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
