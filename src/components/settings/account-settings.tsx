"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function AccountSettings() {
  const supabase = createClient()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [newEmail, setNewEmail] = useState("")
  const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  async function handlePasswordUpdate() {
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "密码至少需要 6 个字符" })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "两次输入的密码不一致" })
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordMessage({ type: "error", text: error.message })
    } else {
      setPasswordMessage({ type: "success", text: "密码已更新" })
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  async function handleEmailUpdate() {
    setEmailMessage(null)

    if (!newEmail.includes("@")) {
      setEmailMessage({ type: "error", text: "请输入有效的邮箱地址" })
      return
    }

    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setEmailLoading(false)

    if (error) {
      setEmailMessage({ type: "error", text: error.message })
    } else {
      setEmailMessage({ type: "success", text: "验证邮件已发送，请查收" })
      setNewEmail("")
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <div>
        <h3 className="text-[14px] font-semibold text-[rgba(0,0,0,0.95)] mb-4">修改密码</h3>
        <div className="space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="新密码"
            className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] outline-none focus:border-[#0075de] bg-white"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="确认新密码"
            className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] outline-none focus:border-[#0075de] bg-white"
          />
          {passwordMessage && (
            <p className={passwordMessage.type === "success" ? "text-[12px] text-[#0a8a3e]" : "text-[12px] text-[#d44333]"}>
              {passwordMessage.text}
            </p>
          )}
          <button
            onClick={handlePasswordUpdate}
            disabled={passwordLoading}
            className="bg-[#0075de] text-white border-none rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#005bab] disabled:opacity-50"
          >
            {passwordLoading ? "更新中..." : "更新密码"}
          </button>
        </div>
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)]" />

      {/* Change Email */}
      <div>
        <h3 className="text-[14px] font-semibold text-[rgba(0,0,0,0.95)] mb-4">修改邮箱</h3>
        <div className="space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="新邮箱地址"
            className="w-full px-3 py-1.5 border border-[rgba(0,0,0,0.15)] rounded-md text-[13px] outline-none focus:border-[#0075de] bg-white"
          />
          {emailMessage && (
            <p className={emailMessage.type === "success" ? "text-[12px] text-[#0a8a3e]" : "text-[12px] text-[#d44333]"}>
              {emailMessage.text}
            </p>
          )}
          <button
            onClick={handleEmailUpdate}
            disabled={emailLoading}
            className="bg-[#0075de] text-white border-none rounded-lg px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#005bab] disabled:opacity-50"
          >
            {emailLoading ? "更新中..." : "更新邮箱"}
          </button>
        </div>
      </div>
    </div>
  )
}
