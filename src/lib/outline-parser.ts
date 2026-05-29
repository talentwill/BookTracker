import { v4 as uuid } from "uuid"
import type { TocItem } from "./types"

function detectIndentSize(lines: string[]): number {
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "    ")
    const match = line.match(/^(\s+)/)
    if (match) return match[1].length === 4 ? 4 : 2
  }
  return 2
}

export function parseOutline(text: string, bookId: string): TocItem[] {
  const items: TocItem[] = []
  const lines = text.split("\n")
  const stack: Array<{ level: number; id: string }> = []
  const orderCounter: Record<string, number> = {}

  // Normalize tabs to spaces
  const normalized = lines.map(l => l.replace(/\t/g, "    "))

  // Detect format: if any line matches "- " prefix, use outline mode
  const hasDashPrefix = normalized.some(l => /^[\t ]*-[ \t]/.test(l))
  const indentSize = detectIndentSize(lines)

  for (const line of normalized) {
    if (!line.trim()) continue

    let indent: number
    let title: string

    if (hasDashPrefix) {
      const match = line.match(/^(\s*)-[ \t](.+)$/)
      if (!match) continue
      indent = match[1].length
      title = match[2].trim()
    } else {
      const match = line.match(/^(\s*)(.+)$/)
      if (!match) continue
      indent = match[1].length
      title = match[2].trim()
    }

    if (!title) continue
    const level = Math.floor(indent / indentSize)

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null
    const parentKey = parentId ?? "__root__"
    if (orderCounter[parentKey] === undefined) orderCounter[parentKey] = 0

    const id = uuid()
    items.push({ id, book_id: bookId, parent_id: parentId, title, sort_order: orderCounter[parentKey]++ })
    stack.push({ level, id })
  }

  return items
}
