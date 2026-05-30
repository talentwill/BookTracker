'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    // Validate invite code first (check if code exists and is unused)
    const { data: codeData, error: codeError } = await supabase
      .from('invite_codes')
      .select('id')
      .eq('code', inviteCode)
      .eq('is_used', false)
      .single()

    if (codeError || !codeData) {
      setError('邀请码无效或已使用')
      setLoading(false)
      return
    }

    // Sign up
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message || '注册失败')
      setLoading(false)
      return
    }

    // Mark invite code as used by this user
    await supabase.rpc('validate_and_use_invite_code', { p_code: inviteCode, p_user_id: data.user.id })

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold text-center">注册</h1>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">邀请码</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              placeholder="请输入邀请码"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          已有账号？{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
