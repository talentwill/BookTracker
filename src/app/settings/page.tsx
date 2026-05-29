"use client"

import { useState } from "react"
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-profile"

export default function SettingsPage() {
  const { data: profile } = useProfile()
  return <SettingsForm key={profile?.id ?? "init"} profile={profile} />
}

function SettingsForm({ profile }: { profile: ReturnType<typeof useProfile>["data"] }) {
  const updateProfile = useUpdateProfile()
  const [saved, setSaved] = useState(false)
  const [apiKey, setApiKey] = useState(profile?.ai_api_key ?? "")
  const [baseUrl, setBaseUrl] = useState(profile?.ai_base_url ?? "")
  const [model, setModel] = useState(profile?.ai_model ?? "")

  function handleSave() {
    updateProfile.mutate(
      {
        ai_api_key: apiKey,
        ai_base_url: baseUrl,
        ai_model: model,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      }
    )
  }

  return (
    <div className="px-6 py-5 max-w-xl">
      <h1 className="text-xl font-bold text-[rgba(0,0,0,0.95)] mb-1">设置</h1>
      <p className="text-[13px] text-[#9b958e] mb-6">配置 AI 服务用于目录导入</p>

      {/* Default provider */}
      <div className="mb-6">
        <label className="text-[13px] font-semibold text-[rgba(0,0,0,0.65)] block mb-2">默认 AI 提供商</label>
        <div className="flex gap-2">
          {(['claude', 'openai'] as const).map(p => (
            <button
              key={p}
              onClick={() => updateProfile.mutate({ ai_provider: p })}
              className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors ${
                profile?.ai_provider === p
                  ? 'border-[#0075de] bg-[#f2f9ff] text-[#0075de]'
                  : 'border-[rgba(0,0,0,0.15)] bg-white text-[#615d59] hover:border-[rgba(0,0,0,0.3)]'
              }`}
            >
              {p === 'claude' ? 'Claude' : 'OpenAI'}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)] mb-5" />

      {/* AI config */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[14px] font-semibold text-[rgba(0,0,0,0.95)]">
            {profile?.ai_provider === 'openai' ? 'OpenAI' : 'Claude'}
          </span>
          <span className="text-[11px] text-[#9b958e] bg-[#f6f5f4] px-1.5 py-0.5 rounded">
            {profile?.ai_provider === 'openai' ? 'OpenAI' : 'Anthropic'}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={profile?.ai_provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] font-mono outline-none focus:border-[#0075de] bg-white"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">Base URL</label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] font-mono outline-none focus:border-[#0075de] bg-white"
            />
            <span className="text-[11px] text-[#9b958e] mt-1 block">留空使用默认地址，或填入代理地址</span>
          </div>
          <div>
            <label className="text-[12px] text-[#615d59] block mb-1">模型</label>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] font-mono outline-none focus:border-[#0075de] bg-white"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)] mb-5" />

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-[12px] text-[#0a8a3e]">已保存</span>}
        <button
          onClick={handleSave}
          className="bg-[#0075de] text-white border-none rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#005bab]"
        >
          保存设置
        </button>
      </div>
    </div>
  )
}
