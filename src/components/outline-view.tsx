"use client"

import { useState } from "react"
import type { TocItem, ChapterStatus, ReadingRound } from "@/lib/types"
import { buildTree } from "@/lib/utils"
import { DatePickerDialog } from "@/components/date-picker-dialog"

interface OutlineViewProps {
  items: TocItem[]
  statuses: Map<string, ChapterStatus>
  round: ReadingRound
  onToggle: (tocItemId: string, checkedAt?: number) => void
}

export function OutlineView({ items, statuses, round, onToggle }: OutlineViewProps) {
  const tree = buildTree(items)
  const rootItems = tree.get(null) ?? []

  return (
    <div className="p-4 md:p-6">
      <div className="leading-8">
        {rootItems.map(item => (
          <OutlineNode
            key={item.id}
            item={item}
            tree={tree}
            statuses={statuses}
            onToggle={onToggle}
            depth={0}
          />
        ))}
      </div>
    </div>
  )
}

function OutlineNode({
  item,
  tree,
  statuses,
  onToggle,
  depth,
}: {
  item: TocItem
  tree: Map<string | null, TocItem[]>
  statuses: Map<string, ChapterStatus>
  onToggle: (tocItemId: string, checkedAt?: number) => void
  depth: number
}) {
  const status = statuses.get(item.id)
  const checked = status?.checked ?? false
  const children = tree.get(item.id) ?? []
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleDateConfirm = (date: string) => {
    const timestamp = new Date(date + "T12:00:00").getTime()
    onToggle(item.id, timestamp)
  }

  return (
    <>
      <div
        className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-[rgba(0,0,0,0.02)]"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <span className={`text-sm ${checked ? "text-[#1aae39]" : "text-[#a39e98]"}`}>
          {checked ? "●" : "○"}
        </span>
        <span
          className={`flex-1 text-[13px] ${
            checked
              ? "text-[rgba(0,0,0,0.5)] line-through"
              : "text-[rgba(0,0,0,0.95)]"
          }`}
        >
          {item.title}
        </span>
        {checked ? (
          <button
            onClick={() => onToggle(item.id)}
            className="rounded bg-[#e6f9ee] px-3 py-0.5 text-[11px] font-semibold text-[#1aae39] hover:bg-[#d0f0dd]"
          >
            撤销
          </button>
        ) : (
          <button
            onClick={() => setDialogOpen(true)}
            className="rounded bg-[#f2f9ff] px-3 py-0.5 text-[11px] font-semibold text-[#097fe8] hover:bg-[#0075de] hover:text-white"
          >
            已读
          </button>
        )}
      </div>
      <DatePickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleDateConfirm}
      />
      {children.map(child => (
        <OutlineNode
          key={child.id}
          item={child}
          tree={tree}
          statuses={statuses}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </>
  )
}
