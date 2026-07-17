import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { User, UserRole } from "@/types"
import { AuthService } from "@/services"
import { useSharedStore } from "./sharedStore"
import { useTimetableStore } from "./timetableStore"
import { supabase } from "@/lib/supabase/client"


interface AuthState {
  user: User | null
  isAuthenticated: boolean
  userPasswords: Record<string, string>
  sessionLoginTime?: number
  lastActivityTime?: number
  login: (userId: string, password: string, role?: UserRole) => Promise<boolean>
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
  registerHOD: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    deptName: string,
    deptCode: string
  ) => Promise<{ success: boolean; message: string }>
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
        const lower = userId.toLowerCase()

        // 1. Try Supabase Auth first (for HOD / Faculty)
        if (lower.includes("@")) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: userId.trim(),
              password: password
            })

            if (!authErr && authData.user) {
              // Fetch profile from public.users
              const { data: profile, error: profErr } = await supabase
                .from("users")
                .select(`
                  id,
                  full_name,
                  email,
                  phone,
                  role,
                  departments (
                    id,
                    name,
                    code
                  )
                `)
                .eq("id", authData.user.id)
                .single()

              if (!profErr && profile) {
                const mappedUser: User = {
                  id: profile.id,
                  name: profile.full_name,
                  role: (profile.role.toLowerCase() === "hod" ? "hod" : "faculty") as UserRole,
                  email: profile.email,
                  department: (profile.departments as any)?.name || "Computer Science & Engineering",
                  phone: profile.phone || "",
                  className: "",
                  year: "",
                  section: "",
                  mentor: "",
                }

                set({
                  user: mappedUser,
                  isAuthenticated: true,
                  sessionLoginTime: Date.now(),
                  lastActivityTime: Date.now()
                })
                useSharedStore.getState().setCurrentPage("dashboard")
                useTimetableStore.getState().setSelectedCell(null)
                
                // Trigger academic sync
                const { useAcademicStore } = require("@/store")
                useAcademicStore.getState().syncWithSupabase().catch(console.error)

                return true
              }
            }
          } catch (e) {
            console.warn("Supabase Auth sign-in failed, trying fallback:", e)
          }
        }

        // 2. Fallback to Local Auth (CR/LR and Local HOD/Faculty test credentials)
        let detectedRole = role
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
        supabase.auth.signOut().catch(console.error)
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

      registerHOD: async (email, password, fullName, phone, deptName, deptCode) => {
        try {
          // 1. Sign up user in Supabase Auth
          const { data: authData, error: authErr } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password,
          })

          if (authErr) throw authErr
          if (!authData.user) {
            return { success: false, message: "Failed to create user login credentials." }
          }

          // 2. Get or create the department
          const codeUpper = deptCode.trim().toUpperCase()
          const { data: existingDept } = await supabase
            .from("departments")
            .select("id")
            .eq("code", codeUpper)
            .maybeSingle()

          let deptId: string
          if (existingDept?.id) {
            // Department already exists — reuse it
            deptId = existingDept.id
          } else {
            // Create a new department
            const { data: newDept, error: deptErr } = await supabase
              .from("departments")
              .insert({
                name: deptName.trim(),
                code: codeUpper,
                description: `${deptName} Department`
              })
              .select("id")
              .single()
            if (deptErr) throw deptErr
            deptId = newDept.id
          }


          // 3. Create the profile in the public.users table
          const { error: userErr } = await supabase
            .from("users")
            .insert({
              id: authData.user.id,
              full_name: fullName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              faculty_code: `HOD-${deptCode.trim().toUpperCase()}`,
              role: "HOD",
              department_id: deptId,
              is_active: true
            })

          if (userErr) throw userErr

          // 4. Log in the newly registered HOD
          const mappedUser: User = {
            id: authData.user.id,
            name: fullName.trim(),
            role: "hod",
            email: email.trim().toLowerCase(),
            department: deptName.trim(),
            phone: phone.trim(),
            className: "",
            year: "",
            section: "",
            mentor: "",
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            sessionLoginTime: Date.now(),
            lastActivityTime: Date.now()
          })

          useSharedStore.getState().setCurrentPage("dashboard")
          useTimetableStore.getState().setSelectedCell(null)

          return { success: true, message: "HOD account created and logged in!" }
        } catch (err: any) {
          console.error("HOD registration failed:", err)
          return { success: false, message: err.message || "Failed to create HOD account." }
        }
      },

    }),
    {
      name: "attendance-auth-store-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
