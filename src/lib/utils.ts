import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TocItem } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | number | Date): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function formatToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function buildTree(items: TocItem[]): Map<string | null, TocItem[]> {
  const childrenOf = new Map<string | null, TocItem[]>()
  for (const item of items) {
    const key = item.parent_id
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(item)
  }
  for (const children of childrenOf.values()) {
    children.sort((a, b) => a.sort_order - b.sort_order)
  }
  return childrenOf
}

export function getChapterStatus(
  scheduledDate: string | null,
  checked: boolean,
  today: string
): "done" | "today" | "tomorrow" | "scheduled" | "unscheduled" {
  if (checked) return "done"
  if (!scheduledDate) return "unscheduled"
  if (scheduledDate === today) return "today"
  const tomorrow = new Date(today + "T00:00:00")
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`
  if (scheduledDate === tomorrowStr) return "tomorrow"
  return "scheduled"
}
