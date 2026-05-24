import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

const SYSTEM_PROMPT = `你是一个目录整理助手。请将用户输入的目录文本整理成标准的缩进大纲格式。
规则：
- 每行以 "- " 开头
- 使用 2 空格缩进表示层级
- 去除页码、多余符号
- 保留原始章节标题
- 只输出整理后的目录，不要解释`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, provider, apiKey, baseUrl, model } = body as {
    text: string
    provider: 'claude' | 'openai'
    apiKey: string
    baseUrl?: string
    model?: string
  }

  if (!text?.trim() || !apiKey?.trim()) {
    return NextResponse.json({ error: "text and apiKey are required" }, { status: 400 })
  }

  if (provider !== 'claude' && provider !== 'openai') {
    return NextResponse.json({ error: "provider must be 'claude' or 'openai'" }, { status: 400 })
  }

  try {
    let outline: string

    if (provider === 'claude') {
      const client = new Anthropic({
        apiKey,
        baseURL: baseUrl || undefined,
      })
      const response = await client.messages.create({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      })
      const block = response.content[0]
      outline = block.type === 'text' ? block.text : ''
    } else {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
      })
      const response = await client.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
      })
      outline = response.choices[0]?.message?.content || ''
    }

    return NextResponse.json({ outline })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
