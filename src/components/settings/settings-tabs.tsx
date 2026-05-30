"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AiSettings } from "@/components/settings/ai-settings"
import { DisplaySettings } from "@/components/settings/display-settings"
import { AccountSettings } from "@/components/settings/account-settings"
import { DataSettings } from "@/components/settings/data-settings"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="ai">
      <TabsList>
        <TabsTrigger value="ai">AI 服务</TabsTrigger>
        <TabsTrigger value="display">显示偏好</TabsTrigger>
        <TabsTrigger value="account">账户</TabsTrigger>
        <TabsTrigger value="data">数据管理</TabsTrigger>
      </TabsList>
      <TabsContent value="ai">
        <AiSettings />
      </TabsContent>
      <TabsContent value="display">
        <DisplaySettings />
      </TabsContent>
      <TabsContent value="account">
        <AccountSettings />
      </TabsContent>
      <TabsContent value="data">
        <DataSettings />
      </TabsContent>
    </Tabs>
  )
}
