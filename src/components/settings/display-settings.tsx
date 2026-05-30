"use client"

import { useTheme } from "next-themes"
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile"

const themes = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
] as const

export function DisplaySettings() {
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { setTheme, theme } = useTheme()

  function handleThemeChange(value: string) {
    setTheme(value)
    updateProfile.mutate({ theme: value })
  }

  function handleBooksPerPageBlur(e: React.FocusEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    if (isNaN(raw) || raw === (profile?.books_per_page ?? 20)) return
    const clamped = Math.min(100, Math.max(10, raw))
    updateProfile.mutate({ books_per_page: clamped })
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <div>
        <label className="text-[13px] font-semibold text-muted-foreground block mb-2">主题</label>
        <div className="flex gap-2">
          {themes.map(t => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${
                theme === t.value
                  ? "border-[#0075de] bg-[#f2f9ff] dark:bg-[#0075de]/15 text-[#0075de] dark:text-[#5bb8f5]"
                  : "border-input bg-background text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Books per page */}
      <div>
        <label className="text-[13px] font-semibold text-muted-foreground block mb-2">每页显示数量</label>
        <input
          type="number"
          min={10}
          max={100}
          key={profile?.books_per_page ?? 20}
          defaultValue={profile?.books_per_page ?? 20}
          onBlur={handleBooksPerPageBlur}
          onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur() }}
          className="w-24 px-3 py-1.5 border border-input rounded-md text-[13px] outline-none focus:border-[#0075de] bg-background"
        />
        <span className="text-[11px] text-muted-foreground mt-1 block">范围 10-100</span>
      </div>
    </div>
  )
}
