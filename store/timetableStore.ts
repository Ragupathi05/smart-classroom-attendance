import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { TimetableCell, SpecialDay, TimetableCellClassType } from "@/types"
import { TimetableService } from "@/services"
import { getISOWeekKey } from "@/utils/date-helpers"
import { SUBJECTS, SUBJECT_FACULTY } from "@/constants"

interface TimetableState {
  timetable: TimetableCell[]
  selectedCell: TimetableCell | null
  timetableWeekKey: string
  specialDays: Record<string, SpecialDay>
  setSelectedCell: (cell: TimetableCell | null) => void
  addTimetableEntry: (entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string; type?: TimetableCellClassType }) => void
  updateTimetableEntry: (id: string, entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string; type?: TimetableCellClassType }) => void
  deleteTimetableEntry: (id: string) => void
  setSpecialDay: (date: string, type: SpecialDay["type"] | null, reason?: string) => void
  ensureWeeklyTimetableReset: () => void
}

const getLegacyTimetableState = () => {
  const defaults = TimetableService.generateTimetable()
  if (typeof window === "undefined") return { timetable: defaults, selectedCell: null, timetableWeekKey: getISOWeekKey(), specialDays: {} }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          timetable: parsed.state.timetable || defaults,
          selectedCell: parsed.state.selectedCell || null,
          timetableWeekKey: parsed.state.timetableWeekKey || getISOWeekKey(),
          specialDays: parsed.state.specialDays || {},
        }
      }
    }
  } catch {}
  return { timetable: defaults, selectedCell: null, timetableWeekKey: getISOWeekKey(), specialDays: {} }
}

const legacy = getLegacyTimetableState()

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      timetable: legacy.timetable,
      selectedCell: legacy.selectedCell,
      timetableWeekKey: legacy.timetableWeekKey,
      specialDays: legacy.specialDays,

      setSelectedCell: (cell) => set({ selectedCell: cell }),

      addTimetableEntry: ({ day, timeSlot, subjectCode, facultyName, type = "regular" }) =>
        set((state) => {
          const normalizedSubject = subjectCode.trim().toUpperCase()
          const normalizedFaculty =
            facultyName.trim() || SUBJECT_FACULTY[normalizedSubject] || "Faculty Assigned"
          if (!normalizedSubject) return {}

          const existing = state.timetable.find((entry) => entry.day === day && entry.timeSlot === timeSlot)
          if (existing) {
            return {
              timetable: state.timetable.map((entry) =>
                entry.id === existing.id
                  ? {
                      ...entry,
                      subjectCode: normalizedSubject,
                      subjectName: SUBJECTS[normalizedSubject] ?? normalizedSubject,
                      facultyName: normalizedFaculty,
                      status: "upcoming" as const,
                      type,
                    }
                  : entry
              ),
            }
          }

          const newEntry: TimetableCell = {
            id: `custom-${Date.now()}`,
            day,
            timeSlot,
            subjectCode: normalizedSubject,
            subjectName: SUBJECTS[normalizedSubject] ?? normalizedSubject,
            facultyName: normalizedFaculty,
            status: "upcoming",
            type,
          }

          return {
            timetable: [...state.timetable, newEntry],
          }
        }),

      updateTimetableEntry: (id, { day, timeSlot, subjectCode, facultyName, type = "regular" }) =>
        set((state) => {
          const normalizedSubject = subjectCode.trim().toUpperCase()
          const normalizedFaculty =
            facultyName.trim() || SUBJECT_FACULTY[normalizedSubject] || "Faculty Assigned"
          if (!normalizedSubject) return {}

          return {
            timetable: state.timetable.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    day,
                    timeSlot,
                    subjectCode: normalizedSubject,
                    subjectName: SUBJECTS[normalizedSubject] ?? normalizedSubject,
                    facultyName: normalizedFaculty,
                    status: "upcoming" as const,
                    type,
                  }
                : entry
            ),
          }
        }),

      deleteTimetableEntry: (id) =>
        set((state) => ({
          timetable: state.timetable.filter((entry) => entry.id !== id),
        })),

      setSpecialDay: (date, type, reason) =>
        set((state) => {
          const updated = { ...state.specialDays }
          if (type === null) {
            delete updated[date]
          } else {
            updated[date] = { date, type, reason }
          }
          return { specialDays: updated }
        }),

      ensureWeeklyTimetableReset: () => {
        const currentWeekKey = getISOWeekKey()
        if (get().timetableWeekKey === currentWeekKey) return

        set((state) => ({
          timetable: TimetableService.resetTimetableStatuses(state.timetable),
          selectedCell: null,
          timetableWeekKey: currentWeekKey,
        }))
      },
    }),
    {
      name: "attendance-timetable-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
