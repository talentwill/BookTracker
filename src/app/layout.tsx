import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { AuthProvider } from "@/components/auth-provider"

export const metadata: Metadata = {
  title: "BookTracker",
  description: "图书章节追踪系统",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
