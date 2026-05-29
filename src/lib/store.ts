import { create } from 'zustand'

interface UIState {
  // Add UI-only state here as needed
  // For now, keep it minimal
}

export const useUIStore = create<UIState>(() => ({}))
