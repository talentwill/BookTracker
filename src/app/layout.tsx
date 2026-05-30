import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { Navbar } from "@/components/navbar"
import { AuthProvider } from "@/components/auth-provider"
import { QueryProvider } from "@/components/query-provider"

export const metadata: Metadata = {
  title: "BookTracker",
  description: "图书章节追踪系统",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <Navbar />
              <main className="mx-auto max-w-5xl">{children}</main>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
