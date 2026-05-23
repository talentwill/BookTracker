"use client"

import { useState } from "react"
import type { TocItem, ChapterStatus, ReadingRound } from "@/lib/types"
import { formatToday, formatDate, getChapterStatus } from "@/lib/utils"

interface TableViewProps {
  items: TocItem[]
  statuses: Map<string, ChapterStatus>
  round: ReadingRound
  onSchedule: (tocItemId: string, date: string | null) => void
  onMarkDone: (tocItemId: string) => void
}

type Filter = "all" | "today" | "tomorrow" | "unscheduled" | "done"

export function TableView({ items, statuses, round, onSchedule, onMarkDone }: TableViewProps) {
  const [filter, setFilter] = useState<Filter>("all")
  const today = formatToday()

  const allRows = items.map(item => {
    const status = statuses.get(item.id)
    const chapterStatus = getChapterStatus(status?.scheduledDate ?? null, status?.checked ?? false, today)
    const depth = getDepth(items, item.id)
    return { item, status, chapterStatus, depth }
  })

  const filteredRows = allRows.filter(r => {
    if (filter === "all") return true
    return r.chapterStatus === filter
  })

  const filters: { key: Filter; label: string; color: string }[] = [
    { key: "all", label: "全部", color: "bg-[#0075de] text-white" },
    { key: "today", label: "今天", color: "bg-[#f2f9ff] text-[#097fe8]" },
    { key: "tomorrow", label: "明天", color: "bg-[#f2f9ff] text-[#097fe8]" },
    { key: "unscheduled", label: "未排期", color: "bg-[#f2f9ff] text-[#097fe8]" },
    { key: "done", label: "已完成", color: "bg-[#e6f9ee] text-[#1aae39]" },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? f.color : "bg-[rgba(0,0,0,0.05)] text-[#615d59]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[rgba(0,0,0,0.1)]">
        <div className="flex gap-2 border-b border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] px-3 py-2 text-xs font-semibold text-[#615d59]">
          <span className="w-7" />
          <span className="flex-[2]">章节名称</span>
          <span className="flex-[0.7] text-center">状态</span>
          <span className="flex-[0.9] text-center">计划日期</span>
          <span className="flex-[1.3] text-center">操作</span>
        </div>
        {filteredRows.map(row => (
          <Row
            key={row.item.id}
            item={row.item}
            status={row.status}
            chapterStatus={row.chapterStatus}
            depth={row.depth}
            today={today}
            onSchedule={onSchedule}
            onMarkDone={onMarkDone}
          />
        ))}
        {filteredRows.length === 0 && (
          <div className="py-8 text-center text-sm text-[#a39e98]">没有匹配的章节</div>
        )}
      </div>
    </div>
  )
}

function Row({
  item, status, chapterStatus, depth, today, onSchedule, onMarkDone,
}: {
  item: TocItem
  status: ChapterStatus | undefined
  chapterStatus: ReturnType<typeof getChapterStatus>
  depth: number
  today: string
  onSchedule: (id: string, date: string | null) => void
  onMarkDone: (id: string) => void
}) {
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    done: { bg: "bg-[#e6f9ee]", text: "text-[#1aae39]", label: "已完成" },
    today: { bg: "bg-[#f2f9ff]", text: "text-[#097fe8]", label: "今天" },
    tomorrow: { bg: "bg-[#fff8ed]", text: "text-[#dd5b00]", label: "明天" },
    scheduled: { bg: "bg-[#f2f9ff]", text: "text-[#097fe8]", label: "已排期" },
    unscheduled: { bg: "bg-[rgba(0,0,0,0.05)]", text: "text-[#615d59]", label: "未排期" },
  }

  const badge = statusBadge[chapterStatus]
  const isDone = chapterStatus === "done"

  return (
    <div
      className={`flex items-center gap-2 border-b border-[rgba(0,0,0,0.05)] px-3 py-2 text-[13px] ${isDone ? "opacity-50" : ""}`}
      style={{ paddingLeft: `${depth * 20 + 12}px` }}
    >
      <span className={`w-7 text-center text-sm ${isDone ? "text-[#1aae39]" : "text-[#a39e98]"}`}>
        {isDone ? "✓" : "○"}
      </span>
      <span className={`flex-[2] ${isDone ? "line-through" : ""} ${depth === 0 && !isDone ? "font-medium" : ""}`}>
        {item.title}
      </span>
      <span className="flex-[0.7] text-center">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </span>
      <span className="flex-[0.9] text-center text-xs text-[#a39e98]">
        {isDone && status?.checkedAt
          ? formatDate(status.checkedAt)
          : status?.scheduledDate
            ? status.scheduledDate === today ? "今天" : status.scheduledDate === tomorrowStr ? "明天" : status.scheduledDate
            : "—"}
      </span>
      <span className="flex flex-[1.3] justify-center gap-1">
        {isDone ? (
          <span className="text-[11px] text-[#a39e98]">{formatDate(status!.checkedAt!)}</span>
        ) : chapterStatus === "unscheduled" ? (
          <>
            <button onClick={() => onSchedule(item.id, today)} className="rounded bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[11px] font-semibold text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]">今天读</button>
            <button onClick={() => onSchedule(item.id, tomorrowStr)} className="rounded bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[11px] font-semibold text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]">明天读</button>
            <button onClick={() => onMarkDone(item.id)} className="rounded bg-[#0075de] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#005bab]">读完</button>
          </>
        ) : (
          <>
            <button onClick={() => onMarkDone(item.id)} className="rounded bg-[#0075de] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#005bab]">读完</button>
            <button onClick={() => onSchedule(item.id, null)} className="rounded bg-[rgba(0,0,0,0.05)] px-2 py-0.5 text-[11px] text-[#615d59] hover:bg-[rgba(0,0,0,0.08)]">改期</button>
          </>
        )}
      </span>
    </div>
  )
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
