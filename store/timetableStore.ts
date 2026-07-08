import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { TimetableCell } from "@/types"
import { TimetableService } from "@/services"
import { getISOWeekKey } from "@/utils/date-helpers"
import { SUBJECTS, SUBJECT_FACULTY } from "@/constants"

interface TimetableState {
  timetable: TimetableCell[]
  selectedCell: TimetableCell | null
  timetableWeekKey: string
  setSelectedCell: (cell: TimetableCell | null) => void
  addTimetableEntry: (entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string }) => void
  updateTimetableEntry: (id: string, entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string }) => void
  deleteTimetableEntry: (id: string) => void
  ensureWeeklyTimetableReset: () => void
}

const getLegacyTimetableState = () => {
  const defaults = TimetableService.generateTimetable()
  if (typeof window === "undefined") return { timetable: defaults, selectedCell: null, timetableWeekKey: getISOWeekKey() }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          timetable: parsed.state.timetable || defaults,
          selectedCell: parsed.state.selectedCell || null,
          timetableWeekKey: parsed.state.timetableWeekKey || getISOWeekKey(),
        }
      }
    }
  } catch {}
  return { timetable: defaults, selectedCell: null, timetableWeekKey: getISOWeekKey() }
}

const legacy = getLegacyTimetableState()

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      timetable: legacy.timetable,
      selectedCell: legacy.selectedCell,
      timetableWeekKey: legacy.timetableWeekKey,

      setSelectedCell: (cell) => set({ selectedCell: cell }),

      addTimetableEntry: ({ day, timeSlot, subjectCode, facultyName }) =>
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
          }

          return {
            timetable: [...state.timetable, newEntry],
          }
        }),

      updateTimetableEntry: (id, { day, timeSlot, subjectCode, facultyName }) =>
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
                  }
                : entry
            ),
          }
        }),

      deleteTimetableEntry: (id) =>
        set((state) => ({
          timetable: state.timetable.filter((entry) => entry.id !== id),
        })),

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
