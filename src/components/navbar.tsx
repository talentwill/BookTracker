"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AddBookDialog } from "@/components/add-book-dialog"

const tabs = [
  { label: "首页", href: "/" },
  { label: "书架", href: "/books" },
  { label: "作者", href: "/authors" },
] as const

export function Navbar() {
  const pathname = usePathname()
  const [dialogOpen, setDialogOpen] = useState(false)

  function isActiveTab(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] bg-white px-6 py-2.5">
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

        {/* Add Book Button */}
        <Button
          onClick={() => setDialogOpen(true)}
          className="text-[13px] font-semibold bg-[#0075de] hover:bg-[#005bab] text-white shrink-0"
          size="sm"
        >
          + 添加书籍
        </Button>
      </nav>

      <AddBookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
