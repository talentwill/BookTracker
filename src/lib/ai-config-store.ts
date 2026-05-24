import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface AIConfigStore {
  defaultProvider: 'claude' | 'openai'
  claude: ProviderConfig
  openai: ProviderConfig

  setDefaultProvider: (provider: 'claude' | 'openai') => void
  updateClaude: (config: Partial<ProviderConfig>) => void
  updateOpenai: (config: Partial<ProviderConfig>) => void
}

export const useAIConfigStore = create<AIConfigStore>()(
  persist(
    (set) => ({
      defaultProvider: 'claude',
      claude: {
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-sonnet-4-20250514',
      },
      openai: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      },

      setDefaultProvider: (provider) => set({ defaultProvider: provider }),
      updateClaude: (config) => set(s => ({ claude: { ...s.claude, ...config } })),
      updateOpenai: (config) => set(s => ({ openai: { ...s.openai, ...config } })),
    }),
    { name: "book-tracker-ai-config" }
  )
)
