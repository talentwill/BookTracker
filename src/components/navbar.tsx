"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "首页", href: "/" },
  { label: "书架", href: "/bookshelf" },
  { label: "作者", href: "/authors" },
] as const

export function Navbar() {
  const pathname = usePathname()

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
          <Link
            href="/settings"
            className="flex items-center justify-center w-8 h-8 rounded-md text-[#615d59] hover:text-[rgba(0,0,0,0.95)] hover:bg-[#f6f5f4] transition-colors"
            title="设置"
          >
            ⚙️
          </Link>
          <Link
            href="/books/add"
            className="inline-flex items-center justify-center h-8 px-3 text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white rounded-md transition-colors"
          >
            + 添加书籍
          </Link>
        </div>
      </div>
    </nav>
  )
}
