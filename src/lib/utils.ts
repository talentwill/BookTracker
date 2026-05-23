import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TocItem } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(new Date(timestamp))
}

export function formatToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function buildTree(items: TocItem[]): Map<string | null, TocItem[]> {
  const childrenOf = new Map<string | null, TocItem[]>()
  for (const item of items) {
    const key = item.parentId
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(item)
  }
  for (const children of childrenOf.values()) {
    children.sort((a, b) => a.order - b.order)
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
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (scheduledDate === tomorrow.toISOString().slice(0, 10)) return "tomorrow"
  return "scheduled"
}
