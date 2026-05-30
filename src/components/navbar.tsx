"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase/client"

const tabs = [
  { label: "首页", href: "/" },
  { label: "书架", href: "/bookshelf" },
  { label: "作者", href: "/authors" },
  { label: "时间线", href: "/timeline" },
] as const

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  function isActiveTab(href: string) {
    if (href === "/") return pathname === "/"
    if (href === "/bookshelf") return pathname === "/bookshelf" || pathname.startsWith("/books/")
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[rgba(0,0,0,0.1)] bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-[#0075de]">
            <span className="text-white font-bold text-sm leading-none">B</span>
          </div>
          <span className="text-[rgba(0,0,0,0.95)] font-semibold text-[15px]">
            BookTracker
          </span>
        </Link>

        {/* Tab Switcher */}
        <div className="bg-[#f6f5f4] rounded-md p-0.5 flex items-center gap-0.5">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                isActiveTab(tab.href)
                  ? "bg-[#0075de] text-white font-semibold rounded px-3 py-1 text-[13px] transition-colors"
                  : "text-[#615d59] rounded px-3 py-1 text-[13px] transition-colors hover:text-[rgba(0,0,0,0.95)]"
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0075de] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
                title="用户菜单"
              >
                {user.email?.charAt(0).toUpperCase()}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-[rgba(0,0,0,0.1)] py-1 z-50">
                  <div className="px-4 py-2.5 text-[13px] text-[#615d59] truncate">
                    {user.email}
                  </div>
                  <div className="border-t border-[rgba(0,0,0,0.08)]" />
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-[13px] text-[rgba(0,0,0,0.95)] hover:bg-[#f6f5f4] transition-colors"
                  >
                    设置
                  </Link>
                  <button
                    onClick={() => {
                      setDropdownOpen(false)
                      handleLogout()
                    }}
                    className="block w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-8 px-3 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
