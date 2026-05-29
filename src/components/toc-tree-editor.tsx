"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { TocItem } from "@/lib/types"
import { useAIConfigStore } from "@/lib/ai-config-store"
import { parseOutline } from "@/lib/outline-parser"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const INDENT_PX = 20
const SYNC_DEBOUNCE_MS = 500
const PIXEL_THRESHOLD = 5
const TEXTAREA_HEIGHT = "60vh"

interface TocTreeEditorProps {
  items: TocItem[]
  onChange: (items: TocItem[]) => void
  bookId: string
  title?: string
}

function buildChildrenMap(items: TocItem[]) {
  const map = new Map<string | null, TocItem[]>()
  for (const item of items) {
    const key = item.parent_id ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  for (const [, children] of map) {
    children.sort((a, b) => a.sort_order - b.sort_order)
  }
  return map
}

function buildTreeData(items: TocItem[]) {
  const childrenMap = buildChildrenMap(items)
  const depthMap = new Map<string, number>()
  const ordered: TocItem[] = []

  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      depthMap.set(child.id, depth)
      ordered.push(child)
      walk(child.id, depth + 1)
    }
  }
  walk(null, 0)

  return { depthMap, ordered }
}

function reindex(items: TocItem[]): TocItem[] {
  const childrenMap = buildChildrenMap(items)
  const result: TocItem[] = []
  function walk(parentId: string | null) {
    const children = childrenMap.get(parentId) ?? []
    children.forEach((child, i) => {
      result.push({ ...child, sort_order: i })
      walk(child.id)
    })
  }
  walk(null)
  return result
}

function itemsToIndentedText(items: TocItem[]): string {
  const childrenMap = buildChildrenMap(items)
  const lines: string[] = []
  function walk(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const child of children) {
      lines.push(`${"\t".repeat(depth)}${child.title}`)
      walk(child.id, depth + 1)
    }
  }
  walk(null, 0)
  return lines.join("\n")
}

function focusItem(container: HTMLDivElement, id: string, mode: "start" | "end" | "all" = "all") {
  requestAnimationFrame(() => {
    const el = container.querySelector<HTMLElement>(`[data-item-id="${id}"] [data-editable]`)
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (!sel) return
    const range = document.createRange()
    if (mode === "all") {
      range.selectNodeContents(el)
    } else {
      const node = el.firstChild ?? el
      const offset = mode === "end" ? (node.textContent?.length ?? 0) : 0
      range.setStart(node, offset)
      range.collapse(true)
    }
    sel.removeAllRanges()
    sel.addRange(range)
  })
}

function isTextEmpty(el: HTMLElement): boolean {
  const text = el.textContent ?? ""
  return text.replace(/​/g, "").trim().length === 0
}

function findEditableEl(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector(`[data-item-id="${id}"] [data-editable]`)
}

function isCursorAtStart(target: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const beforeRange = sel.getRangeAt(0).cloneRange()
  beforeRange.selectNodeContents(target)
  beforeRange.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset)
  return beforeRange.toString().length === 0
}

function isCursorAtEnd(target: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const afterRange = sel.getRangeAt(0).cloneRange()
  afterRange.selectNodeContents(target)
  afterRange.setStart(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
  return afterRange.toString().length === 0
}

function isOnFirstLine(target: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  const beforeRange = range.cloneRange()
  beforeRange.selectNodeContents(target)
  beforeRange.setEnd(range.startContainer, range.startOffset)
  if (beforeRange.toString().length === 0) return true
  const rect = range.getBoundingClientRect()
  const firstRect = target.getBoundingClientRect()
  return Math.abs(rect.top - firstRect.top) < PIXEL_THRESHOLD
}

function isOnLastLine(target: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  const afterRange = range.cloneRange()
  afterRange.selectNodeContents(target)
  afterRange.setStart(range.endContainer, range.endOffset)
  if (afterRange.toString().length === 0) return true
  const rect = range.getBoundingClientRect()
  const lastRect = target.getBoundingClientRect()
  return Math.abs(rect.bottom - lastRect.bottom) < PIXEL_THRESHOLD
}

export function TocTreeEditor({ items, onChange, bookId, title }: TocTreeEditorProps) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"direct" | "ai" | null>(null)
  const [importText, setImportText] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pendingImportMode, setPendingImportMode] = useState<"direct" | "ai">("direct")
  const aiConfig = useAIConfigStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const historyRef = useRef<TocItem[][]>([])
  const historyIdxRef = useRef<number>(-1)
  const isRestoringRef = useRef(false)
  const focusedIdRef = useRef<string | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const initRef = useRef(false)

  const { depthMap, ordered } = buildTreeData(items)

  useEffect(() => {
    if (importMode && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [importMode])

  useEffect(() => {
    if (!initRef.current && items.length > 0) {
      initRef.current = true
      historyRef.current = [structuredClone(items)]
      historyIdxRef.current = 0
    }
  }, [items])

  function pushHistory(nextItems: TocItem[]) {
    if (isRestoringRef.current) return
    const h = historyRef.current
    const idx = historyIdxRef.current
    historyRef.current = h.slice(0, idx + 1)
    historyRef.current.push(structuredClone(nextItems))
    historyIdxRef.current = historyRef.current.length - 1
  }

  function syncTextAndPush() {
    if (!focusedIdRef.current || !containerRef.current) return
    const el = findEditableEl(containerRef.current, focusedIdRef.current)
    if (!el) return
    const text = el.textContent ?? ""
    const id = focusedIdRef.current
    const item = items.find(i => i.id === id)
    if (!item || item.title === text) return
    const next = items.map(i => i.id === id ? { ...i, title: text } : i)
    pushHistory(next)
    onChange(next)
  }

  function commitChange(nextItems: TocItem[]) {
    if (focusedIdRef.current && containerRef.current) {
      const el = findEditableEl(containerRef.current, focusedIdRef.current)
      if (el) {
        const text = el.textContent ?? ""
        const id = focusedIdRef.current
        nextItems = nextItems.map(i => i.id === id ? { ...i, title: text } : i)
      }
    }
    pushHistory(nextItems)
    onChange(nextItems)
  }

  function undo() {
    const idx = historyIdxRef.current
    if (idx <= 0) return
    isRestoringRef.current = true
    historyIdxRef.current = idx - 1
    onChange(structuredClone(historyRef.current[idx - 1]))
    isRestoringRef.current = false
  }

  function redo() {
    const idx = historyIdxRef.current
    const h = historyRef.current
    if (idx >= h.length - 1) return
    isRestoringRef.current = true
    historyIdxRef.current = idx + 1
    onChange(structuredClone(h[idx + 1]))
    isRestoringRef.current = false
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== "z" && e.key !== "Z") return
      e.preventDefault()
      if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
      syncTextAndPush()
      if (e.shiftKey) redo()
      else undo()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [items, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (!target.dataset.editable) return
    const itemEl = target.closest<HTMLElement>("[data-item-id]")
    if (!itemEl) return
    const id = itemEl.dataset.itemId
    if (!id) return

    switch (e.key) {
      case "Enter": {
        e.preventDefault()
        const idx = items.findIndex(i => i.id === id)
        if (idx < 0) return
        const current = items[idx]
        const newId = crypto.randomUUID()
        const newItem: TocItem = {
          id: newId, book_id: bookId, parent_id: current.parent_id, title: "", sort_order: current.sort_order + 1,
        }
        const next = reindex([...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)])
        commitChange(next)
        focusItem(containerRef.current!, newId, "all")
        break
      }

      case "Tab": {
        e.preventDefault()
        if (e.shiftKey) {
          const current = items.find(i => i.id === id)
          if (!current?.parent_id) return
          const parent = items.find(i => i.id === current.parent_id)
          if (!parent) return
          const parentSiblings = items.filter(i => i.parent_id === parent.parent_id)
          const parentIdx = parentSiblings.findIndex(i => i.id === parent.id)
          commitChange(reindex(items.map(i => i.id === id ? { ...i, parent_id: parent.parent_id, sort_order: parentIdx + 1 } : i)))
        } else {
          const idx = ordered.findIndex(i => i.id === id)
          if (idx <= 0) return
          const current = ordered[idx]
          const prevSibling = ordered.slice(0, idx).reverse().find(i => i.parent_id === current.parent_id)
          if (!prevSibling) return
          commitChange(reindex(items.map(i => i.id === id ? { ...i, parent_id: prevSibling.id } : i)))
        }
        focusItem(containerRef.current!, id, "all")
        break
      }

      case "Backspace": {
        if (!isTextEmpty(target)) return
        e.preventDefault()
        const idx = items.findIndex(i => i.id === id)
        if (idx < 0 || items.length === 1) return
        const prevId = idx > 0 ? items[idx - 1].id : null
        const next = items.filter(i => i.id !== id)
        commitChange(reindex(next))
        if (prevId) focusItem(containerRef.current!, prevId, "end")
        break
      }

      case "ArrowUp": {
        if (!isOnFirstLine(target)) return
        e.preventDefault()
        const idx = ordered.findIndex(i => i.id === id)
        if (idx > 0) focusItem(containerRef.current!, ordered[idx - 1].id, "end")
        break
      }

      case "ArrowDown": {
        if (!isOnLastLine(target)) return
        e.preventDefault()
        const idx = ordered.findIndex(i => i.id === id)
        if (idx < ordered.length - 1) focusItem(containerRef.current!, ordered[idx + 1].id, "start")
        break
      }

      case "ArrowLeft": {
        if (e.shiftKey || !isCursorAtStart(target)) return
        const idx = ordered.findIndex(i => i.id === id)
        if (idx > 0) {
          e.preventDefault()
          focusItem(containerRef.current!, ordered[idx - 1].id, "end")
        }
        break
      }

      case "ArrowRight": {
        if (e.shiftKey || !isCursorAtEnd(target)) return
        const idx = ordered.findIndex(i => i.id === id)
        if (idx < ordered.length - 1) {
          e.preventDefault()
          focusItem(containerRef.current!, ordered[idx + 1].id, "start")
        }
        break
      }
    }
  }, [items, bookId, onChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handlePaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text/plain")
      if (!text) return
      const lines = text.split("\n")
      const hasIndent = lines.some(l => /^\s+/.test(l))
      const hasMultiple = lines.filter(l => l.trim()).length > 1
      if (!hasIndent && !hasMultiple) return
      e.preventDefault()
      e.stopPropagation()
      const parsed = parseOutline(text, bookId)
      if (parsed.length > 0) commitChange(parsed)
    }
    el.addEventListener("paste", handlePaste, true)
    return () => el.removeEventListener("paste", handlePaste, true)
  }, [bookId, onChange])

  async function callAiParse(text: string): Promise<TocItem[]> {
    const provider = aiConfig.defaultProvider
    const config = aiConfig[provider]
    if (!config.apiKey) {
      throw new Error(`请先在设置页面配置 ${provider === "claude" ? "Claude" : "OpenAI"} API Key`)
    }
    const res = await fetch("/api/toc-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider, apiKey: config.apiKey, baseUrl: config.baseUrl, model: config.model }),
    })
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || `请求失败 (${res.status})`) }
    const data = await res.json()
    const newItems = parseOutline(data.outline, bookId)
    if (newItems.length === 0) throw new Error("AI 返回的内容无法解析为目录")
    return newItems
  }

  function handleImportConfirm() {
    const parsed = parseOutline(importText, bookId)
    if (parsed.length === 0) { setAiError("未能解析出有效的目录内容"); return }
    setAiError(null)
    commitChange(reindex(parsed))
    setImportMode(null)
    setImportText("")
  }

  async function handleAiImportConfirm() {
    if (!importText.trim()) { setAiError("请先粘贴目录内容"); return }
    setAiLoading(true); setAiError(null)
    try {
      const newItems = await callAiParse(importText)
      commitChange(reindex(newItems))
      setImportMode(null)
      setImportText("")
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "AI 整理失败")
    } finally {
      setAiLoading(false)
    }
  }

  function enterImportMode(mode: "direct" | "ai") {
    if (items.length > 0) {
      setPendingImportMode(mode)
      setImportDialogOpen(true)
      return
    }
    setImportMode(mode)
    setImportText("")
    setAiError(null)
  }

  function confirmImportDialog(keep: boolean) {
    setImportDialogOpen(false)
    setImportMode(pendingImportMode)
    setImportText(keep ? itemsToIndentedText(items) : "")
    setAiError(null)
  }

  function cancelImport() {
    setImportMode(null)
    setImportText("")
    setAiError(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {title && <span className="text-[14px] font-semibold text-[rgba(0,0,0,0.95)]">{title}</span>}
        <div className="flex items-center gap-2">
          {aiError && <span className="text-[12px] text-[#d83931]">{aiError}</span>}
          {!importMode && (
            <>
              <button
                onClick={() => enterImportMode("direct")}
                className="bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.1)] rounded-md px-3 py-1 text-[12px] font-semibold cursor-pointer hover:bg-[rgba(0,0,0,0.08)]"
              >
                导入目录
              </button>
              <button
                onClick={() => enterImportMode("ai")}
                className="bg-[#f2f9ff] text-[#097fe8] border border-[#b3ddf5] rounded-md px-3 py-1 text-[12px] font-semibold cursor-pointer hover:bg-[#e0f0ff]"
              >
                ✨ AI 整理
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-sm !top-[35%] !-translate-y-0">
          <DialogHeader>
            <DialogTitle className="text-[15px]">导入目录</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-[#615d59]">当前已有目录内容，导入新目录时如何处理？</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)} className="text-[13px] font-semibold text-[#615d59]">
              取消
            </Button>
            <Button variant="outline" onClick={() => confirmImportDialog(true)} className="text-[13px] font-semibold">
              保留内容
            </Button>
            <Button onClick={() => confirmImportDialog(false)} className="text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white">
              清空后导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {importMode ? (
        <div>
          <div className="flex border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#fafaf9]" style={{ height: TEXTAREA_HEIGHT }}>
            <div
              ref={el => {
                if (el && textareaRef.current) {
                  textareaRef.current.onscroll = () => { el.scrollTop = textareaRef.current!.scrollTop }
                }
              }}
              className="flex-shrink-0 w-5 overflow-hidden bg-[#f0efed] border-r border-[rgba(0,0,0,0.06)] text-right pr-1 pt-4 text-[13px] font-mono leading-relaxed text-[rgba(0,0,0,0.25)] select-none rounded-l-lg"
            >
              {importText.split("\n").map((line, i) => {
                const tabCount = (line.match(/^\t*/) ?? [""])[0].length
                return (
                  <div key={i} className="h-[21px] flex items-end justify-end">
                    {tabCount > 0 ? tabCount : ""}
                  </div>
                )
              })}
            </div>
            <textarea
              ref={textareaRef}
              value={importText}
              onChange={e => {
                const ta = e.target
                const cursor = ta.selectionStart
                const raw = ta.value
                const converted = raw.replace(/^\t*[ ]+/gm, m => {
                  const tabs = m.startsWith("\t") ? m.match(/^\t+/)?.[0] ?? "" : ""
                  const spaces = m.slice(tabs.length)
                  return tabs + "\t".repeat(spaces.length)
                })
                if (converted !== raw) {
                  const before = raw.slice(0, cursor)
                  const beforeConverted = before.replace(/^\t*[ ]+/gm, m => {
                    const tabs = m.startsWith("\t") ? m.match(/^\t+/)?.[0] ?? "" : ""
                    const spaces = m.slice(tabs.length)
                    return tabs + "\t".repeat(spaces.length)
                  })
                  setImportText(converted)
                  requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = beforeConverted.length
                  })
                } else {
                  setImportText(raw)
                }
              }}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === "Enter") {
                  // Let textarea handle Enter natively, just prevent propagation
                  return
                }
                if (e.key === "Tab") {
                  e.preventDefault()
                  const ta = e.currentTarget
                  const start = ta.selectionStart
                  const end = ta.selectionEnd
                  if (e.shiftKey) {
                    const lineStart = importText.lastIndexOf("\n", start - 1) + 1
                    const lineText = importText.slice(lineStart, end)
                    const unindented = lineText.replace(/^\t/, "")
                    const removed = lineText.length - unindented.length
                    if (removed > 0) {
                      const next = importText.slice(0, lineStart) + unindented + importText.slice(end)
                      setImportText(next)
                      requestAnimationFrame(() => {
                        ta.selectionStart = start - removed
                        ta.selectionEnd = end - removed
                      })
                    }
                  } else {
                    const next = importText.slice(0, start) + "\t" + importText.slice(end)
                    setImportText(next)
                    requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + 1
                    })
                  }
                }
              }}
              placeholder={"粘贴目录文本，支持两种格式：\n\n格式一（带横线前缀）：\n- 第一章\n\t- 第一节\n\t- 第二节\n- 第二章\n\n格式二（纯缩进文本）：\n第一章\n\t第一节\n\t第二节\n第二章"}
              className="flex-1 bg-transparent text-[13px] text-[rgba(0,0,0,0.95)] p-4 outline-none resize-none font-mono leading-relaxed"
              style={{ tabSize: 8 }}
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-4">
            <button
              onClick={cancelImport}
              className="text-[13px] text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.65)] cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={importMode === "direct" ? handleImportConfirm : handleAiImportConfirm}
              disabled={aiLoading || !importText.trim()}
              className="bg-[#0075de] text-white rounded-md px-3 py-1 text-[13px] font-semibold cursor-pointer hover:bg-[#005bab] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading ? "AI 解析中..." : importMode === "ai" ? "AI 解析并导入" : "确认导入"}
            </button>
          </div>
        </div>
      ) : (
      <div
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#fafaf9] overflow-auto"
        style={{ height: TEXTAREA_HEIGHT }}
      >
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 text-[13px] text-[#9b958e] cursor-text"
            onClick={() => {
              commitChange([{ id: crypto.randomUUID(), book_id: bookId, parent_id: null, title: "", sort_order: 0 }])
            }}
          >
            <p>直接粘贴目录文本，或点击此处开始输入</p>
            <p className="text-[11px] mt-1 text-[#c5bfb8]">支持缩进文本自动解析为层级结构</p>
          </div>
        ) : (
          <div className="py-3 px-4">
            {ordered.map(item => {
              const depth = depthMap.get(item.id) ?? 0
              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  className="flex items-center min-h-[28px] rounded [&:has([data-editable]:focus)]:bg-[#f0f0ff] cursor-text"
                  style={{ paddingLeft: depth * INDENT_PX }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).dataset.editable) return
                    const el = e.currentTarget.querySelector<HTMLElement>("[data-editable]")
                    el?.focus()
                  }}
                >
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className="w-1 h-1 rounded-full bg-[rgba(0,0,0,0.15)]" />
                  </span>
                  <span
                    data-editable
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => { focusedIdRef.current = item.id }}
                    onInput={() => {
                      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
                      syncTimerRef.current = setTimeout(() => syncTextAndPush(), SYNC_DEBOUNCE_MS)
                    }}
                    onBlur={() => {
                      if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null }
                      syncTextAndPush()
                      focusedIdRef.current = null
                    }}
                    className="flex-1 text-[13px] text-[rgba(0,0,0,0.95)] pl-2 pr-1 py-0.5 outline-none min-w-0"
                  >
                    {item.title}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {!importMode && items.length > 0 && (
        <div className="mt-2 flex items-center gap-4 flex-wrap text-[11px] text-[#9b958e]">
          <span><kbd className="bg-[#f0efed] border border-[rgba(0,0,0,0.1)] rounded px-1 py-px text-[10px]">Enter</kbd> 添加同级</span>
          <span><kbd className="bg-[#f0efed] border border-[rgba(0,0,0,0.1)] rounded px-1 py-px text-[10px]">Tab</kbd> 缩进</span>
          <span><kbd className="bg-[#f0efed] border border-[rgba(0,0,0,0.1)] rounded px-1 py-px text-[10px]">Shift+Tab</kbd> 出缩进</span>
          <span>⌫ 删除空项</span>
          <span>📋 粘贴大纲</span>
          <span><kbd className="bg-[#f0efed] border border-[rgba(0,0,0,0.1)] rounded px-1 py-px text-[10px]">⌘Z</kbd> 撤销</span>
          <span><kbd className="bg-[#f0efed] border border-[rgba(0,0,0,0.1)] rounded px-1 py-px text-[10px]">⌘⇧Z</kbd> 重做</span>
        </div>
      )}
    </div>
  )
}
