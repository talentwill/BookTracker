import { create } from 'zustand'

type UIState = Record<string, never>

export const useUIStore = create<UIState>(() => ({}))
