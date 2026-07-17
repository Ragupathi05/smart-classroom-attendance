import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { TimetableCell, SpecialDay, TimetableCellClassType } from "@/types"
import { TimetableService } from "@/services"
import { AppSyncService } from "@/services/AppSyncService"
import { getISOWeekKey } from "@/utils/date-helpers"
import { SUBJECTS, SUBJECT_FACULTY } from "@/constants"

interface TimetableState {
  timetables: Record<string, TimetableCell[]>
  currentSectionFilter: string
  timetable: TimetableCell[]
  selectedCell: TimetableCell | null
  timetableWeekKey: string
  specialDays: Record<string, SpecialDay>
  timeSlots: string[]
  
  setSelectedCell: (cell: TimetableCell | null) => void
  loadTimetableForSection: (sectionName: string) => void
  addTimetableEntry: (entry: { day: string; timeSlot: string; subjectCode: string; subjectName?: string; facultyName: string; roomName?: string; type?: TimetableCellClassType; attendanceRequired?: "Required" | "Optional" | "Not Required" }) => void
  updateTimetableEntry: (id: string, entry: { day: string; timeSlot: string; subjectCode: string; subjectName?: string; facultyName: string; roomName?: string; type?: TimetableCellClassType; attendanceRequired?: "Required" | "Optional" | "Not Required" }) => void
  deleteTimetableEntry: (id: string) => void
  setSpecialDay: (date: string, type: SpecialDay["type"] | null, reason?: string, scopeType?: SpecialDay["scopeType"], scopeTargetIds?: string[], periods?: string[]) => void
  ensureWeeklyTimetableReset: () => void
  updateTimeSlots: (slots: string[]) => void
  clearTimetable: () => void
}

const getInitialTimetables = (): Record<string, TimetableCell[]> => {
  const seedA = TimetableService.generateTimetable().map(cell => ({
    ...cell,
    sectionId: "sec-1",
    academicSessionId: "session-2026-2027",
    isPublished: true
  }))
  const seedB = seedA.map((cell) => {
    let subjectCode = cell.subjectCode
    let subjectName = cell.subjectName
    let facultyName = cell.facultyName
    if (cell.day === "Monday" && cell.timeSlot === "9:10-10:10") {
      subjectCode = "ML"
      subjectName = SUBJECTS["ML"]
      facultyName = "Dr. Kumar"
    }
    if (cell.day === "Tuesday" && cell.timeSlot === "10:10-11:10") {
      subjectCode = "SE"
      subjectName = SUBJECTS["SE"]
      facultyName = "Mr. P. Udayakumar"
    }
    return {
      ...cell,
      id: `sec-2-${cell.id}`,
      sectionId: "sec-2",
      academicSessionId: "session-2026-2027",
      isPublished: true,
      subjectCode,
      subjectName,
      facultyName
    }
  })
  const seedC = seedA.map((cell) => ({
    ...cell,
    id: `sec-3-${cell.id}`,
    sectionId: "sec-3",
    academicSessionId: "session-2026-2027",
    isPublished: true
  }))
  return {
    "sec-1": seedA,
    "sec-2": seedB,
    "sec-3": seedC,
  }
}

export const useTimetableStore = create<TimetableState>()(
  persist(
    (set, get) => ({
      timetables: getInitialTimetables(),
      currentSectionFilter: "sec-1",
      timetable: getInitialTimetables()["sec-1"],
      selectedCell: null,
      timetableWeekKey: getISOWeekKey(),
      specialDays: {},
      timeSlots: [
        "9:10-10:10",
        "10:10-11:10",
        "11:10-12:10",
        "Lunch Break",
        "1:00-2:00",
        "2:00-3:00",
        "3:00-4:00",
        "4:00-5:00",
      ],

      setSelectedCell: (cell) => set({ selectedCell: cell }),

      loadTimetableForSection: (sectionId) => set((state) => {
        const sectionsList = state.timetables || {}
        let sectionTimetable = sectionsList[sectionId]
        if (!sectionTimetable) {
          sectionTimetable = []
          sectionsList[sectionId] = sectionTimetable
        }
        return {
          currentSectionFilter: sectionId,
          timetables: { ...sectionsList },
          timetable: sectionTimetable,
        }
      }),

      addTimetableEntry: ({ day, timeSlot, subjectCode, subjectName, facultyName, roomName, type = "regular", attendanceRequired = "Required" }) =>
        set((state) => {
          const sectionId = state.currentSectionFilter || "sec-1"
          const sectionTimetable = [...(state.timetables[sectionId] || [])]
          
          const normalizedSubjectCode = subjectCode.trim().toUpperCase()
          const normalizedSubjectName = subjectName?.trim() || SUBJECTS[normalizedSubjectCode] || normalizedSubjectCode
          const normalizedFaculty =
            facultyName.trim() || SUBJECT_FACULTY[normalizedSubjectCode] || "Faculty Assigned"
          if (!normalizedSubjectCode) return {}

          const existingIndex = sectionTimetable.findIndex((entry) => entry.day === day && entry.timeSlot === timeSlot)
          if (existingIndex !== -1) {
            const existing = sectionTimetable[existingIndex]
            sectionTimetable[existingIndex] = {
              ...existing,
              subjectCode: normalizedSubjectCode,
              subjectName: normalizedSubjectName,
              facultyName: normalizedFaculty,
              roomName: roomName?.trim(),
              status: "upcoming" as const,
              type,
              attendanceRequired,
            }
          } else {
            const newEntry: TimetableCell = {
              id: `custom-${Date.now()}`,
              day,
              timeSlot,
              subjectCode: normalizedSubjectCode,
              subjectName: normalizedSubjectName,
              facultyName: normalizedFaculty,
              roomName: roomName?.trim(),
              status: "upcoming",
              type,
              attendanceRequired,
              sectionId,
              isPublished: true
            }
            sectionTimetable.push(newEntry)
          }

          const result = {
            timetables: {
              ...state.timetables,
              [sectionId]: sectionTimetable
            },
            timetable: sectionTimetable
          }
          // Sync the added/updated cell to Supabase
          const affectedCell = existingIndex !== -1 ? sectionTimetable[existingIndex] : sectionTimetable[sectionTimetable.length - 1]
          if (affectedCell) AppSyncService.upsertTimetableCell(affectedCell)
          return result
        }),

      updateTimetableEntry: (id, { day, timeSlot, subjectCode, subjectName, facultyName, roomName, type = "regular", attendanceRequired = "Required" }) =>
        set((state) => {
          const sectionId = state.currentSectionFilter || "sec-1"
          const sectionTimetable = [...(state.timetables[sectionId] || [])]
          const normalizedSubjectCode = subjectCode.trim().toUpperCase()
          const normalizedSubjectName = subjectName?.trim() || SUBJECTS[normalizedSubjectCode] || normalizedSubjectCode
          const normalizedFaculty =
            facultyName.trim() || SUBJECT_FACULTY[normalizedSubjectCode] || "Faculty Assigned"
          if (!normalizedSubjectCode) return {}

          const updated = sectionTimetable.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  day,
                  timeSlot,
                  subjectCode: normalizedSubjectCode,
                  subjectName: normalizedSubjectName,
                  facultyName: normalizedFaculty,
                  roomName: roomName?.trim(),
                  status: "upcoming" as const,
                  type,
                  attendanceRequired,
                }
              : entry
          )

          const result = {
            timetables: {
              ...state.timetables,
              [sectionId]: updated
            },
            timetable: updated
          }
          // Sync updated cell to Supabase
          const updatedCell = updated.find(e => e.id === id)
          if (updatedCell) AppSyncService.upsertTimetableCell(updatedCell)
          return result
        }),

      deleteTimetableEntry: (id) =>
        set((state) => {
          const sectionId = state.currentSectionFilter || "sec-1"
          const sectionTimetable = [...(state.timetables[sectionId] || [])]
          const filtered = sectionTimetable.filter((entry) => entry.id !== id)

          // Sync deletion to Supabase
          AppSyncService.deleteTimetableCell(id)
          return {
            timetables: {
              ...state.timetables,
              [sectionId]: filtered
            },
            timetable: filtered
          }
        }),

      setSpecialDay: (date, type, reason, scopeType = "all", scopeTargetIds = [], periods = []) =>
        set((state) => {
          const updated = { ...state.specialDays }
          if (type === null) {
            delete updated[date]
            AppSyncService.deleteSpecialDay(date)
          } else {
            const day: SpecialDay = { date, type, reason, scopeType, scopeTargetIds, periods: periods.length > 0 ? periods : undefined }
            updated[date] = day
            AppSyncService.upsertSpecialDay(date, day)
          }
          return { specialDays: updated }
        }),

      ensureWeeklyTimetableReset: () => {
        const currentWeekKey = getISOWeekKey()
        if (get().timetableWeekKey === currentWeekKey) return

        const activeSection = get().currentSectionFilter || "III CSE A"
        const resetTimetable = TimetableService.resetTimetableStatuses(get().timetable)

        set((state) => ({
          timetable: resetTimetable,
          timetables: {
            ...state.timetables,
            [activeSection]: resetTimetable
          },
          selectedCell: null,
          timetableWeekKey: currentWeekKey,
        }))
      },

      updateTimeSlots: (slots) => set({ timeSlots: slots }),
      clearTimetable: () => set((state) => {
        const sectionId = state.currentSectionFilter || "sec-1"
        return {
          timetables: {
            ...state.timetables,
            [sectionId]: []
          },
          timetable: []
        }
      }),
    }),
    {
      name: "attendance-timetable-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
