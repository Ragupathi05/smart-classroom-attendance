import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { AppNotification } from "@/types"

interface SharedState {
  currentPage: string
  notifications: AppNotification[]
  setCurrentPage: (page: string) => void
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void
  markNotificationsRead: () => void
}

const getLegacySharedState = () => {
  if (typeof window === "undefined") return { currentPage: "dashboard", notifications: [] }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          currentPage: parsed.state.currentPage || "dashboard",
          notifications: parsed.state.notifications || [],
        }
      }
    }
  } catch {}
  return { currentPage: "dashboard", notifications: [] }
}

const legacy = getLegacySharedState()

export const useSharedStore = create<SharedState>()(
  persist(
    (set) => ({
      currentPage: legacy.currentPage,
      notifications: legacy.notifications,

      setCurrentPage: (page) => set({ currentPage: page }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              read: false,
              ...notification,
            },
            ...state.notifications,
          ],
        })),

      markNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            read: true,
          })),
        })),
    }),
    {
      name: "attendance-shared-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
