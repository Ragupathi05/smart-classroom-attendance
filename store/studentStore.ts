import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Student } from "@/types"
import { StudentService } from "@/services"

interface StudentState {
  classStudents: Student[]
  addClassStudent: (entry: { rollNumber: string; name: string }) => { success: boolean; message: string }
  updateClassStudent: (id: string, entry: { rollNumber: string; name: string }) => { success: boolean; message: string }
  deleteClassStudent: (id: string) => void
  importClassStudents: (entries: Array<{ rollNumber: string; name: string }>) => { added: number; skipped: number }
}

const getLegacyStudentState = () => {
  const defaults = StudentService.getSeedStudents()
  if (typeof window === "undefined") return { classStudents: defaults }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state?.classStudents) {
        return { classStudents: parsed.state.classStudents }
      }
    }
  } catch {}
  return { classStudents: defaults }
}

const legacy = getLegacyStudentState()

const normalizeRoll = (rollNumber: string) => rollNumber.trim().toUpperCase()
const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ")

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      classStudents: legacy.classStudents,

      addClassStudent: ({ rollNumber, name }) => {
        const normalizedRoll = normalizeRoll(rollNumber)
        const normalizedName = normalizeName(name)
        if (!normalizedRoll || !normalizedName) {
          return { success: false, message: "Roll number and name are required." }
        }

        const state = get()
        const duplicate = state.classStudents.some(
          (student) => normalizeRoll(student.rollNumber) === normalizedRoll
        )
        if (duplicate) {
          return { success: false, message: "Roll number already exists." }
        }

        const newStudent: Student = {
          id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          rollNumber: normalizedRoll,
          name: normalizedName,
          status: "present",
        }

        set((prev) => ({
          classStudents: [...prev.classStudents, newStudent].sort((a, b) =>
            a.rollNumber.localeCompare(b.rollNumber)
          ),
        }))

        return { success: true, message: "Student added successfully." }
      },

      updateClassStudent: (id, { rollNumber, name }) => {
        const normalizedRoll = normalizeRoll(rollNumber)
        const normalizedName = normalizeName(name)
        if (!normalizedRoll || !normalizedName) {
          return { success: false, message: "Roll number and name are required." }
        }

        const state = get()
        const duplicate = state.classStudents.some(
          (student) => student.id !== id && normalizeRoll(student.rollNumber) === normalizedRoll
        )
        if (duplicate) {
          return { success: false, message: "Roll number already exists." }
        }

        set((prev) => ({
          classStudents: prev.classStudents
            .map((student) =>
              student.id === id
                ? { ...student, rollNumber: normalizedRoll, name: normalizedName }
                : student
            )
            .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
        }))

        return { success: true, message: "Student updated successfully." }
      },

      deleteClassStudent: (id) =>
        set((prev) => ({
          classStudents: prev.classStudents.filter((student) => student.id !== id),
        })),

      importClassStudents: (entries) => {
        const state = get()
        const existingRolls = new Set(state.classStudents.map((student) => normalizeRoll(student.rollNumber)))
        const toAdd: Student[] = []
        let skipped = 0

        for (const entry of entries) {
          const normalizedRoll = normalizeRoll(entry.rollNumber)
          const normalizedName = normalizeName(entry.name)
          if (!normalizedRoll || !normalizedName || existingRolls.has(normalizedRoll)) {
            skipped += 1
            continue
          }

          existingRolls.add(normalizedRoll)
          toAdd.push({
            id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            rollNumber: normalizedRoll,
            name: normalizedName,
            status: "present",
          })
        }

        if (toAdd.length > 0) {
          set((prev) => ({
            classStudents: [...prev.classStudents, ...toAdd].sort((a, b) =>
              a.rollNumber.localeCompare(b.rollNumber)
            ),
          }))
        }

        return { added: toAdd.length, skipped }
      },
    }),
    {
      name: "attendance-student-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
