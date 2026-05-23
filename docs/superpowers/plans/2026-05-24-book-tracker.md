# BookTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a book chapter tracking web app with Notion-style UI, supporting outline import, chapter check-off, multi-round reading, and GTD scheduling.

**Architecture:** Next.js App Router with TypeScript. Zustand store with localStorage persistence. Data model: Author → Book → TocItem (tree), ReadingRound → ChapterStatus. Five pages (Dashboard, Bookshelf, Author List, Author Detail, Book Detail) + two modals (Add Book, New Round). Notion design language applied via Tailwind + shadcn/ui.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, uuid

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout with nav bar
│   ├── page.tsx                            # Dashboard (homepage)
│   ├── bookshelf/
│   │   └── page.tsx                        # Book grid with filters
│   ├── authors/
│   │   ├── page.tsx                        # Author list
│   │   └── [id]/
│   │       └── page.tsx                    # Author detail
│   └── books/
│       └── [id]/
│           └── page.tsx                    # Book detail (outline + table tabs)
├── components/
│   ├── navbar.tsx                          # Top navigation bar
│   ├── book-card.tsx                       # Book card for grid
│   ├── author-card.tsx                     # Author card for list
│   ├── outline-view.tsx                   # Tree outline with checkmarks
│   ├── table-view.tsx                     # Table with GTD scheduling
│   ├── add-book-dialog.tsx                # Modal: add book form
│   ├── new-round-dialog.tsx               # Modal: start new round
│   ├── today-reading-list.tsx             # Today's chapters for dashboard
│   ├── stat-card.tsx                      # Stat card for dashboard
│   └── round-selector.tsx                 # Round picker for book detail
├── lib/
│   ├── store.ts                            # Zustand store (state + actions)
│   ├── types.ts                            # All TypeScript interfaces
│   ├── outline-parser.ts                   # Markdown outline → TocItem[]
│   └── utils.ts                            # Helper functions (date, tree building)
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: project root config files (via CLI)
- Modify: none

- [ ] **Step 1: Scaffold Next.js project**

Run `create-next-app` in the parent directory, since the current directory already has git history and docs. We'll scaffold into a temp directory and move files.

```bash
cd /Users/willwu/_/Coding/demos/BookTracker
npx create-next-app@latest tmp-scaffold --typescript --tailwind --eslint --app --src-dir --no-turbopack --import-alias "@/*"
```

- [ ] **Step 2: Move scaffolded files into BookTracker root**

```bash
cp -r tmp-scaffold/src ./
cp tmp-scaffold/package.json ./
cp tmp-scaffold/tsconfig.json ./
cp tmp-scaffold/next.config.ts ./
cp tmp-scaffold/postcss.config.mjs ./
cp tmp-scaffold/components.json ./
cp -r tmp-scaffold/public ./
rm -rf tmp-scaffold
```

- [ ] **Step 3: Install dependencies**

```bash
npm install zustand uuid
npm install -D @types/uuid
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

Accept defaults (New York style, Zinc color, CSS variables). This creates `components.json` and `src/lib/utils.ts`.

- [ ] **Step 5: Add needed shadcn components**

```bash
npx shadcn@latest add button dialog input textarea badge tabs select
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Open http://localhost:3000 — should see default Next.js page.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js + shadcn/ui project"
```

---

### Task 2: Types and Data Store

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/store.ts`
- Create: `src/lib/utils.ts` (update the shadcn-generated one)

- [ ] **Step 1: Define TypeScript interfaces**

Create `src/lib/types.ts`:

```typescript
export interface Author {
  id: string
  name: string
  note?: string
  createdAt: number
}

export interface Book {
  id: string
  title: string
  authorId: string
  tocText: string
  createdAt: number
}

export interface TocItem {
  id: string
  bookId: string
  parentId: string | null
  title: string
  order: number
}

export interface ReadingRound {
  id: string
  bookId: string
  roundNumber: number
  startedAt: number
  status: 'active' | 'completed'
}

export interface ChapterStatus {
  tocItemId: string
  roundId: string
  checked: boolean
  checkedAt: number | null
  scheduledDate: string | null
}
```

- [ ] **Step 2: Add utility helpers**

Update `src/lib/utils.ts` — keep the existing `cn()` function from shadcn, add date and tree helpers:

```typescript
import { type ClassValue, clsx } from "clsx"
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

export function formatTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
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
```

- [ ] **Step 3: Create Zustand store**

Create `src/lib/store.ts`:

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import type { Author, Book, TocItem, ReadingRound, ChapterStatus } from "./types"
import { parseOutline } from "./outline-parser"

interface BookStore {
  authors: Author[]
  books: Book[]
  tocItems: TocItem[]
  rounds: ReadingRound[]
  chapterStatuses: ChapterStatus[]

  addBook: (title: string, authorName: string, tocText: string) => string
  deleteBook: (bookId: string) => void
  toggleChapter: (tocItemId: string, roundId: string) => void
  scheduleChapter: (tocItemId: string, roundId: string, date: string | null) => void
  markDone: (tocItemId: string, roundId: string) => void
  startNewRound: (bookId: string, inheritSchedule: boolean) => string
  updateAuthor: (authorId: string, updates: { name?: string; note?: string }) => void
  getActiveRound: (bookId: string) => ReadingRound | undefined
  getChapterStatusForRound: (tocItemId: string, roundId: string) => ChapterStatus | undefined
}

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      authors: [],
      books: [],
      tocItems: [],
      rounds: [],
      chapterStatuses: [],

      addBook: (title, authorName, tocText) => {
        const bookId = uuid()

        // Find or create author
        let authorId = get().authors.find(a => a.name === authorName)?.id
        if (!authorId) {
          authorId = uuid()
          set(s => ({ authors: [...s.authors, { id: authorId, name: authorName, createdAt: Date.now() }] }))
        }

        const book: Book = { id: bookId, title, authorId, tocText, createdAt: Date.now() }
        const items = parseOutline(tocText, bookId)

        const roundId = uuid()
        const round: ReadingRound = { id: roundId, bookId, roundNumber: 1, startedAt: Date.now(), status: "active" }

        const statuses: ChapterStatus[] = items.map(item => ({
          tocItemId: item.id,
          roundId,
          checked: false,
          checkedAt: null,
          scheduledDate: null,
        }))

        set(s => ({
          books: [...s.books, book],
          tocItems: [...s.tocItems, ...items],
          rounds: [...s.rounds, round],
          chapterStatuses: [...s.chapterStatuses, ...statuses],
        }))

        return bookId
      },

      deleteBook: (bookId) => {
        set(s => {
          const tocIds = s.tocItems.filter(t => t.bookId === bookId).map(t => t.id)
          const roundIds = s.rounds.filter(r => r.bookId === bookId).map(r => r.id)
          const book = s.books.find(b => b.id === bookId)
          return {
            books: s.books.filter(b => b.id !== bookId),
            tocItems: s.tocItems.filter(t => t.bookId !== bookId),
            rounds: s.rounds.filter(r => r.bookId !== bookId),
            chapterStatuses: s.chapterStatuses.filter(
              c => !tocIds.includes(c.tocItemId) || !roundIds.includes(c.roundId)
            ),
          }
        })
      },

      toggleChapter: (tocItemId, roundId) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, checked: !c.checked, checkedAt: !c.checked ? Date.now() : null }
              : c
          ),
        }))
      },

      scheduleChapter: (tocItemId, roundId, date) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, scheduledDate: date }
              : c
          ),
        }))
      },

      markDone: (tocItemId, roundId) => {
        set(s => ({
          chapterStatuses: s.chapterStatuses.map(c =>
            c.tocItemId === tocItemId && c.roundId === roundId
              ? { ...c, checked: true, checkedAt: Date.now() }
              : c
          ),
        }))
      },

      startNewRound: (bookId, inheritSchedule) => {
        const s = get()
        const bookRounds = s.rounds.filter(r => r.bookId === bookId)
        const lastRound = bookRounds.reduce((a, b) => b.roundNumber > a.roundNumber ? b : a, bookRounds[0])
        const newRoundNumber = (lastRound?.roundNumber ?? 0) + 1
        const roundId = uuid()

        const items = s.tocItems.filter(t => t.bookId === bookId)
        const lastRoundStatuses = lastRound
          ? Object.fromEntries(s.chapterStatuses.filter(c => c.roundId === lastRound.id).map(c => [c.tocItemId, c]))
          : {}

        const newStatuses: ChapterStatus[] = items.map(item => ({
          tocItemId: item.id,
          roundId,
          checked: false,
          checkedAt: null,
          scheduledDate: inheritSchedule ? (lastRoundStatuses[item.id]?.scheduledDate ?? null) : null,
        }))

        if (lastRound) {
          set(s2 => ({
            rounds: [...s2.rounds.map(r => r.id === lastRound.id ? { ...r, status: "completed" as const } : r), { id: roundId, bookId, roundNumber: newRoundNumber, startedAt: Date.now(), status: "active" as const }],
            chapterStatuses: [...s2.chapterStatuses, ...newStatuses],
          }))
        }

        return roundId
      },

      updateAuthor: (authorId, updates) => {
        set(s => ({
          authors: s.authors.map(a => a.id === authorId ? { ...a, ...updates } : a),
        }))
      },

      getActiveRound: (bookId) => {
        const s = get()
        return s.rounds
          .filter(r => r.bookId === bookId && r.status === "active")
          .sort((a, b) => b.roundNumber - a.roundNumber)[0]
      },

      getChapterStatusForRound: (tocItemId, roundId) => {
        return get().chapterStatuses.find(c => c.tocItemId === tocItemId && c.roundId === roundId)
      },
    }),
    { name: "book-tracker-store" }
  )
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (may have unused warnings, that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/utils.ts src/lib/store.ts
git commit -m "feat: add data types, utils, and Zustand store"
```

---

### Task 3: Outline Parser

**Files:**
- Create: `src/lib/outline-parser.ts`

- [ ] **Step 1: Write the outline parser**

Create `src/lib/outline-parser.ts`:

```typescript
import { v4 as uuid } from "uuid"
import type { TocItem } from "./types"

export function parseOutline(text: string, bookId: string): TocItem[] {
  const items: TocItem[] = []
  const lines = text.split("\n")
  const stack: Array<{ level: number; id: string }> = []
  let orderCounter: Record<string, number> = {}

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue

    // Normalize tabs to 2 spaces
    const line = rawLine.replace(/\t/g, "  ")

    // Calculate indent level
    const match = line.match(/^(\s*)- (.+)$/)
    if (!match) continue

    const indent = match[1].length
    const level = Math.floor(indent / 2)
    const title = match[2].trim()
    if (!title) continue

    // Pop stack to find parent
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
```

- [ ] **Step 2: Verify parser manually**

Run a quick Node test:

```bash
npx tsx -e "
import { parseOutline } from './src/lib/outline-parser'
const text = \`- Chapter 1
  - 1.1 Foo
  - 1.2 Bar
    - 1.2.1 Baz
- Chapter 2
  - 2.1 Qux\`
const items = parseOutline(text, 'test-book')
console.log(JSON.stringify(items, null, 2))
"
```

Expected: 6 items with correct parentId relationships. Chapter 1 and Chapter 2 have `parentId: null`. `1.2.1 Baz` has parentId pointing to `1.2 Bar`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/outline-parser.ts
git commit -m "feat: add markdown outline parser"
```

---

### Task 4: Navigation Bar

**Files:**
- Create: `src/components/navbar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create navbar component**

Create `src/components/navbar.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "首页", href: "/" },
  { label: "书架", href: "/bookshelf" },
  { label: "作者", href: "/authors" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] bg-white px-6 py-2.5">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0075de] text-sm font-bold text-white">
            B
          </div>
          <span className="text-base font-bold text-[rgba(0,0,0,0.95)]">BookTracker</span>
        </Link>
        <div className="flex gap-1 rounded-md bg-[#f6f5f4] p-0.5">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded px-3 py-1 text-[13px] font-medium transition-colors",
                pathname === tab.href
                  ? "bg-[#0075de] font-semibold text-white"
                  : "text-[#615d59] hover:text-[rgba(0,0,0,0.95)]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <AddBookButton />
    </header>
  )
}

function AddBookButton() {
  return (
    <button className="rounded-md bg-[#0075de] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#005bab]">
      + 添加书籍
    </button>
  )
}
```

- [ ] **Step 2: Update root layout**

Replace the contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BookTracker",
  description: "图书章节追踪系统",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify nav renders**

```bash
npm run dev
```

Open http://localhost:3000 — should see the navbar with BookTracker logo, 3 tabs, and "+ 添加书籍" button.

- [ ] **Step 4: Commit**

```bash
git add src/components/navbar.tsx src/app/layout.tsx
git commit -m "feat: add navigation bar"
```

---

### Task 5: Add Book Dialog

**Files:**
- Create: `src/components/add-book-dialog.tsx`

- [ ] **Step 1: Create the add book dialog**

Create `src/components/add-book-dialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBookStore } from "@/lib/store"

interface AddBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddBookDialog({ open, onOpenChange }: AddBookDialogProps) {
  const [title, setTitle] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [tocText, setTocText] = useState("")
  const addBook = useBookStore(s => s.addBook)
  const router = useRouter()

  const handleImport = () => {
    if (!title.trim() || !tocText.trim()) return
    const bookId = addBook(title.trim(), authorName.trim() || "未知作者", tocText)
    setTitle("")
    setAuthorName("")
    setTocText("")
    onOpenChange(false)
    router.push(`/books/${bookId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加书籍</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">书名 *</label>
            <Input
              placeholder="例如：深入理解计算机系统"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">作者</label>
            <Input
              placeholder="例如：Randal E. Bryant"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">目录 *</label>
            <p className="mb-1.5 text-xs text-[#615d59]">粘贴 Markdown 缩进格式（Logseq 风格）</p>
            <Textarea
              className="min-h-[180px] font-mono text-[13px] leading-relaxed"
              placeholder={"- 第一章 计算机系统漫游\n  - 1.1 信息就是位+上下文\n  - 1.2 程序被其他程序翻译成不同的格式\n- 第二章 信息的表示和处理\n  - 2.1 信息存储\n  - 2.2 整数表示\n    - 2.2.1 整数数据类型"}
              value={tocText}
              onChange={e => setTocText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              className="bg-[#0075de] hover:bg-[#005bab]"
              onClick={handleImport}
              disabled={!title.trim() || !tocText.trim()}
            >
              导入书籍
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire dialog into navbar**

Update `src/components/navbar.tsx` — replace `AddBookButton` with dialog integration:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AddBookDialog } from "@/components/add-book-dialog"

const tabs = [
  { label: "首页", href: "/" },
  { label: "书架", href: "/bookshelf" },
  { label: "作者", href: "/authors" },
]

export function Navbar() {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] bg-white px-6 py-2.5">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0075de] text-sm font-bold text-white">
              B
            </div>
            <span className="text-base font-bold text-[rgba(0,0,0,0.95)]">BookTracker</span>
          </Link>
          <div className="flex gap-1 rounded-md bg-[#f6f5f4] p-0.5">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded px-3 py-1 text-[13px] font-medium transition-colors",
                  pathname === tab.href
                    ? "bg-[#0075de] font-semibold text-white"
                    : "text-[#615d59] hover:text-[rgba(0,0,0,0.95)]"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
        <Button
          className="bg-[#0075de] hover:bg-[#005bab]"
          onClick={() => setAddOpen(true)}
        >
          + 添加书籍
        </Button>
      </header>
      <AddBookDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
```

- [ ] **Step 3: Verify dialog opens**

```bash
npm run dev
```

Click "+ 添加书籍" → dialog opens. Fill in and click "导入书籍" → redirects to `/books/[id]` (404 for now, that's expected).

- [ ] **Step 4: Commit**

```bash
git add src/components/add-book-dialog.tsx src/components/navbar.tsx
git commit -m "feat: add book import dialog"
```

---

### Task 6: Book Detail Page — Outline View

**Files:**
- Create: `src/components/outline-view.tsx`
- Create: `src/components/round-selector.tsx`
- Create: `src/app/books/[id]/page.tsx`

- [ ] **Step 1: Create round selector component**

Create `src/components/round-selector.tsx`:

```tsx
"use client"

import type { ReadingRound } from "@/lib/types"

interface RoundSelectorProps {
  rounds: ReadingRound[]
  activeRound: ReadingRound
  onNewRound: () => void
}

export function RoundSelector({ rounds, activeRound, onNewRound }: RoundSelectorProps) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#615d59]">当前轮次</span>
        <span className="cursor-pointer rounded-full bg-[#f2f9ff] px-2.5 py-0.5 text-xs font-semibold text-[#097fe8]">
          第 {activeRound.roundNumber} 轮 ▾
        </span>
      </div>
      <button
        onClick={onNewRound}
        className="rounded-md bg-[rgba(0,0,0,0.05)] px-3 py-1 text-xs font-medium text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]"
      >
        + 开启新一轮
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create outline view component**

Create `src/components/outline-view.tsx`:

```tsx
"use client"

import type { TocItem, ChapterStatus, ReadingRound } from "@/lib/types"
import { buildTree, formatDate } from "@/lib/utils"

interface OutlineViewProps {
  items: TocItem[]
  statuses: Map<string, ChapterStatus>
  round: ReadingRound
  onToggle: (tocItemId: string) => void
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
            round={round}
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
  round,
  onToggle,
  depth,
}: {
  item: TocItem
  tree: Map<string | null, TocItem[]>
  statuses: Map<string, ChapterStatus>
  round: ReadingRound
  onToggle: (tocItemId: string) => void
  depth: number
}) {
  const status = statuses.get(item.id)
  const checked = status?.checked ?? false
  const children = tree.get(item.id) ?? []

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
        {checked && status?.checkedAt ? (
          <span className="text-[11px] text-[#a39e98]">{formatDate(status.checkedAt)}</span>
        ) : (
          <button
            onClick={() => onToggle(item.id)}
            className="rounded bg-[#f2f9ff] px-3 py-0.5 text-[11px] font-semibold text-[#097fe8] hover:bg-[#0075de] hover:text-white"
          >
            打勾
          </button>
        )}
      </div>
      {children.map(child => (
        <OutlineNode
          key={child.id}
          item={child}
          tree={tree}
          statuses={statuses}
          round={round}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </>
  )
}
```

- [ ] **Step 3: Create book detail page**

Create `src/app/books/[id]/page.tsx`:

```tsx
"use client"

import { use } from "react"
import { useState } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OutlineView } from "@/components/outline-view"
import { RoundSelector } from "@/components/round-selector"

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [tab, setTab] = useState("outline")
  const store = useBookStore()

  const book = store.books.find(b => b.id === id)
  const author = book ? store.authors.find(a => a.id === book.authorId) : null
  const items = store.tocItems.filter(t => t.bookId === id)
  const activeRound = book ? store.getActiveRound(id) : undefined
  const roundId = activeRound?.id ?? ""

  const statuses = new Map(
    store.chapterStatuses
      .filter(c => c.roundId === roundId)
      .map(c => [c.tocItemId, c])
  )

  const checkedCount = [...statuses.values()].filter(s => s.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">书籍未找到</p>
        <Link href="/bookshelf" className="text-[#0075de] hover:underline">返回书架</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-5">
        <Link href="/bookshelf" className="mb-3 inline-block text-sm text-[#0075de] hover:underline">
          ← 返回书架
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-[88px] w-16 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f6f5f4,#e8e5e0)] text-2xl border border-[rgba(0,0,0,0.1)]">
            📘
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)]">{book.title}</h1>
            <p className="mt-0.5 text-[13px] text-[#615d59]">
              <Link href={`/authors/${book.authorId}`} className="text-[#0075de] hover:underline">
                {author?.name ?? "未知"}
              </Link>
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="max-w-[280px] flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[#615d59]">阅读进度</span>
                  <span className="font-semibold text-[#097fe8]">{checkedCount}/{totalCount} · {progress}%</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#f2f9ff]">
                  <div className="h-full rounded-full bg-[#0075de] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
          {activeRound && (
            <RoundSelector
              rounds={store.rounds.filter(r => r.bookId === id)}
              activeRound={activeRound}
              onNewRound={() => {}}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="border-b border-[rgba(0,0,0,0.1)]">
        <TabsList className="mx-6 bg-transparent p-0">
          <TabsTrigger
            value="outline"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-[#0075de] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#0075de] data-[state=active]:shadow-none"
          >
            大纲视图
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm data-[state=active]:border-[#0075de] data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-[#0075de] data-[state=active]:shadow-none"
          >
            表格视图
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab content */}
      {tab === "outline" && activeRound && (
        <OutlineView
          items={items}
          statuses={statuses}
          round={activeRound}
          onToggle={(tocItemId) => store.toggleChapter(tocItemId, roundId)}
        />
      )}
      {tab === "table" && (
        <div className="p-6 text-sm text-[#615d59]">表格视图 — 下一个 task 实现</div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify book detail page works**

```bash
npm run dev
```

1. Click "+ 添加书籍", fill in a book with outline, import
2. Should redirect to book detail page showing outline tree
3. Click "打勾" on a chapter → it turns green with strikethrough
4. Refresh page → data persists (localStorage)

- [ ] **Step 5: Commit**

```bash
git add src/components/outline-view.tsx src/components/round-selector.tsx src/app/books/[id]/page.tsx
git commit -m "feat: add book detail page with outline view"
```

---

### Task 7: Book Detail Page — Table View

**Files:**
- Create: `src/components/table-view.tsx`
- Modify: `src/app/books/[id]/page.tsx` (wire in table view)

- [ ] **Step 1: Create table view component**

Create `src/components/table-view.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { TocItem, ChapterStatus, ReadingRound } from "@/lib/types"
import { buildTree, formatToday, formatDate, getChapterStatus } from "@/lib/utils"

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
      {/* Filter pills */}
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

      {/* Table */}
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
  item,
  status,
  chapterStatus,
  depth,
  today,
  onSchedule,
  onMarkDone,
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
```

- [ ] **Step 2: Wire table view into book detail page**

Update `src/app/books/[id]/page.tsx` — replace the table tab placeholder with:

Change the table tab content section from:
```tsx
{tab === "table" && (
  <div className="p-6 text-sm text-[#615d59]">表格视图 — 下一个 task 实现</div>
)}
```

To:
```tsx
{tab === "table" && activeRound && (
  <TableView
    items={items}
    statuses={statuses}
    round={activeRound}
    onSchedule={(tocItemId, date) => store.scheduleChapter(tocItemId, roundId, date)}
    onMarkDone={(tocItemId) => store.markDone(tocItemId, roundId)}
  />
)}
```

Add the import at the top:
```tsx
import { TableView } from "@/components/table-view"
```

- [ ] **Step 3: Verify table view**

```bash
npm run dev
```

1. Open a book detail page
2. Switch to "表格视图" tab
3. Use filter pills to filter by status
4. Click "今天读" / "明天读" / "读完" buttons — status badges update
5. Click "改期" to clear schedule

- [ ] **Step 4: Commit**

```bash
git add src/components/table-view.tsx src/app/books/[id]/page.tsx
git commit -m "feat: add table view with GTD scheduling"
```

---

### Task 8: New Round Dialog

**Files:**
- Create: `src/components/new-round-dialog.tsx`
- Modify: `src/app/books/[id]/page.tsx` (wire in dialog)

- [ ] **Step 1: Create new round dialog**

Create `src/components/new-round-dialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface NewRoundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roundNumber: number
  onConfirm: (inheritSchedule: boolean) => void
}

export function NewRoundDialog({ open, onOpenChange, roundNumber, onConfirm }: NewRoundDialogProps) {
  const [inherit, setInherit] = useState(true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开始第 {roundNumber} 轮阅读</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4 text-[13px] text-[#615d59]">是否继承上一轮的排期计划？</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setInherit(true)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                inherit ? "border-[#0075de] bg-[#f2f9ff]" : "border-[rgba(0,0,0,0.1)]"
              }`}
            >
              <div className="text-sm font-semibold text-[rgba(0,0,0,0.95)]">继承排期</div>
              <div className="text-xs text-[#615d59]">保留上一轮的计划日期，在此基础上调整</div>
            </button>
            <button
              onClick={() => setInherit(false)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                !inherit ? "border-[#0075de] bg-[#f2f9ff]" : "border-[rgba(0,0,0,0.1)]"
              }`}
            >
              <div className="text-sm font-semibold text-[rgba(0,0,0,0.95)]">清空重来</div>
              <div className="text-xs text-[#615d59]">所有章节重置为未排期，重新规划阅读计划</div>
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[rgba(0,0,0,0.1)] pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
          <Button className="bg-[#0075de] hover:bg-[#005bab]" onClick={() => { onConfirm(inherit); onOpenChange(false) }}>
            开始新一轮
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire dialog into book detail page**

Add to `src/app/books/[id]/page.tsx`:

Add import:
```tsx
import { NewRoundDialog } from "@/components/new-round-dialog"
```

Add state inside the component function (after existing useState):
```tsx
const [roundDialogOpen, setRoundDialogOpen] = useState(false)
```

Replace the empty `onNewRound` callback in `<RoundSelector>`:
```tsx
<RoundSelector
  rounds={store.rounds.filter(r => r.bookId === id)}
  activeRound={activeRound}
  onNewRound={() => setRoundDialogOpen(true)}
/>
```

Add dialog at the end of the component's return, before the closing `</div>`:
```tsx
<NewRoundDialog
  open={roundDialogOpen}
  onOpenChange={setRoundDialogOpen}
  roundNumber={(store.rounds.filter(r => r.bookId === id).reduce((max, r) => Math.max(max, r.roundNumber), 0)) + 1}
  onConfirm={(inherit) => {
    store.startNewRound(id, inherit)
  }}
/>
```

- [ ] **Step 3: Verify new round flow**

```bash
npm run dev
```

1. Open a book detail page with some checked chapters
2. Click "+ 开启新一轮"
3. Choose "继承排期" or "清空重来", confirm
4. All chapters should reset to unchecked in the new round

- [ ] **Step 4: Commit**

```bash
git add src/components/new-round-dialog.tsx src/app/books/[id]/page.tsx
git commit -m "feat: add new round dialog with schedule inheritance"
```

---

### Task 9: Bookshelf Page

**Files:**
- Create: `src/components/book-card.tsx`
- Create: `src/app/bookshelf/page.tsx`

- [ ] **Step 1: Create book card component**

Create `src/components/book-card.tsx`:

```tsx
"use client"

import Link from "next/link"
import type { Book, Author, ReadingRound, ChapterStatus, TocItem } from "@/lib/types"

interface BookCardProps {
  book: Book
  author: Author | undefined
  round: ReadingRound | undefined
  items: TocItem[]
  statuses: ChapterStatus[]
}

const gradients = [
  "linear-gradient(135deg,#f6f5f4,#e8e5e0)",
  "linear-gradient(135deg,#f2f9ff,#e0ecf8)",
  "linear-gradient(135deg,#fef6ee,#f8e8d0)",
  "linear-gradient(135deg,#e6f9ee,#d0f0dc)",
  "linear-gradient(135deg,#f3e8ff,#e4d0f8)",
]

export function BookCard({ book, author, round, items, statuses }: BookCardProps) {
  const checkedCount = statuses.filter(s => s.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const isComplete = totalCount > 0 && checkedCount === totalCount

  const todayScheduled = statuses.filter(s => {
    if (s.checked) return false
    const today = new Date().toISOString().slice(0, 10)
    return s.scheduledDate === today
  }).length

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  const tomorrowScheduled = statuses.filter(s => {
    if (s.checked) return false
    return s.scheduledDate === tomorrowStr
  }).length

  const gradientIndex = book.title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length

  return (
    <Link href={`/books/${book.id}`} className="group">
      <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.1)] transition-shadow hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.027)_0px_2px_7px]">
        <div
          className="relative flex h-[130px] items-center justify-center"
          style={{ background: gradients[gradientIndex] }}
        >
          <span className="text-[44px]">📘</span>
          <div className="absolute right-2 top-2 flex gap-1">
            <span className="rounded-full bg-[#f2f9ff] px-2 py-0.5 text-[10px] font-semibold text-[#097fe8]">
              第{round?.roundNumber ?? 1}轮
            </span>
            {isComplete && (
              <span className="rounded-full bg-[#e6f9ee] px-2 py-0.5 text-[10px] font-semibold text-[#1aae39]">
                ✓ 已完成
              </span>
            )}
          </div>
        </div>
        <div className="p-3.5">
          <h3 className="mb-0.5 truncate text-[15px] font-bold text-[rgba(0,0,0,0.95)]">{book.title}</h3>
          <p className="mb-2.5 text-xs">
            <span className="text-[#0075de] hover:underline">{author?.name ?? "未知"}</span>
          </p>
          <div className="mb-1 h-[5px] overflow-hidden rounded-full bg-[#f2f9ff]">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? "bg-[#1aae39]" : "bg-[#0075de]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#a39e98]">
            <span>{checkedCount}/{totalCount} 章节</span>
            {todayScheduled > 0 ? (
              <span className="font-medium text-[#097fe8]">今天 {todayScheduled}章</span>
            ) : tomorrowScheduled > 0 ? (
              <span className="font-medium text-[#dd5b00]">明天 {tomorrowScheduled}章</span>
            ) : (
              <span>{isComplete ? "已完成" : "未排期"}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create bookshelf page**

Create `src/app/bookshelf/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useBookStore } from "@/lib/store"
import { BookCard } from "@/components/book-card"
import { AddBookDialog } from "@/components/add-book-dialog"

type Filter = "all" | "reading" | "done" | "today"

export default function BookshelfPage() {
  const [filter, setFilter] = useState<Filter>("all")
  const [addOpen, setAddOpen] = useState(false)
  const store = useBookStore()
  const today = new Date().toISOString().slice(0, 10)

  const bookCards = store.books.map(book => {
    const author = store.authors.find(a => a.id === book.authorId)
    const round = store.getActiveRound(book.id)
    const items = store.tocItems.filter(t => t.bookId === book.id)
    const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
    const checkedCount = statuses.filter(s => s.checked).length
    const totalCount = items.length
    const isComplete = totalCount > 0 && checkedCount === totalCount
    const hasToday = statuses.some(s => !s.checked && s.scheduledDate === today)
    return { book, author, round, items, statuses, isComplete, hasToday, checkedCount, totalCount }
  })

  const filtered = bookCards.filter(b => {
    if (filter === "all") return true
    if (filter === "reading") return !b.isComplete
    if (filter === "done") return b.isComplete
    if (filter === "today") return b.hasToday
    return true
  })

  const counts = {
    all: bookCards.length,
    reading: bookCards.filter(b => !b.isComplete).length,
    done: bookCards.filter(b => b.isComplete).length,
    today: bookCards.filter(b => b.hasToday).length,
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `全部 (${counts.all})` },
    { key: "reading", label: `在读 (${counts.reading})` },
    { key: "done", label: `已完成 (${counts.done})` },
    { key: "today", label: `今天有排期 (${counts.today})` },
  ]

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] px-6 py-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === f.key ? "bg-[#0075de] text-white" : "bg-[#f2f9ff] text-[#097fe8] hover:bg-[#e0ecf8]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 p-6">
        {filtered.map(b => (
          <BookCard key={b.book.id} {...b} />
        ))}
        <button
          onClick={() => setAddOpen(true)}
          className="flex min-h-[260px] items-center justify-center rounded-xl border-2 border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] transition-colors hover:bg-[#f6f5f4]"
        >
          <div className="text-center text-[#a39e98]">
            <div className="mb-1 text-3xl">+</div>
            <div className="text-[13px] font-medium">添加书籍</div>
          </div>
        </button>
      </div>

      <AddBookDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
```

- [ ] **Step 3: Verify bookshelf page**

```bash
npm run dev
```

1. Navigate to "书架" tab
2. Should see book cards in a grid + "添加书籍" dashed card
3. Filter pills should work
4. Clicking a book card goes to detail page

- [ ] **Step 4: Commit**

```bash
git add src/components/book-card.tsx src/app/bookshelf/page.tsx
git commit -m "feat: add bookshelf page with filters and card grid"
```

---

### Task 10: Author Pages

**Files:**
- Create: `src/components/author-card.tsx`
- Create: `src/app/authors/page.tsx`
- Create: `src/app/authors/[id]/page.tsx`

- [ ] **Step 1: Create author card component**

Create `src/components/author-card.tsx`:

```tsx
"use client"

import Link from "next/link"
import type { Author, Book, ReadingRound, ChapterStatus, TocItem } from "@/lib/types"

interface AuthorCardProps {
  author: Author
  books: Array<{
    book: Book
    round: ReadingRound | undefined
    items: TocItem[]
    statuses: ChapterStatus[]
  }>
}

export function AuthorCard({ author, books }: AuthorCardProps) {
  const totalCount = books.length
  const doneCount = books.filter(b => {
    const checked = b.statuses.filter(s => s.checked).length
    return b.items.length > 0 && checked === b.items.length
  }).length
  const readingCount = totalCount - doneCount

  const statusLabel = doneCount > 0
    ? { bg: "bg-[#e6f9ee]", text: "text-[#1aae39]", label: `${doneCount}本已读完` }
    : { bg: "bg-[#f2f9ff]", text: "text-[#097fe8]", label: "在读" }

  return (
    <Link href={`/authors/${author.id}`}>
      <div className="flex cursor-pointer items-center gap-4 rounded-xl border border-[rgba(0,0,0,0.1)] px-5 py-4 transition-shadow hover:shadow-[rgba(0,0,0,0.02)_0px_2px_7px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] text-xl">
          {author.name[0]}
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[15px] font-bold text-[rgba(0,0,0,0.95)]">{author.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusLabel.bg} ${statusLabel.text}`}>
              {statusLabel.label}
            </span>
          </div>
          <p className="text-xs text-[#615d59]">
            共 {totalCount} 本书 · {doneCount} 本完成 · {readingCount} 本在读
          </p>
        </div>
        <span className="text-[#a39e98]">→</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create author list page**

Create `src/app/authors/page.tsx`:

```tsx
"use client"

import { useBookStore } from "@/lib/store"
import { AuthorCard } from "@/components/author-card"

export default function AuthorsPage() {
  const store = useBookStore()

  const authorData = store.authors.map(author => {
    const books = store.books
      .filter(b => b.authorId === author.id)
      .map(book => {
        const round = store.getActiveRound(book.id)
        const items = store.tocItems.filter(t => t.bookId === book.id)
        const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
        return { book, round, items, statuses }
      })
    return { author, books }
  })

  const totalBooks = store.books.length
  const totalAuthors = store.authors.length

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.05)] px-6 py-4">
        <p className="text-xs text-[#615d59]">
          共 <strong className="text-[rgba(0,0,0,0.95)]">{totalAuthors}</strong> 位作者 · <strong className="text-[rgba(0,0,0,0.95)]">{totalBooks}</strong> 本书
        </p>
      </div>
      <div className="flex flex-col gap-3 p-5">
        {authorData.map(ad => (
          <AuthorCard key={ad.author.id} author={ad.author} books={ad.books} />
        ))}
        {authorData.length === 0 && (
          <div className="py-16 text-center text-sm text-[#a39e98]">还没有添加任何书籍</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create author detail page**

Create `src/app/authors/[id]/page.tsx`:

```tsx
"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { BookCard } from "@/components/book-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const store = useBookStore()
  const author = store.authors.find(a => a.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")

  if (!author) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">作者未找到</p>
        <Link href="/authors" className="text-[#0075de] hover:underline">返回作者列表</Link>
      </div>
    )
  }

  const books = store.books.filter(b => b.authorId === id)
  const totalChapters = books.reduce((sum, book) => {
    const round = store.getActiveRound(book.id)
    const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
    return sum + statuses.filter(s => s.checked).length
  }, 0)

  return (
    <div>
      {/* Back link */}
      <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-3">
        <Link href="/authors" className="text-sm text-[#0075de] hover:underline">← 返回作者列表</Link>
      </div>

      {/* Author info */}
      <div className="flex items-center gap-4 border-b border-[rgba(0,0,0,0.1)] px-6 py-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(0,0,0,0.1)] bg-[#f6f5f4] text-[28px]">
          {author.name[0]}
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[rgba(0,0,0,0.95)]">{author.name}</h1>
          <p className="mt-0.5 text-[13px] text-[#615d59]">
            共 {books.length} 本书 · {books.filter(b => {
              const round = store.getActiveRound(b.id)
              const items = store.tocItems.filter(t => t.bookId === b.id)
              const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
              return items.length > 0 && statuses.filter(s => s.checked).length === items.length
            }).length} 本已读完 · 总计阅读 {totalChapters} 个章节
          </p>
        </div>
        <button
          onClick={() => { setEditName(author.name); setEditOpen(true) }}
          className="ml-auto rounded-md bg-[rgba(0,0,0,0.05)] px-3 py-1.5 text-xs font-medium text-[rgba(0,0,0,0.95)] hover:bg-[rgba(0,0,0,0.08)]"
        >
          编辑
        </button>
      </div>

      {/* Books grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 p-6">
        {books.map(book => {
          const round = store.getActiveRound(book.id)
          const items = store.tocItems.filter(t => t.bookId === book.id)
          const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
          return (
            <BookCard key={book.id} book={book} author={author} round={round} items={items} statuses={statuses} />
          )
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑作者</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-[rgba(0,0,0,0.95)]">作者名</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-[rgba(0,0,0,0.1)] pt-4">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>取消</Button>
            <Button
              className="bg-[#0075de] hover:bg-[#005bab]"
              onClick={() => { store.updateAuthor(id, { name: editName }); setEditOpen(false) }}
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Verify author pages**

```bash
npm run dev
```

1. Click "作者" tab → see author list
2. Click an author → see their books
3. Click "编辑" → change author name, save
4. Click author name in bookshelf → navigates to author detail

- [ ] **Step 5: Commit**

```bash
git add src/components/author-card.tsx src/app/authors/page.tsx src/app/authors/[id]/page.tsx
git commit -m "feat: add author list and detail pages with editing"
```

---

### Task 11: Dashboard Homepage

**Files:**
- Create: `src/components/stat-card.tsx`
- Create: `src/components/today-reading-list.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create stat card component**

Create `src/components/stat-card.tsx`:

```tsx
interface StatCardProps {
  label: string
  value: number | string
  sub: string
  variant: "blue" | "green" | "gray"
}

const variants = {
  blue: "bg-[#f2f9ff] border-[rgba(0,117,222,0.1)]",
  green: "bg-[#e6f9ee] border-[rgba(26,174,57,0.15)]",
  gray: "bg-[#f6f5f4] border-[rgba(0,0,0,0.06)]",
}

const textColors = {
  blue: "text-[#0075de]",
  green: "text-[#1aae39]",
  gray: "text-[rgba(0,0,0,0.95)]",
}

const labelColors = {
  blue: "text-[#097fe8]",
  green: "text-[#1aae39]",
  gray: "text-[#615d59]",
}

export function StatCard({ label, value, sub, variant }: StatCardProps) {
  return (
    <div className={`flex-1 rounded-[10px] border px-5 py-4 ${variants[variant]}`}>
      <div className={`mb-1.5 text-xs font-semibold ${labelColors[variant]}`}>{label}</div>
      <div className={`text-[28px] font-bold ${textColors[variant]}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-[#615d59]">{sub}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create today reading list component**

Create `src/components/today-reading-list.tsx`:

```tsx
"use client"

import type { Book, TocItem, ChapterStatus } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface TodayReadingListProps {
  items: Array<{
    book: Book
    tocItem: TocItem
    status: ChapterStatus
  }>
  onToggle: (tocItemId: string, roundId: string) => void
}

export function TodayReadingList({ items, onToggle }: TodayReadingListProps) {
  const done = items.filter(i => i.status.checked)
  const pending = items.filter(i => !i.status.checked)

  return (
    <div className="flex flex-col gap-1.5">
      {done.map(item => (
        <div key={item.tocItem.id} className="flex items-center gap-3 rounded-lg bg-[#f6f5f4] px-3.5 py-2.5 opacity-50">
          <span className="text-base text-[#1aae39]">✓</span>
          <span className="flex-1 text-[13px] text-[#615d59] line-through">
            {item.book.title} · {item.tocItem.title}
          </span>
          <span className="text-[11px] text-[#a39e98]">已完成</span>
        </div>
      ))}
      {pending.map(item => (
        <div key={item.tocItem.id} className="flex items-center gap-3 rounded-lg border border-[rgba(0,117,222,0.2)] bg-white px-3.5 py-2.5">
          <span className="text-base text-[#097fe8]">○</span>
          <span className="flex-1 text-[13px] font-medium text-[rgba(0,0,0,0.95)]">
            {item.book.title} · {item.tocItem.title}
          </span>
          <button
            onClick={() => onToggle(item.tocItem.id, item.status.roundId)}
            className="rounded bg-[#0075de] px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-[#005bab]"
          >
            打勾
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <div className="py-8 text-center text-sm text-[#a39e98]">今天没有排期阅读的章节</div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard homepage**

Replace `src/app/page.tsx`:

```tsx
"use client"

import { useBookStore } from "@/lib/store"
import { StatCard } from "@/components/stat-card"
import { TodayReadingList } from "@/components/today-reading-list"
import { BookCard } from "@/components/book-card"
import Link from "next/link"

export default function HomePage() {
  const store = useBookStore()
  const today = new Date().toISOString().slice(0, 10)

  // Gather today's chapters from all books
  const todayItems: Array<{ book: typeof store.books[0]; tocItem: typeof store.tocItems[0]; status: typeof store.chapterStatuses[0] }> = []
  for (const book of store.books) {
    const round = store.getActiveRound(book.id)
    if (!round) continue
    const statuses = store.chapterStatuses.filter(c => c.roundId === round.id && c.scheduledDate === today)
    for (const status of statuses) {
      const tocItem = store.tocItems.find(t => t.id === status.tocItemId)
      if (tocItem) todayItems.push({ book, tocItem, status })
    }
  }

  const todayDone = todayItems.filter(i => i.status.checked).length
  const todayPending = todayItems.filter(i => !i.status.checked).length

  // Reading books
  const readingBooks = store.books
    .map(book => {
      const author = store.authors.find(a => a.id === book.authorId)
      const round = store.getActiveRound(book.id)
      const items = store.tocItems.filter(t => t.bookId === book.id)
      const statuses = store.chapterStatuses.filter(c => c.roundId === (round?.id ?? ""))
      const checkedCount = statuses.filter(s => s.checked).length
      return { book, author, round, items, statuses, isComplete: items.length > 0 && checkedCount === items.length }
    })
    .filter(b => !b.isComplete)

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "早上好 ☀️" : hour < 18 ? "下午好 🌤️" : "晚上好 🌙"
  const dateStr = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })

  // Streak calculation (simplified: count consecutive days with at least one check)
  const streak = calculateStreak(store.chapterStatuses)

  return (
    <div className="px-6 py-6">
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[rgba(0,0,0,0.95)]">{greeting}</h1>
        <p className="mt-0.5 text-sm text-[#615d59]">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="mb-6 flex gap-3">
        <StatCard label="今日待读" value={todayPending} sub="章节数" variant="blue" />
        <StatCard label="今日已完成" value={todayDone} sub={todayDone > 0 ? "继续加油！" : "开始今天的阅读吧"} variant="green" />
        <StatCard label="在读书籍" value={readingBooks.length} sub={`总进度 ${Math.round(readingBooks.reduce((s, b) => s + (b.statuses.filter(st => st.checked).length / Math.max(b.items.length, 1)) * 100, 0) / Math.max(readingBooks.length, 1))}%`} variant="gray" />
        <StatCard label="连续阅读" value={streak} sub="天 🔥" variant="gray" />
      </div>

      {/* Today's reading list */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[rgba(0,0,0,0.95)]">今日阅读清单</h2>
        </div>
        <TodayReadingList
          items={todayItems}
          onToggle={(tocItemId, roundId) => store.toggleChapter(tocItemId, roundId)}
        />
      </div>

      {/* Recently reading */}
      {readingBooks.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[rgba(0,0,0,0.95)]">最近在读</h2>
            <Link href="/bookshelf" className="text-xs font-medium text-[#097fe8] hover:underline">查看书架 →</Link>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2">
            {readingBooks.slice(0, 5).map(b => (
              <div key={b.book.id} className="min-w-[180px]">
                <BookCard book={b.book} author={b.author} round={b.round} items={b.items} statuses={b.statuses} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function calculateStreak(statuses: typeof useBookStore extends { getState: () => infer S } ? S["chapterStatuses"] : never): number {
  const checkedDates = new Set<string>()
  for (const s of statuses) {
    if (s.checkedAt) {
      checkedDates.add(new Date(s.checkedAt).toISOString().slice(0, 10))
    }
  }
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (checkedDates.has(key)) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
```

- [ ] **Step 4: Verify dashboard**

```bash
npm run dev
```

1. Open homepage
2. See greeting, stats cards
3. If you have books with today's scheduled chapters, see them in the reading list
4. Click "打勾" in the reading list → chapter marked as done
5. "最近在读" section shows active books

- [ ] **Step 5: Commit**

```bash
git add src/components/stat-card.tsx src/components/today-reading-list.tsx src/app/page.tsx
git commit -m "feat: add dashboard homepage with stats and today reading list"
```

---

### Task 12: Global CSS and Notion Design Polish

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update global styles for Notion design language**

Replace `src/app/globals.css` with Notion-style base styles. Keep any CSS variables that shadcn injected, add Notion font and base styles:

```css
@import "tailwindcss";

@layer base {
  * {
    border-color: rgba(0, 0, 0, 0.1);
  }

  body {
    font-family: Inter, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif;
    color: rgba(0, 0, 0, 0.95);
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

- [ ] **Step 2: Verify styling**

```bash
npm run dev
```

Check that all pages look clean with Notion-style warm typography and borders.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: apply Notion design system base styles"
```

---

### Task 13: Final Integration Test

**Files:**
- None (testing only)

- [ ] **Step 1: Full flow test**

```bash
npm run dev
```

Walk through the complete user flow:

1. **Homepage** — shows empty state, no errors
2. **Add book** — click "+ 添加书籍", fill in:
   - Title: "深入理解计算机系统"
   - Author: "Randal E. Bryant"
   - TOC: paste a multi-level outline
3. **Book detail** — redirected, see outline tree
4. **Check chapters** — click "打勾" on several items, verify they turn green/strikethrough
5. **Table view** — switch to table tab
6. **Schedule** — click "今天读" on some chapters, "明天读" on others
7. **Dashboard** — go to homepage, see today's chapters listed
8. **New round** — go back to book detail, click "+ 开启新一轮", choose "清空重来", verify all chapters reset
9. **Bookshelf** — see the book card with progress
10. **Authors** — navigate to authors tab, see the author, click to see their books
11. **Edit author** — edit author name, verify it updates everywhere
12. **Refresh page** — all data persists (localStorage)

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: builds successfully with no errors.

- [ ] **Step 3: Commit (if any fixes)**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

## Self-Review

**Spec coverage:**
- ✅ Author CRUD (create via book import, list page, detail page, edit dialog)
- ✅ Book import (dialog with title/author/outline)
- ✅ Book detail (outline view + table view + round selector)
- ✅ Chapter check-off with timestamps (outline view toggle)
- ✅ Multi-round reading (new round dialog with inherit/clear)
- ✅ GTD scheduling (table view with today/tomorrow/schedule buttons)
- ✅ Dashboard (stats + today reading list + recent books)
- ✅ Bookshelf (card grid + filters)
- ✅ Author pages (list + detail)
- ✅ localStorage persistence (Zustand persist)
- ✅ Notion design language
- ❌ No delete book action in UI (store action exists, can add later)

**Placeholder scan:** No TBD/TODO found. All steps have complete code.

**Type consistency:** All interfaces match between store, components, and page files. `roundId` and `bookId` used consistently.
