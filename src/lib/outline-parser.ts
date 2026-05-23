import { v4 as uuid } from "uuid"
import type { TocItem } from "./types"

export function parseOutline(text: string, bookId: string): TocItem[] {
  const items: TocItem[] = []
  const lines = text.split("\n")
  const stack: Array<{ level: number; id: string }> = []
  let orderCounter: Record<string, number> = {}

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue
    const line = rawLine.replace(/\t/g, "  ")
    const match = line.match(/^(\s*)- (.+)$/)
    if (!match) continue
    const indent = match[1].length
    const level = Math.floor(indent / 2)
    const title = match[2].trim()
    if (!title) continue

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
    const parentKey = parentId ?? "__root__"
    if (orderCounter[parentKey] === undefined) orderCounter[parentKey] = 0

    const id = uuid()
    items.push({ id, bookId, parentId, title, order: orderCounter[parentKey]++ })
    stack.push({ level, id })
  }

  return items
}
