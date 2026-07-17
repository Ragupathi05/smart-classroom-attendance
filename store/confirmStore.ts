import { create } from "zustand"

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
}

interface ConfirmState {
  isOpen: boolean
  options: ConfirmOptions | null
  confirm: (options: ConfirmOptions) => void
  close: () => void
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  options: null,
  confirm: (options) => set({ isOpen: true, options }),
  close: () => set({ isOpen: false, options: null })
}))
