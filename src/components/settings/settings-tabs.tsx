"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AiSettings } from "./ai-settings"
import { DisplaySettings } from "./display-settings"
import { AccountSettings } from "./account-settings"
import { DataSettings } from "./data-settings"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="ai" className="w-full">
      <TabsList className="mb-6">
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
