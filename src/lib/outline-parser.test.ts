import { describe, it, expect } from "vitest"
import { parseOutline } from "./outline-parser"

describe("parseOutline", () => {
  const bookId = "test-book-id"

  it("parses flat list with dash prefix", () => {
    const text = `- Chapter 1
- Chapter 2
- Chapter 3`
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(3)
    expect(items[0].title).toBe("Chapter 1")
    expect(items[1].title).toBe("Chapter 2")
    expect(items[2].title).toBe("Chapter 3")
    expect(items.every(i => i.parent_id === null)).toBe(true)
  })

  it("parses nested list with dash prefix", () => {
    const text = `- Chapter 1
  - Section 1.1
  - Section 1.2
- Chapter 2`
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(4)
    const ch1 = items.find(i => i.title === "Chapter 1")!
    const s11 = items.find(i => i.title === "Section 1.1")!
    const s12 = items.find(i => i.title === "Section 1.2")!
    expect(ch1.parent_id).toBeNull()
    expect(s11.parent_id).toBe(ch1.id)
    expect(s12.parent_id).toBe(ch1.id)
  })

  it("parses indented list without dash prefix", () => {
    const text = `Chapter 1
  Section 1.1
  Section 1.2
Chapter 2`
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(4)
    const ch1 = items.find(i => i.title === "Chapter 1")!
    const s11 = items.find(i => i.title === "Section 1.1")!
    expect(s11.parent_id).toBe(ch1.id)
  })

  it("assigns correct sort_order", () => {
    const text = `- A
- B
- C`
    const items = parseOutline(text, bookId)
    expect(items[0].sort_order).toBe(0)
    expect(items[1].sort_order).toBe(1)
    expect(items[2].sort_order).toBe(2)
  })

  it("assigns book_id to all items", () => {
    const text = `- A
- B`
    const items = parseOutline(text, bookId)
    expect(items.every(i => i.book_id === bookId)).toBe(true)
  })

  it("generates unique ids", () => {
    const text = `- A
- B`
    const items = parseOutline(text, bookId)
    expect(items[0].id).not.toBe(items[1].id)
  })

  it("skips empty lines", () => {
    const text = `- A

- B

`
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(2)
  })

  it("handles deep nesting with 4-space indent", () => {
    const text = `- L0
    - L1
        - L2`
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(3)
    const l0 = items.find(i => i.title === "L0")!
    const l1 = items.find(i => i.title === "L1")!
    const l2 = items.find(i => i.title === "L2")!
    expect(l0.parent_id).toBeNull()
    expect(l1.parent_id).toBe(l0.id)
    expect(l2.parent_id).toBe(l1.id)
  })

  it("handles tabs converted to spaces", () => {
    const text = "- A\n\t- B\n\t\t- C"
    const items = parseOutline(text, bookId)
    expect(items).toHaveLength(3)
    const a = items.find(i => i.title === "A")!
    const b = items.find(i => i.title === "B")!
    const c = items.find(i => i.title === "C")!
    expect(b.parent_id).toBe(a.id)
    expect(c.parent_id).toBe(b.id)
  })

  it("returns empty array for empty input", () => {
    expect(parseOutline("", bookId)).toEqual([])
  })

  it("resets parent correctly when nesting decreases", () => {
    const text = `- A
  - A.1
- B
  - B.1`
    const items = parseOutline(text, bookId)
    const a = items.find(i => i.title === "A")!
    const a1 = items.find(i => i.title === "A.1")!
    const b = items.find(i => i.title === "B")!
    const b1 = items.find(i => i.title === "B.1")!
    expect(a.parent_id).toBeNull()
    expect(a1.parent_id).toBe(a.id)
    expect(b.parent_id).toBeNull()
    expect(b1.parent_id).toBe(b.id)
  })
})
