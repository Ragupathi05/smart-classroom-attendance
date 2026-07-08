import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User, UserRole } from "@/types"
import { AuthService } from "@/services"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (userId: string, password: string, role: UserRole) => Promise<boolean>
  logout: () => void
  updateUserProfile: (payload: { name: string; email: string }) => { success: boolean; message: string }
}

const getLegacyAuthState = () => {
  if (typeof window === "undefined") return { user: null, isAuthenticated: false }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          user: parsed.state.user || null,
          isAuthenticated: parsed.state.isAuthenticated || false,
        }
      }
    }
  } catch {
    // Ignore
  }
  return { user: null, isAuthenticated: false }
}

const legacy = getLegacyAuthState()

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: legacy.user,
      isAuthenticated: legacy.isAuthenticated,

      login: async (userId, password, role) => {
        if (!userId || !password) return false
        const user = await AuthService.login(userId, role)
        if (user) {
          set({ user, isAuthenticated: true })
          return true
        }
        return false
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      updateUserProfile: ({ name, email }) => {
        const trimmedName = name.trim()
        const trimmedEmail = email.trim().toLowerCase()

        if (!trimmedName || !trimmedEmail) {
          return { success: false, message: "Name and email are required." }
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(trimmedEmail)) {
          return { success: false, message: "Please enter a valid email address." }
        }

        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                name: trimmedName,
                email: trimmedEmail,
              }
            : null,
        }))

        return { success: true, message: "Profile settings updated." }
      },
    }),
    {
      name: "attendance-auth-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
