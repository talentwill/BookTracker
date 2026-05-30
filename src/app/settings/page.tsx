"use client"

import { useProfile } from "@/lib/hooks/use-profile"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export default function SettingsPage() {
  const { data: profile } = useProfile()

  if (!profile) {
    return (
      <div className="px-6 py-5">
        <p className="text-[13px] text-[#9b958e]">请先登录</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-5 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-1">设置</h1>
      <p className="text-[13px] text-[#9b958e] mb-6">管理你的账户和偏好设置</p>
      <SettingsTabs />
    </div>
  )
}
