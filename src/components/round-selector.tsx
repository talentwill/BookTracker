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
