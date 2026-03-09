import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { csmStudents } from "@/lib/data/csm-students"

export type UserRole = "cr" | "lr" | "faculty"

export type AttendanceStatus = "present" | "permission" | "absent"

export interface User {
  id: string
  name: string
  role: UserRole
  className: string
}

export interface Student {
  id: string
  rollNumber: string
  name: string
  status: AttendanceStatus
}

export interface AttendanceRecord {
  id: string
  subject: string
  subjectCode: string
  date: string
  timeSlot: string
  className: string
  students: Student[]
  cellIds?: string[]
  editedAt?: string
  editedBy?: string
  isEdited?: boolean
  submittedAt?: string
  submittedBy?: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  createdAt: string
  targetRole: UserRole | "all"
  read: boolean
}

export interface CorrectionRequest {
  id: string
  recordId?: string
  studentId?: string
  studentName: string
  rollNumber: string
  subject: string
  date: string
  reason: string
  requestedAt?: string
  requestedBy?: string
  status: "pending" | "approved" | "rejected"
}

export interface TimetableCell {
  id: string
  subjectCode: string
  subjectName: string
  facultyName: string
  day: string
  timeSlot: string
  status: "current" | "submitted" | "missed" | "upcoming"
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  currentPage: string
  students: Student[]
  attendanceRecords: AttendanceRecord[]
  notifications: AppNotification[]
  correctionRequests: CorrectionRequest[]
  timetable: TimetableCell[]
  selectedCell: TimetableCell | null
  activeRecordId: string | null
  isViewingSubmittedAttendance: boolean
  isEditMode: boolean
  timetableWeekKey: string

  login: (userId: string, password: string, role: UserRole) => boolean
  logout: () => void
  setCurrentPage: (page: string) => void
  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void
  submitAttendance: (cell: TimetableCell) => void
  setSelectedCell: (cell: TimetableCell | null) => void
  startEditingSubmittedAttendance: () => void
  ensureWeeklyTimetableReset: () => void
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void
  markNotificationsRead: () => void
  submitCorrectionRequest: (payload: {
    recordId: string
    studentId: string
    reason: string
  }) => { success: boolean; message: string }
  deleteAttendanceRecord: (recordId: string) => void
  updateAttendanceRecordFromHistory: (recordId: string, updatedStudents: Student[]) => void
  approveCorrectionRequest: (requestId: string) => void
  rejectCorrectionRequest: (requestId: string) => void
  hydrateAttendanceRecords: () => void
  addTimetableEntry: (entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string }) => void
  updateTimetableEntry: (id: string, entry: { day: string; timeSlot: string; subjectCode: string; facultyName: string }) => void
  deleteTimetableEntry: (id: string) => void
}

const ATTENDANCE_STORAGE_KEY = "attendanceRecords"

const loadAttendanceRecordsFromStorage = (): AttendanceRecord[] => {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveAttendanceRecordsToStorage = (records: AttendanceRecord[]) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore storage failures (quota/private mode)
  }
}

const CLASS_NAME = "III B.TECH CSE (AI & ML) - II SEM"

const timeSlots = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

const slotIndexMap = new Map(timeSlots.map((slot, index) => [slot, index]))

const subjectNames: Record<string, string> = {
  BDA: "Big Data Analytics",
  CCAI: "Cloud Computing for AI",
  DL: "Deep Learning",
  ATCD: "Automata Theory and Compiler Design",
  RL: "Reinforcement Learning",
  EB: "E-Business",
  RM: "Research Methodology",
  "BDCC LAB": "Big Data and Cloud Computing Laboratory",
  "DL LAB": "Deep Learning Laboratory",
  SS: "Soft Skills",
  "SS (SEC)": "Soft Skills (SEC - IV)",
  "SS LAB (SEC)": "Soft Skills Lab (SEC)",
  "T LAB": "Tinkering Laboratory",
  APTITUDE: "Aptitude",
  VERBAL: "Verbal",
  MM: "Mentor - Mentee",
}

const subjectFacultyNames: Record<string, string> = {
  BDA: "Dr. K. Raman",
  CCAI: "Dr. V. Saranya",
  DL: "Mr. P. Udayakumar",
  ATCD: "Dr. R. Prakash",
  RL: "Dr. S. Karthik",
  EB: "Dr. M. Divya",
  RM: "Dr. A. Nirmala",
  "BDCC LAB": "Ms. N. Priyanka",
  "DL LAB": "Mr. P. Udayakumar",
  SS: "Ms. B. Kavitha",
  "SS (SEC)": "Ms. B. Kavitha",
  "SS LAB (SEC)": "Ms. B. Kavitha",
  "T LAB": "Mr. R. Manoj",
  APTITUDE: "Mr. S. Hari",
  VERBAL: "Ms. L. Keerthana",
  MM: "Class Mentor",
}

const weeklySchedule: Record<string, string[]> = {
  Monday: ["DL", "SS", "EB", "CCAI", "DL LAB", "DL LAB", "DL LAB"],
  Tuesday: ["CCAI", "SS (SEC)", "MM", "RL", "BDA", "ATCD", "RM"],
  Wednesday: ["EB", "T LAB", "T LAB", "APTITUDE", "ATCD", "DL", "RM"],
  Thursday: ["BDA", "APTITUDE", "EB", "RL", "RM", "ATCD", "DL"],
  Friday: ["BDCC LAB", "BDCC LAB", "BDCC LAB", "SS LAB (SEC)", "SS LAB (SEC)", "VERBAL", "BDA"],
  Saturday: ["RL", "CCAI", "MM", "", "", "", ""],
}

const cloneStudents = (): Student[] =>
  csmStudents.map((student) => ({ ...student, status: "present" }))

const generateTimetable = (): TimetableCell[] => {
  const timetable: TimetableCell[] = []

  Object.entries(weeklySchedule).forEach(([day, subjects]) => {
    subjects.forEach((subjectCode, index) => {
      if (!subjectCode) return

      timetable.push({
        id: `${day}-${index}`,
        day,
        timeSlot: timeSlots[index],
        subjectCode,
        subjectName: subjectNames[subjectCode] ?? subjectCode,
        facultyName: subjectFacultyNames[subjectCode] ?? "Faculty Assigned",
        status: "upcoming",
      })
    })
  })

  return timetable
}

const resetTimetableStatuses = (timetable: TimetableCell[]): TimetableCell[] =>
  timetable.map((entry) => ({ ...entry, status: "upcoming" }))

const getContiguousSubjectIds = (timetable: TimetableCell[], selected: TimetableCell): string[] => {
  const dayEntries = timetable
    .filter((entry) => entry.day === selected.day && entry.subjectCode === selected.subjectCode)
    .sort((a, b) => (slotIndexMap.get(a.timeSlot) ?? 0) - (slotIndexMap.get(b.timeSlot) ?? 0))

  const selectedIndex = dayEntries.findIndex((entry) => entry.id === selected.id)
  if (selectedIndex === -1) return [selected.id]

  let start = selectedIndex
  let end = selectedIndex

  while (start > 0) {
    const current = slotIndexMap.get(dayEntries[start].timeSlot) ?? -1
    const previous = slotIndexMap.get(dayEntries[start - 1].timeSlot) ?? -99
    if (current - previous !== 1) break
    start -= 1
  }

  while (end < dayEntries.length - 1) {
    const current = slotIndexMap.get(dayEntries[end].timeSlot) ?? -1
    const next = slotIndexMap.get(dayEntries[end + 1].timeSlot) ?? -99
    if (next - current !== 1) break
    end += 1
  }

  return dayEntries.slice(start, end + 1).map((entry) => entry.id)
}

const getMergedTimeSlotLabel = (timetable: TimetableCell[], ids: string[]): string => {
  const entries = timetable
    .filter((entry) => ids.includes(entry.id))
    .sort((a, b) => (slotIndexMap.get(a.timeSlot) ?? 0) - (slotIndexMap.get(b.timeSlot) ?? 0))

  if (entries.length === 0) return ""
  if (entries.length === 1) return entries[0].timeSlot

  const firstStart = entries[0].timeSlot.split("-")[0]
  const lastEnd = entries[entries.length - 1].timeSlot.split("-")[1]
  return `${firstStart}-${lastEnd}`
}

const initialCorrectionRequests: CorrectionRequest[] = []

const findAttendanceRecordForCell = (
  records: AttendanceRecord[],
  cell: TimetableCell
): AttendanceRecord | null => {
  const byCellIds = records.find((record) => record.cellIds?.includes(cell.id))
  if (byCellIds) return byCellIds

  const bySubjectAndTime = records.find(
    (record) => record.subjectCode === cell.subjectCode && record.timeSlot === cell.timeSlot
  )

  return bySubjectAndTime || null
}

const isLegacySeedCorrection = (request: CorrectionRequest) =>
  request.id === "1" &&
  request.rollNumber === "23691A3301" &&
  request.subject === "Deep Learning" &&
  request.reason === "Marked absent by mistake though I attended full class"

const getISOWeekKey = (date = new Date()): string => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      currentPage: "dashboard",
      students: cloneStudents(),
      attendanceRecords: loadAttendanceRecordsFromStorage(),
      notifications: [],
      correctionRequests: initialCorrectionRequests,
      timetable: generateTimetable(),
      selectedCell: null,
      activeRecordId: null,
      isViewingSubmittedAttendance: false,
      isEditMode: false,
      timetableWeekKey: getISOWeekKey(),

      login: (userId, password, role) => {
        if (!userId || !password) return false

        get().ensureWeeklyTimetableReset()

        const roleNames: Record<UserRole, string> = {
          cr: "Class Representative",
          lr: "Ladies Representative",
          faculty: "Mr. P. Udayakumar",
        }

        set({
          user: {
            id: userId,
            name: roleNames[role],
            role,
            className: CLASS_NAME,
          },
          isAuthenticated: true,
          currentPage: "dashboard",
        })

        return true
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          currentPage: "dashboard",
          students: cloneStudents(),
          selectedCell: null,
        })
      },

      setCurrentPage: (page) =>
        set((state) => {
          // When leaving mark-attendance without submission, discard unsaved student edits.
          if (state.currentPage === "mark-attendance" && page !== "mark-attendance") {
            return {
              currentPage: page,
              students: cloneStudents(),
              selectedCell: null,
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
            }
          }

          return { currentPage: page }
        }),

      updateStudentStatus: (studentId, status) =>
        set((state) => ({
          students: state.students.map((student) =>
            student.id === studentId ? { ...student, status } : student
          ),
        })),

      submitAttendance: (cell) => {
        const state = get()
        const contiguousIds = getContiguousSubjectIds(state.timetable, cell)
        const mergedTimeSlot = getMergedTimeSlotLabel(state.timetable, contiguousIds)

        if (state.isViewingSubmittedAttendance && state.isEditMode && state.activeRecordId) {
          const editedAt = new Date().toISOString()
          const editedBy = `${state.user?.role.toUpperCase()} - ${state.user?.name}`

          set((prev) => {
            const nextRecords = prev.attendanceRecords.map((record) =>
              record.id === state.activeRecordId
                ? {
                    ...record,
                    students: prev.students.map((student) => ({ ...student })),
                    editedAt,
                    editedBy,
                    isEdited: true,
                  }
                : record
            )

            saveAttendanceRecordsToStorage(nextRecords)

            return {
              attendanceRecords: nextRecords,
              notifications: [
                {
                  id: Date.now().toString(),
                  title: "Attendance Updated",
                  message: `${cell.subjectCode} (${mergedTimeSlot || cell.timeSlot}) attendance was edited by ${state.user?.name}`,
                  createdAt: editedAt,
                  targetRole: "faculty",
                  read: false,
                },
                ...prev.notifications,
              ],
              students: cloneStudents(),
              selectedCell: null,
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
              currentPage: "dashboard",
            }
          })

          return
        }

        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subject: cell.subjectName,
          subjectCode: cell.subjectCode,
          date: new Date().toISOString().split("T")[0],
          timeSlot: mergedTimeSlot || cell.timeSlot,
          className: state.user?.className || CLASS_NAME,
          students: state.students.map((student) => ({ ...student })),
          cellIds: contiguousIds,
          submittedAt: new Date().toISOString(),
          submittedBy: `${state.user?.role.toUpperCase()} - ${state.user?.name}`,
        }

        set((prev) => {
          const nextRecords = [newRecord, ...prev.attendanceRecords]
          saveAttendanceRecordsToStorage(nextRecords)

          return {
            attendanceRecords: nextRecords,
            timetable: prev.timetable.map((entry) =>
              contiguousIds.includes(entry.id) ? { ...entry, status: "submitted" as const } : entry
            ),
            students: cloneStudents(),
            selectedCell: null,
            activeRecordId: null,
            isViewingSubmittedAttendance: false,
            isEditMode: false,
            currentPage: "dashboard",
          }
        })
      },

      setSelectedCell: (cell) =>
        set((state) => {
          if (!cell) {
            return {
              selectedCell: null,
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
            }
          }

          if (cell.status !== "submitted") {
            return {
              selectedCell: cell,
              students: cloneStudents(),
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
            }
          }

          const record = findAttendanceRecordForCell(state.attendanceRecords, cell)
          if (!record) {
            return {
              selectedCell: cell,
              students: cloneStudents(),
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
            }
          }

          return {
            selectedCell: cell,
            students: record.students.map((student) => ({ ...student })),
            activeRecordId: record.id,
            isViewingSubmittedAttendance: true,
            isEditMode: false,
          }
        }),

      startEditingSubmittedAttendance: () => set({ isEditMode: true }),

      ensureWeeklyTimetableReset: () =>
        set((state) => {
          const currentWeekKey = getISOWeekKey()
          if (state.timetableWeekKey === currentWeekKey) {
            return {}
          }

          return {
            timetable: resetTimetableStatuses(state.timetable),
            students: cloneStudents(),
            selectedCell: null,
            activeRecordId: null,
            isViewingSubmittedAttendance: false,
            isEditMode: false,
            timetableWeekKey: currentWeekKey,
          }
        }),

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

      submitCorrectionRequest: ({ recordId, studentId, reason }) => {
        const state = get()
        const record = state.attendanceRecords.find((item) => item.id === recordId)
        if (!record) {
          return { success: false, message: "Attendance record not found." }
        }

        const student = record.students.find((item) => item.id === studentId)
        if (!student) {
          return { success: false, message: "Student not found in selected record." }
        }

        const trimmedReason = reason.trim()
        if (!trimmedReason) {
          return { success: false, message: "Reason is required." }
        }

        const duplicatePending = state.correctionRequests.some(
          (request) =>
            request.status === "pending" &&
            ((request.recordId === recordId && request.studentId === studentId) ||
              (request.rollNumber === student.rollNumber &&
                request.subject === record.subject &&
                request.date === record.date))
        )

        if (duplicatePending) {
          return {
            success: false,
            message: "A pending correction request already exists for this student and class.",
          }
        }

        const now = new Date().toISOString()
        const requestedBy = `${state.user?.role.toUpperCase()} - ${state.user?.name}`

        const newRequest: CorrectionRequest = {
          id: Date.now().toString(),
          recordId,
          studentId,
          studentName: student.name,
          rollNumber: student.rollNumber,
          subject: record.subject,
          date: record.date,
          reason: trimmedReason,
          requestedAt: now,
          requestedBy,
          status: "pending",
        }

        set((prev) => ({
          correctionRequests: [newRequest, ...prev.correctionRequests],
          notifications: [
            {
              id: (Date.now() + 1).toString(),
              title: "New Correction Request",
              message: `${student.rollNumber} ${student.name} requested correction for ${record.subjectCode} (${record.timeSlot}).`,
              createdAt: now,
              targetRole: "faculty",
              read: false,
            },
            ...prev.notifications,
          ],
        }))

        return { success: true, message: "Correction request submitted." }
      },

      deleteAttendanceRecord: (recordId) =>
        set((state) => {
          const target = state.attendanceRecords.find((record) => record.id === recordId)
          if (!target) return {}

          const remainingRecords = state.attendanceRecords.filter((record) => record.id !== recordId)
          saveAttendanceRecordsToStorage(remainingRecords)
          const removedCellIds = target.cellIds || []
          const usedCellIds = new Set(
            remainingRecords.flatMap((record) => record.cellIds || [])
          )

          return {
            attendanceRecords: remainingRecords,
            correctionRequests: state.correctionRequests.filter(
              (request) => request.recordId !== recordId
            ),
            timetable: state.timetable.map((entry) => {
              if (removedCellIds.includes(entry.id) && !usedCellIds.has(entry.id)) {
                return { ...entry, status: "upcoming" as const }
              }
              return entry
            }),
            selectedCell:
              state.selectedCell && removedCellIds.includes(state.selectedCell.id)
                ? null
                : state.selectedCell,
            activeRecordId: state.activeRecordId === recordId ? null : state.activeRecordId,
            isViewingSubmittedAttendance:
              state.activeRecordId === recordId ? false : state.isViewingSubmittedAttendance,
            isEditMode: state.activeRecordId === recordId ? false : state.isEditMode,
          }
        }),

      updateAttendanceRecordFromHistory: (recordId, updatedStudents) =>
        set((state) => {
          const target = state.attendanceRecords.find((record) => record.id === recordId)
          if (!target) return {}

          const editedAt = new Date().toISOString()
          const editedBy = `${state.user?.role.toUpperCase()} - ${state.user?.name}`
          const nextRecords = state.attendanceRecords.map((record) =>
            record.id === recordId
              ? {
                  ...record,
                  students: updatedStudents.map((student) => ({ ...student })),
                  editedAt,
                  editedBy,
                  isEdited: true,
                }
              : record
          )

          saveAttendanceRecordsToStorage(nextRecords)

          return {
            attendanceRecords: nextRecords,
            notifications: [
              {
                id: Date.now().toString(),
                title: "History Attendance Edited",
                message: `${target.subjectCode} (${target.timeSlot}) was edited from attendance history by ${state.user?.name}`,
                createdAt: editedAt,
                targetRole: "faculty",
                read: false,
              },
              ...state.notifications,
            ],
          }
        }),

      approveCorrectionRequest: (requestId) =>
        set((state) => ({
          correctionRequests: state.correctionRequests.map((request) =>
            request.id === requestId ? { ...request, status: "approved" as const } : request
          ),
        })),

      rejectCorrectionRequest: (requestId) =>
        set((state) => ({
          correctionRequests: state.correctionRequests.map((request) =>
            request.id === requestId ? { ...request, status: "rejected" as const } : request
          ),
        })),

      addTimetableEntry: ({ day, timeSlot, subjectCode, facultyName }) =>
        set((state) => {
          const normalizedSubject = subjectCode.trim().toUpperCase()
          const normalizedFaculty =
            facultyName.trim() || subjectFacultyNames[normalizedSubject] || "Faculty Assigned"
          if (!normalizedSubject) return {}

          const existing = state.timetable.find((entry) => entry.day === day && entry.timeSlot === timeSlot)
          if (existing) {
            return {
              timetable: state.timetable.map((entry) =>
                entry.id === existing.id
                  ? {
                      ...entry,
                      subjectCode: normalizedSubject,
                      subjectName: subjectNames[normalizedSubject] ?? normalizedSubject,
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
            subjectName: subjectNames[normalizedSubject] ?? normalizedSubject,
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
            facultyName.trim() || subjectFacultyNames[normalizedSubject] || "Faculty Assigned"
          if (!normalizedSubject) return {}

          return {
            timetable: state.timetable.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    day,
                    timeSlot,
                    subjectCode: normalizedSubject,
                    subjectName: subjectNames[normalizedSubject] ?? normalizedSubject,
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

      hydrateAttendanceRecords: () => {
        const savedRecords = loadAttendanceRecordsFromStorage()
        if (savedRecords.length === 0) return
        set({ attendanceRecords: savedRecords })
      },
    }),
    {
      name: "attendance-app-store-v1",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState
        const persistedCorrections = Array.isArray(persistedState.correctionRequests)
          ? persistedState.correctionRequests.filter(
              (request: CorrectionRequest) => !isLegacySeedCorrection(request)
            )
          : []

        return {
          ...persistedState,
          timetable: generateTimetable(),
          notifications: persistedState.notifications || [],
          correctionRequests: persistedCorrections,
          activeRecordId: null,
          isViewingSubmittedAttendance: false,
          isEditMode: false,
          timetableWeekKey: persistedState.timetableWeekKey || getISOWeekKey(),
        }
      },
    }
  )
)
