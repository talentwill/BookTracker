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
  const sorted = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-full bg-[#f2f9ff] px-2.5 py-0.5 text-xs font-semibold text-[#097fe8] hover:bg-[#e0ecf8]"
        >
          第 {selectedRound.roundNumber} 轮 ▾
        </button>
        {open && (
          <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-[rgba(0,0,0,0.1)] bg-white py-1 shadow-lg">
            {sorted.map(round => (
              <button
                key={round.id}
                onClick={() => { onSelectRound(round); setOpen(false) }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[rgba(0,0,0,0.05)] ${
                  round.id === selectedRound.id ? "font-semibold text-[#097fe8]" : "text-[rgba(0,0,0,0.95)]"
                }`}
              >
                <span>第 {round.roundNumber} 轮</span>
                {round.status === "active" && (
                  <span className="rounded-full bg-[#e6f9ee] px-1.5 py-0.5 text-[10px] font-semibold text-[#1aae39]">进行中</span>
                )}
              </button>
            ))}
            <div className="border-t border-[rgba(0,0,0,0.05)]" />
            <button
              onClick={() => { onNewRound(); setOpen(false) }}
              className="flex w-full items-center px-3 py-1.5 text-xs font-medium text-[#097fe8] hover:bg-[rgba(0,0,0,0.05)]"
            >
              + 开启新一轮
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
