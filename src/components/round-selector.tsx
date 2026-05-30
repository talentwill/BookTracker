"use client"

import { useState } from "react"
import type { ReadingRound } from "@/lib/types"

interface RoundSelectorProps {
  rounds: ReadingRound[]
  selectedRound: ReadingRound
  onSelectRound: (round: ReadingRound) => void
  onNewRound: () => void
}

export function RoundSelector({ rounds, selectedRound, onSelectRound, onNewRound }: RoundSelectorProps) {
  const [open, setOpen] = useState(false)
  const sorted = [...rounds].sort((a, b) => b.round_number - a.round_number)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f9ff] dark:bg-[#097fe8]/20 px-2.5 py-0.5 text-xs font-semibold text-[#097fe8] dark:text-[#5bb8f5] hover:bg-[#e0ecf8] dark:hover:bg-[#097fe8]/30"
        >
          第 {selectedRound.round_number} 轮 ▾
        </button>
        {open && (
          <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg">
            {sorted.map(round => (
              <button
                key={round.id}
                onClick={() => { onSelectRound(round); setOpen(false) }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-accent ${
                  round.id === selectedRound.id ? "font-semibold text-[#097fe8]" : "text-foreground"
                }`}
              >
                <span>第 {round.round_number} 轮</span>
                {round.status === "active" && (
                  <span className="rounded-full bg-[#e6f9ee] dark:bg-[#1aae39]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#1aae39] dark:text-[#4ade80]">进行中</span>
                )}
              </button>
            ))}
            <div className="border-t border-border" />
            <button
              onClick={() => { onNewRound(); setOpen(false) }}
              className="flex w-full items-center px-3 py-1.5 text-xs font-medium text-[#097fe8] hover:bg-accent"
            >
              + 开启新一轮
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
