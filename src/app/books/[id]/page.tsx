"use client"

import { use, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useBookStore } from "@/lib/store"
import { TableView } from "@/components/table-view"
import { RoundSelector } from "@/components/round-selector"
import { NewRoundDialog } from "@/components/new-round-dialog"
import type { Book } from "@/lib/types"

const STATUS_OPTIONS: { value: NonNullable<Book['readingStatus']>; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { value: 'want', label: '想读', icon: '💡', color: '#b55a00', bg: '#fef3e0', border: '#f5d6a3' },
  { value: 'reading', label: '在读', icon: '📖', color: '#0075de', bg: '#e8f4fd', border: '#b3ddf5' },
  { value: 'finished', label: '读完', icon: '✅', color: '#0a8a3e', bg: '#e6f7ed', border: '#b3e6c7' },
  { value: 'dropped', label: '弃读', icon: '🚫', color: '#d83931', bg: '#fde8e8', border: '#f5b3b3' },
  { value: 'idle', label: '闲置', icon: '⏸', color: '#615d59', bg: '#f6f5f4', border: 'rgba(0,0,0,0.1)' },
]

function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(str: string): number | null {
  const d = new Date(str + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d.getTime()
}

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [roundDialogOpen, setRoundDialogOpen] = useState(false)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<'startedReadingAt' | 'finishedReadingAt' | null>(null)
  const [tagInput, setTagInput] = useState("")
  const store = useBookStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const book = store.books.find(b => b.id === id)
  const author = book ? store.authors.find(a => a.id === book.authorId) : undefined
  const items = store.tocItems.filter(t => t.bookId === id)
  const activeRound = book ? store.getActiveRound(id) : undefined
  const selectedRound = selectedRoundId
    ? store.rounds.find(r => r.id === selectedRoundId)
    : activeRound
  const roundId = selectedRound?.id ?? ""

  const statuses = new Map(
    store.chapterStatuses
      .filter(c => c.roundId === roundId)
      .map(c => [c.tocItemId, c])
  )

  const checkedCount = [...statuses.values()].filter(s => s.checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const statusInfo = STATUS_OPTIONS.find(o => o.value === book?.readingStatus)

  useEffect(() => {
    if (!statusDropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [statusDropdownOpen])

  useEffect(() => {
    if (!editingDate) return
    function handleClick(e: MouseEvent) {
      if (dateInputRef.current && !dateInputRef.current.contains(e.target as Node)) {
        setEditingDate(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [editingDate])

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[#615d59]">书籍未找到</p>
        <Link href="/bookshelf" className="text-[#0075de] hover:underline">返回书架</Link>
      </div>
    )
  }

  function handleStatusChange(status: Book['readingStatus']) {
    store.updateBookStatus(id, status)
    setStatusDropdownOpen(false)
  }

  function handleDateChange(field: 'startedReadingAt' | 'finishedReadingAt', value: string) {
    const ts = parseDate(value)
    store.updateBookDate(id, field, ts)
    setEditingDate(null)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      store.addBookTag(id, tagInput)
      setTagInput("")
    }
  }

  const hasDoubanMeta = book.publisher || book.publishDate || book.isbn

  return (
    <div>
      <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-5">
        <Link href="/bookshelf" className="mb-3 inline-block text-sm text-[#0075de] hover:underline">
          &larr; 返回书架
        </Link>
        <div className="flex items-start gap-5">
          <div className="relative w-[100px] h-[140px] shrink-0 rounded-lg overflow-hidden border border-[rgba(0,0,0,0.1)] bg-[linear-gradient(135deg,#f6f5f4,#e8e5e0)]">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">📘</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)]">{book.title}</h1>
            <p className="mt-1 text-[13px] text-[#615d59]">
              <Link href={`/authors/${book.authorId}`} className="text-[#0075de] hover:underline">
                {author?.name ?? "未知"}
              </Link>
            </p>

            {/* Douban metadata */}
            {hasDoubanMeta && (
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {book.publisher && (
                  <div>
                    <span className="text-[#9b958e]">出版社</span>
                    <span className="ml-1.5 text-[rgba(0,0,0,0.65)]">{book.publisher}</span>
                  </div>
                )}
                {book.publishDate && (
                  <div>
                    <span className="text-[#9b958e]">出版日期</span>
                    <span className="ml-1.5 text-[rgba(0,0,0,0.65)]">{book.publishDate}</span>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <span className="text-[#9b958e]">ISBN</span>
                    <span className="ml-1.5 text-[rgba(0,0,0,0.65)] font-mono">{book.isbn}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] text-[#9b958e] min-w-[28px]">标签</span>
              {(book.tags ?? []).map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 bg-[#f6f5f4] border border-[rgba(0,0,0,0.06)] rounded px-2 py-0.5 text-[12px] text-[#615d59]">
                  {tag}
                  <button
                    onClick={() => store.removeBookTag(id, tag)}
                    className="text-[#b0aaa3] hover:text-[#d83931] text-[14px] leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="添加标签"
                className="border border-dashed border-[rgba(0,0,0,0.15)] rounded px-2 py-0.5 text-[12px] text-[#615d59] bg-transparent outline-none w-20 placeholder:text-[#c5bfb8]"
              />
            </div>

            {/* Divider */}
            <div className="mt-2.5 border-t border-[rgba(0,0,0,0.06)]" />

            {/* Status + dates */}
            <div className="mt-2.5 flex items-center gap-2.5 text-[13px] flex-wrap">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[12px] font-medium cursor-pointer border"
                  style={statusInfo ? { background: statusInfo.bg, color: statusInfo.color, borderColor: statusInfo.border } : { background: '#f6f5f4', color: '#615d59', borderColor: 'rgba(0,0,0,0.1)' }}
                >
                  {statusInfo ? `${statusInfo.icon} ${statusInfo.label}` : '设置状态'}
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-[rgba(0,0,0,0.1)] rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#f6f5f4] flex items-center gap-2"
                        style={{ color: opt.color }}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {book.startedReadingAt && (
                <>
                  <span className="text-[#d5d0ca] text-[11px]">·</span>
                  <span className="text-[12px] text-[#9b958e]">开始</span>
                  {editingDate === 'startedReadingAt' ? (
                    <input
                      ref={dateInputRef}
                      type="date"
                      defaultValue={formatDate(book.startedReadingAt)}
                      onChange={e => handleDateChange('startedReadingAt', e.target.value)}
                      className="text-[13px] text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.15)] rounded px-1 py-0.5 outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingDate('startedReadingAt')}
                      className="text-[13px] text-[rgba(0,0,0,0.65)] cursor-pointer border-b border-dashed border-[rgba(0,0,0,0.15)] pb-px hover:text-[#0075de] hover:border-[#0075de]"
                    >
                      {formatDate(book.startedReadingAt)}
                    </span>
                  )}
                </>
              )}

              {book.finishedReadingAt && (
                <>
                  <span className="text-[#d5d0ca] text-[11px]">·</span>
                  <span className="text-[12px] text-[#9b958e]">完成</span>
                  {editingDate === 'finishedReadingAt' ? (
                    <input
                      ref={dateInputRef}
                      type="date"
                      defaultValue={formatDate(book.finishedReadingAt)}
                      onChange={e => handleDateChange('finishedReadingAt', e.target.value)}
                      className="text-[13px] text-[rgba(0,0,0,0.65)] border border-[rgba(0,0,0,0.15)] rounded px-1 py-0.5 outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingDate('finishedReadingAt')}
                      className="text-[13px] text-[rgba(0,0,0,0.65)] cursor-pointer border-b border-dashed border-[rgba(0,0,0,0.15)] pb-px hover:text-[#0075de] hover:border-[#0075de]"
                    >
                      {formatDate(book.finishedReadingAt)}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-3">
              <div className="max-w-[280px] flex-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[#615d59]">阅读进度</span>
                  <span className="font-semibold text-[#097fe8]">{checkedCount}/{totalCount} &middot; {progress}%</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#f2f9ff]">
                  <div className="h-full rounded-full bg-[#0075de] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
          {selectedRound && (
            <RoundSelector
              rounds={store.rounds.filter(r => r.bookId === id)}
              selectedRound={selectedRound}
              onSelectRound={(round) => setSelectedRoundId(round.id)}
              onNewRound={() => setRoundDialogOpen(true)}
            />
          )}
        </div>
      </div>

      {selectedRound && (
        <TableView
          items={items}
          statuses={statuses}
          round={selectedRound}
          onSchedule={(tocItemId, date) => store.scheduleChapter(tocItemId, roundId, date)}
          onToggle={(tocItemId) => store.toggleChapter(tocItemId, roundId)}
          rightAction={
            <Link
              href={`/books/${id}/edit`}
              className="rounded-full px-3 py-1 text-xs font-medium bg-[rgba(0,0,0,0.05)] text-[#615d59] hover:bg-[rgba(0,0,0,0.08)] transition-colors"
            >
              编辑目录
            </Link>
          }
        />
      )}
      <NewRoundDialog
        open={roundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        roundNumber={(store.rounds.filter(r => r.bookId === id).reduce((max, r) => Math.max(max, r.roundNumber), 0)) + 1}
        onConfirm={(inherit) => {
          store.startNewRound(id, inherit)
        }}
      />
    </div>
  )
}
