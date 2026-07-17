import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Student } from "@/types"
import { StudentService } from "@/services"

interface StudentState {
  classStudents: Student[]
  addClassStudent: (entry: { rollNumber: string; name: string; gender: "Male" | "Female"; mobileNumber?: string }) => { success: boolean; message: string; studentId?: string }
  updateClassStudent: (id: string, entry: { rollNumber: string; name: string; gender?: "Male" | "Female"; mobileNumber?: string }) => { success: boolean; message: string }
  deleteClassStudent: (id: string) => void
  importClassStudents: (entries: Array<{ rollNumber: string; name: string; gender?: "Male" | "Female"; mobileNumber?: string }>) => { added: number; skipped: number; addedStudentIds: string[] }
}

const getLegacyStudentState = () => {
  const defaults: Student[] = []
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

      addClassStudent: ({ rollNumber, name, gender, mobileNumber }) => {
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
          gender,
          mobileNumber: mobileNumber || "",
        }

        set((prev) => ({
          classStudents: [...prev.classStudents, newStudent].sort((a, b) =>
            a.rollNumber.localeCompare(b.rollNumber)
          ),
        }))

        return { success: true, message: "Student added successfully.", studentId: newStudent.id }
      },

      updateClassStudent: (id, { rollNumber, name, gender, mobileNumber }) => {
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
                ? { 
                    ...student, 
                    rollNumber: normalizedRoll, 
                    name: normalizedName, 
                    gender: gender || student.gender,
                    mobileNumber: mobileNumber !== undefined ? mobileNumber : student.mobileNumber
                  }
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
        let added = 0
        let skipped = 0
        const newStudents = [...state.classStudents]
        const addedStudentIds: string[] = []

        entries.forEach(({ rollNumber, name, gender, mobileNumber }) => {
          const normalizedRoll = normalizeRoll(rollNumber)
          const normalizedName = normalizeName(name)
          if (!normalizedRoll || !normalizedName) {
            skipped++
            return
          }

          const existsIdx = newStudents.findIndex(
            (student) => normalizeRoll(student.rollNumber) === normalizedRoll
          )
          if (existsIdx !== -1) {
            newStudents[existsIdx] = {
              ...newStudents[existsIdx],
              name: normalizedName,
              gender: gender || newStudents[existsIdx].gender,
              mobileNumber: mobileNumber || newStudents[existsIdx].mobileNumber || "",
            }
            addedStudentIds.push(newStudents[existsIdx].id)
            added++
            return
          }

          const newId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          newStudents.push({
            id: newId,
            rollNumber: normalizedRoll,
            name: normalizedName,
            status: "present",
            gender: gender || "Male",
            mobileNumber: mobileNumber || "",
          })
          addedStudentIds.push(newId)
          added++
        })

        if (added > 0) {
          set({
            classStudents: newStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
          })
        }

        return { added, skipped, addedStudentIds }
      },
    }),
    {
      name: "attendance-student-store-v4",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
