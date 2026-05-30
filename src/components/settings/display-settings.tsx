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

  function handleBooksPerPageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    if (isNaN(raw)) return
    const clamped = Math.min(100, Math.max(10, raw))
    updateProfile.mutate({ books_per_page: clamped })
  }

  return (
    <div className="px-6 py-5 max-w-xl">
      <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)] mb-1">显示设置</h1>
      <p className="text-[13px] text-[#9b958e] mb-6">主题与分页配置</p>

      {/* Theme */}
      <div className="mb-6">
        <label className="text-[13px] font-semibold text-[rgba(0,0,0,0.65)] block mb-2">主题</label>
        <div className="flex gap-2">
          {themes.map(t => (
            <button
              key={t.value}
              onClick={() => handleThemeChange(t.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${
                theme === t.value
                  ? "border-[#0075de] bg-[#f2f9ff] text-[#0075de]"
                  : "border-[rgba(0,0,0,0.15)] bg-white text-[#615d59] hover:border-[rgba(0,0,0,0.3)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)] mb-5" />

      {/* Books per page */}
      <div className="mb-6">
        <label className="text-[13px] font-semibold text-[rgba(0,0,0,0.65)] block mb-2">每页显示数量</label>
        <input
          type="number"
          min={10}
          max={100}
          defaultValue={profile?.books_per_page ?? 20}
          onChange={handleBooksPerPageChange}
          className="w-24 px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] outline-none focus:border-[#0075de] bg-white"
        />
        <span className="text-[11px] text-[#9b958e] mt-1 block">范围 10-100</span>
      </div>
    </div>
  )
}
