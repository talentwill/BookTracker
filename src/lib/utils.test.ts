import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cn, formatDate, formatToday, buildTree, getChapterStatus } from "./utils"
import type { TocItem } from "./types"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra")
  })
})

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-05-30")
    expect(result).toMatch(/05[/月]30/)
  })

  it("formats a timestamp", () => {
    const ts = new Date("2026-01-15").getTime()
    const result = formatDate(ts)
    expect(result).toMatch(/01[/月]15/)
  })
})

describe("formatToday", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = formatToday()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("returns today's date", () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    expect(formatToday()).toBe(expected)
  })
})

describe("buildTree", () => {
  it("groups root items under null key", () => {
    const items: TocItem[] = [
      { id: "1", book_id: "b1", parent_id: null, title: "Chapter 1", sort_order: 0 },
      { id: "2", book_id: "b1", parent_id: null, title: "Chapter 2", sort_order: 1 },
    ]
    const tree = buildTree(items)
    expect(tree.get(null)).toHaveLength(2)
    expect(tree.get(null)![0].title).toBe("Chapter 1")
  })

  it("groups children under parent id", () => {
    const items: TocItem[] = [
      { id: "1", book_id: "b1", parent_id: null, title: "Chapter 1", sort_order: 0 },
      { id: "2", book_id: "b1", parent_id: "1", title: "Section 1.1", sort_order: 0 },
      { id: "3", book_id: "b1", parent_id: "1", title: "Section 1.2", sort_order: 1 },
    ]
    const tree = buildTree(items)
    expect(tree.get(null)).toHaveLength(1)
    expect(tree.get("1")).toHaveLength(2)
    expect(tree.get("1")![0].title).toBe("Section 1.1")
  })

  it("sorts children by sort_order", () => {
    const items: TocItem[] = [
      { id: "2", book_id: "b1", parent_id: null, title: "B", sort_order: 1 },
      { id: "1", book_id: "b1", parent_id: null, title: "A", sort_order: 0 },
    ]
    const tree = buildTree(items)
    expect(tree.get(null)![0].title).toBe("A")
    expect(tree.get(null)![1].title).toBe("B")
  })

  it("handles empty items", () => {
    const tree = buildTree([])
    expect(tree.size).toBe(0)
  })

  it("handles deep nesting", () => {
    const items: TocItem[] = [
      { id: "1", book_id: "b1", parent_id: null, title: "L0", sort_order: 0 },
      { id: "2", book_id: "b1", parent_id: "1", title: "L1", sort_order: 0 },
      { id: "3", book_id: "b1", parent_id: "2", title: "L2", sort_order: 0 },
    ]
    const tree = buildTree(items)
    expect(tree.get(null)).toHaveLength(1)
    expect(tree.get("1")).toHaveLength(1)
    expect(tree.get("2")).toHaveLength(1)
  })
})

describe("getChapterStatus", () => {
  const today = "2026-05-30"

  it("returns 'done' when checked", () => {
    expect(getChapterStatus("2026-05-30", true, today)).toBe("done")
  })

  it("returns 'done' regardless of date when checked", () => {
    expect(getChapterStatus(null, true, today)).toBe("done")
  })

  it("returns 'unscheduled' when no date and not checked", () => {
    expect(getChapterStatus(null, false, today)).toBe("unscheduled")
  })

  it("returns 'today' when scheduled date matches today", () => {
    expect(getChapterStatus("2026-05-30", false, today)).toBe("today")
  })

  it("returns 'tomorrow' when scheduled date is tomorrow", () => {
    expect(getChapterStatus("2026-05-31", false, today)).toBe("tomorrow")
  })

  it("returns 'scheduled' for future dates beyond tomorrow", () => {
    expect(getChapterStatus("2026-06-15", false, today)).toBe("scheduled")
  })

  it("returns 'scheduled' for past dates", () => {
    expect(getChapterStatus("2026-05-01", false, today)).toBe("scheduled")
  })

  it("handles month boundary for tomorrow", () => {
    expect(getChapterStatus("2026-06-01", false, "2026-05-31")).toBe("tomorrow")
  })

  it("handles year boundary for tomorrow", () => {
    expect(getChapterStatus("2027-01-01", false, "2026-12-31")).toBe("tomorrow")
  })
})
