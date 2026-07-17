import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User, UserRole } from "@/types"
import { AuthService } from "@/services"
import { useSharedStore } from "./sharedStore"
import { useTimetableStore } from "./timetableStore"

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  userPasswords: Record<string, string>
  sessionLoginTime?: number
  lastActivityTime?: number
  login: (userId: string, password: string, role: UserRole) => Promise<boolean>
  logout: () => void
  changeUserPassword: (userId: string, current: string, newPass: string) => { success: boolean; message: string }
  resetUserPassword: (userId: string, role: UserRole) => void
  updateUserProfile: (payload: {
    name: string
    email: string
    department?: string
    year?: string
    section?: string
    phone?: string
    mentor?: string
  }) => { success: boolean; message: string }
}

const getLegacyAuthState = () => {
  if (typeof window === "undefined") return { user: null, isAuthenticated: false, userPasswords: {} }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          user: parsed.state.user || null,
          isAuthenticated: parsed.state.isAuthenticated || false,
          userPasswords: parsed.state.userPasswords || {}
        }
      }
    }
  } catch {
    // Ignore
  }
  return { user: null, isAuthenticated: false, userPasswords: {} }
}

const legacy = getLegacyAuthState()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: legacy.user,
      isAuthenticated: legacy.isAuthenticated,
      userPasswords: legacy.userPasswords,

      login: async (userId, password, role) => {
        if (!userId || !password) return false
        let detectedRole = role
        const lower = userId.toLowerCase()

        if (!detectedRole) {
          if (lower.includes("hod")) {
            detectedRole = "hod"
          } else {
            // Check if this is a student roll number assigned as CR or LR
            const rollNumber = lower.replace("-cr", "").replace("-lr", "")
            const { useStudentStore, useAcademicStore } = require("@/store")
            const students = useStudentStore.getState().classStudents || []
            const student = students.find((s: any) => s.rollNumber.toLowerCase() === rollNumber)

            if (student) {
              const sections = useAcademicStore.getState().sections || []
              const isLr = sections.some((sec: any) => sec.lrName === student.name)
              const isCr = sections.some((sec: any) => sec.crName === student.name)
              
              if (isLr) {
                detectedRole = "lr"
              } else if (isCr) {
                detectedRole = "cr"
              } else {
                detectedRole = "cr" // default fallback
              }
            } else if (lower.endsWith("-cr") || lower.includes("cr")) {
              detectedRole = "cr"
            } else if (lower.endsWith("-lr") || lower.includes("lr")) {
              detectedRole = "lr"
            } else {
              detectedRole = "faculty"
            }
          }
        }

        const state = get()
        const storedPassword = state.userPasswords?.[lower]
        const defaultPassword = 
          detectedRole === "cr" ? "MITS@CR123" :
          detectedRole === "lr" ? "MITS@LR123" :
          detectedRole === "hod" ? "admin" : "faculty"

        const activePassword = storedPassword || defaultPassword
        if (password !== activePassword) {
          return false
        }

        const user = await AuthService.login(userId, detectedRole)
        if (user) {
          set({
            user,
            isAuthenticated: true,
            sessionLoginTime: Date.now(),
            lastActivityTime: Date.now()
          })
          useSharedStore.getState().setCurrentPage("dashboard")
          useTimetableStore.getState().setSelectedCell(null)
          return true
        }
        return false
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionLoginTime: undefined,
          lastActivityTime: undefined
        })
        useSharedStore.getState().setCurrentPage("dashboard")
        useTimetableStore.getState().setSelectedCell(null)
      },

      changeUserPassword: (userId, current, newPass) => {
        const lower = userId.toLowerCase()
        const state = get()
        const storedPassword = state.userPasswords?.[lower]
        
        let detectedRole: UserRole = "faculty"
        if (state.user && state.user.id.toLowerCase() === lower) {
          detectedRole = state.user.role
        } else if (lower.includes("hod")) {
          detectedRole = "hod"
        } else {
          // Check if this is a student roll number assigned as CR or LR
          const rollNumber = lower.replace("-cr", "").replace("-lr", "")
          const { useStudentStore, useAcademicStore } = require("@/store")
          const students = useStudentStore.getState().classStudents || []
          const student = students.find((s: any) => s.rollNumber.toLowerCase() === rollNumber)

          if (student) {
            const sections = useAcademicStore.getState().sections || []
            const isLr = sections.some((sec: any) => sec.lrName === student.name)
            const isCr = sections.some((sec: any) => sec.crName === student.name)
            
            if (isLr) {
              detectedRole = "lr"
            } else if (isCr) {
              detectedRole = "cr"
            } else {
              detectedRole = "cr"
            }
          } else if (lower.endsWith("-cr") || lower.includes("cr")) {
            detectedRole = "cr"
          } else if (lower.endsWith("-lr") || lower.includes("lr")) {
            detectedRole = "lr"
          }
        }

        const defaultPassword = 
          detectedRole === "cr" ? "MITS@CR123" :
          detectedRole === "lr" ? "MITS@LR123" :
          detectedRole === "hod" ? "admin" : "faculty"
        const activePassword = storedPassword || defaultPassword

        if (current !== activePassword) {
          return { success: false, message: "Current password does not match." }
        }

        if (!newPass || newPass.length < 4) {
          return { success: false, message: "New password must be at least 4 characters long." }
        }

        set((curr) => ({
          userPasswords: {
            ...(curr.userPasswords || {}),
            [lower]: newPass
          }
        }))
        return { success: true, message: "Password updated successfully." }
      },

      resetUserPassword: (userId, role) => {
        const lower = userId.toLowerCase()
        set((curr) => {
          const newPasswords = { ...(curr.userPasswords || {}) }
          delete newPasswords[lower]
          return { userPasswords: newPasswords }
        })
      },

      updateUserProfile: ({ name, email, department, year, section, phone, mentor }) => {
        const trimmedName = name.trim()
        const trimmedEmail = email.trim().toLowerCase()

        if (!trimmedName || !trimmedEmail) {
          return { success: false, message: "Name and email are required." }
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailPattern.test(trimmedEmail) || !trimmedEmail.endsWith("@mits.ac.in")) {
          return { success: false, message: "Please enter a valid college email ending with @mits.ac.in." }
        }

        set((state) => {
          if (!state.user) return {}
          return {
            user: {
              ...state.user,
              name: trimmedName,
              email: trimmedEmail,
              department: department !== undefined ? department?.trim() : state.user.department,
              year: year !== undefined ? year?.trim() : state.user.year,
              section: section !== undefined ? section?.trim() : state.user.section,
              phone: phone !== undefined ? phone?.trim() : state.user.phone,
              mentor: mentor !== undefined ? mentor?.trim() : state.user.mentor,
            }
          }
        })

        return { success: true, message: "Profile settings updated." }
      },
    }),
    {
      name: "attendance-auth-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
