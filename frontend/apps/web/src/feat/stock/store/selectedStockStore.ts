import { create } from 'zustand'

interface SelectedStockState {
  selectedStockCode: string | null
  setSelectedStockCode: (code: string) => void
  initializeSelectedStockCode: (code: string) => void
}

export const useSelectedStockStore = create<SelectedStockState>(set => ({
  selectedStockCode: null,
  setSelectedStockCode: code => {
    set({ selectedStockCode: code })
  },
  initializeSelectedStockCode: code => {
    set(state => {
      if (state.selectedStockCode) return state

      return { selectedStockCode: code }
    })
  },
}))
