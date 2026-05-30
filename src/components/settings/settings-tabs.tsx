"use client"

import { useState } from "react"
import { AiSettings } from "./ai-settings"
import { DisplaySettings } from "./display-settings"
import { AccountSettings } from "./account-settings"
import { DataSettings } from "./data-settings"

const tabs = [
  { key: "ai", label: "AI 服务" },
  { key: "display", label: "显示偏好" },
  { key: "account", label: "账户" },
  { key: "data", label: "数据管理" },
] as const

type TabKey = (typeof tabs)[number]["key"]

const tabComponents: Record<TabKey, React.ComponentType> = {
  ai: AiSettings,
  display: DisplaySettings,
  account: AccountSettings,
  data: DataSettings,
}

export function SettingsTabs() {
  const [active, setActive] = useState<TabKey>("ai")
  const Content = tabComponents[active]

  return (
    <div className="flex gap-6">
      <nav className="w-40 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`w-full text-left px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
              active === tab.key
                ? "bg-[#f2f9ff] dark:bg-[#0075de]/15 text-[#0075de] dark:text-[#5bb8f5]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-w-0">
        <Content />
      </div>
    </div>
  )
}
