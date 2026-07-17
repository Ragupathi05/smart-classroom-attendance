import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { AttendanceRecord, CorrectionRequest, CorrectionChange, Student, TimetableCell, AttendanceStatus } from "@/types"
import { AttendanceService, StudentService } from "@/services"
import { AppSyncService } from "@/services/AppSyncService"
import { useTimetableStore } from "./timetableStore"
import { useSharedStore } from "./sharedStore"
import { useAuthStore } from "./authStore"
import { useStudentStore } from "./studentStore"
import { useAcademicStore } from "./academicStore"
import { TIME_SLOTS } from "@/constants"

interface AttendanceState {
  attendanceRecords: AttendanceRecord[]
  students: Student[]
  activeRecordId: string | null
  isViewingSubmittedAttendance: boolean
  isEditMode: boolean
  correctionRequests: CorrectionRequest[]
  attendanceDrafts: Record<string, { cellId: string; students: Student[]; lastUpdated: string }>

  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void
  copyPreviousPeriodAttendance: (cell: TimetableCell) => { success: boolean; message: string }
  submitAttendance: (cell: TimetableCell) => {
    success: boolean
    mode: "submitted" | "updated" | "request-created" | "no-change"
    message: string
  }
  startEditingSubmittedAttendance: () => void
  deleteAttendanceRecord: (recordId: string) => void
  updateAttendanceRecordFromHistory: (recordId: string, updatedStudents: Student[]) => void
  hydrateAttendanceRecords: () => void
  submitCorrectionRequest: (payload: { recordId: string; studentId: string; reason: string }) => { success: boolean; message: string }
  approveCorrectionRequest: (requestId: string) => void
  rejectCorrectionRequest: (requestId: string) => void
  deleteCorrectionRequest: (requestId: string) => void
  syncWithRoster: (roster: Student[]) => void
}

const getSeedAttendanceRecords = (): AttendanceRecord[] => {
  try {
    const students = StudentService.getSeedStudents()
    const today = new Date().toISOString().split("T")[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const getStudentsWithStatus = (classIndex: number) => {
      return students.map((s, idx) => {
        let status: AttendanceStatus = "present"
        if (idx === 1) {
          status = classIndex % 2 === 0 ? "absent" : "present"
        } else if (idx === 4 || idx === 12) {
          status = classIndex < 4 ? "absent" : "present"
        } else if (idx === 18) {
          status = "permission"
        } else if (Math.random() < 0.05) {
          status = "absent"
        }
        return { ...s, status }
      })
    }

    return [
      {
        id: "seed-rec-1",
        subject: "Deep Learning (DL)",
        subjectCode: "DL",
        date: today,
        timeSlot: "9:10-10:10",
        className: "III CSE A",
        sectionId: "sec-1",
        academicSessionId: "session-2026-2027",
        students: getStudentsWithStatus(0),
        cellIds: ["cell-dl-1"],
        submittedAt: new Date().toISOString(),
        submittedBy: "FACULTY - Mr. P. Udayakumar"
      },
      {
        id: "seed-rec-2",
        subject: "Software Engineering (SE)",
        subjectCode: "SE",
        date: today,
        timeSlot: "10:10-11:10",
        className: "III CSE A",
        sectionId: "sec-1",
        academicSessionId: "session-2026-2027",
        students: getStudentsWithStatus(1),
        cellIds: ["cell-se-1"],
        submittedAt: new Date().toISOString(),
        submittedBy: "FACULTY - Mr. P. Udayakumar"
      },
      {
        id: "seed-rec-3",
        subject: "Cloud Computing (CC)",
        subjectCode: "CC",
        date: yesterday,
        timeSlot: "9:10-10:10",
        className: "III CSE A",
        sectionId: "sec-1",
        academicSessionId: "session-2026-2027",
        students: getStudentsWithStatus(2),
        cellIds: ["cell-cc-1"],
        submittedAt: new Date().toISOString(),
        submittedBy: "FACULTY - Dr. Kumar"
      },
      {
        id: "seed-rec-4",
        subject: "Deep Learning (DL)",
        subjectCode: "DL",
        date: yesterday,
        timeSlot: "10:10-11:10",
        className: "III CSE A",
        sectionId: "sec-1",
        academicSessionId: "session-2026-2027",
        students: getStudentsWithStatus(3),
        cellIds: ["cell-dl-2"],
        submittedAt: new Date().toISOString(),
        submittedBy: "FACULTY - Mr. P. Udayakumar"
      },
      {
        id: "seed-rec-5",
        subject: "Software Engineering (SE)",
        subjectCode: "SE",
        date: yesterday,
        timeSlot: "11:10-12:10",
        className: "III CSE A",
        sectionId: "sec-1",
        academicSessionId: "session-2026-2027",
        students: getStudentsWithStatus(4),
        cellIds: ["cell-se-2"],
        submittedAt: new Date().toISOString(),
        submittedBy: "FACULTY - Mr. P. Udayakumar"
      }
    ]
  } catch (e) {
    return []
  }
}

const getLegacyAttendanceState = () => {
  const records: AttendanceRecord[] = []
  const defaultStudents: Student[] = []
  if (typeof window === "undefined") return { attendanceRecords: records, students: defaultStudents, correctionRequests: [], attendanceDrafts: {} }
  try {
    const raw = localStorage.getItem("attendance-app-store-v1")
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.state) {
        return {
          attendanceRecords: parsed.state.attendanceRecords || records,
          students: parsed.state.students || defaultStudents,
          correctionRequests: parsed.state.correctionRequests || [],
          attendanceDrafts: parsed.state.attendanceDrafts || {},
        }
      }
    }
  } catch {
    // Ignore
  }
  return { attendanceRecords: records, students: defaultStudents, correctionRequests: [], attendanceDrafts: {} }
}

const legacy = getLegacyAttendanceState()

const slotIndexMap = new Map(TIME_SLOTS.map((slot, index) => [slot, index]))

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

const findAttendanceRecordForCell = (records: AttendanceRecord[], cell: TimetableCell): AttendanceRecord | null => {
  const byCellIds = records.find((record) => record.cellIds?.includes(cell.id))
  if (byCellIds) return byCellIds

  const bySubjectAndTime = records.find(
    (record) => record.subjectCode === cell.subjectCode && record.timeSlot === cell.timeSlot
  )
  return bySubjectAndTime || null
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      attendanceRecords: legacy.attendanceRecords,
      students: legacy.students,
      activeRecordId: null,
      isViewingSubmittedAttendance: false,
      isEditMode: false,
      correctionRequests: legacy.correctionRequests,
      attendanceDrafts: legacy.attendanceDrafts,

      updateStudentStatus: (studentId, status) =>
        set((state) => {
          const updatedStudents = state.students.map((student) =>
            student.id === studentId ? { ...student, status } : student
          )
          
          const selectedCell = useTimetableStore.getState().selectedCell
          const draftUpdates: Partial<AttendanceState> = { students: updatedStudents }
          
          if (selectedCell && selectedCell.status !== "submitted") {
            const drafts = { ...(state.attendanceDrafts || {}) }
            drafts[selectedCell.id] = {
              cellId: selectedCell.id,
              students: updatedStudents,
              lastUpdated: new Date().toISOString()
            }
            draftUpdates.attendanceDrafts = drafts
          }

          return draftUpdates
        }),

      copyPreviousPeriodAttendance: (cell) => {
        const timetable = useTimetableStore.getState().timetable
        const currentSlotIndex = slotIndexMap.get(cell.timeSlot)

        if (currentSlotIndex === undefined) {
          return { success: false, message: "Current period slot could not be identified." }
        }

        if (currentSlotIndex === 0) {
          return { success: false, message: "No previous period available for the first hour." }
        }

        const today = new Date().toISOString().split("T")[0]
        let sourceRecord: AttendanceRecord | undefined
        let sourceSlot = ""

        for (let offset = 1; offset <= 2; offset += 1) {
          const candidateIndex = currentSlotIndex - offset
          if (candidateIndex < 0) break

          const candidateSlot = TIME_SLOTS[candidateIndex]
          const candidateCell = timetable.find(
            (entry) => entry.day === cell.day && entry.timeSlot === candidateSlot
          )

          if (!candidateCell) continue

          const found = get().attendanceRecords.find(
            (record) =>
              record.date === today &&
              (record.cellIds?.includes(candidateCell.id) || record.timeSlot === candidateSlot)
          )

          if (found) {
            sourceRecord = found
            sourceSlot = candidateSlot
            break
          }
        }

        if (!sourceRecord) {
          return { success: false, message: "No previous attendance found (checked previous two periods)." }
        }

        const sourceById = new Map(sourceRecord.students.map((student) => [student.id, student.status]))
        const sourceByRoll = new Map(sourceRecord.students.map((student) => [student.rollNumber, student.status]))

        set((prev) => {
          const updatedStudents = prev.students.map((student) => ({
            ...student,
            status:
              sourceById.get(student.id) ||
              sourceByRoll.get(student.rollNumber) ||
              student.status,
          }))

          const drafts = { ...(prev.attendanceDrafts || {}) }
          drafts[cell.id] = {
            cellId: cell.id,
            students: updatedStudents,
            lastUpdated: new Date().toISOString(),
          }

          return {
            students: updatedStudents,
            attendanceDrafts: drafts,
          }
        })

        return { success: true, message: `Copied attendance from ${sourceSlot}.` }
      },

      submitAttendance: (cell) => {
        const state = get()
        const timetable = useTimetableStore.getState().timetable
        const user = useAuthStore.getState().user
        const classStudents = useStudentStore.getState().classStudents

        const contiguousIds = getContiguousSubjectIds(timetable, cell)
        const mergedTimeSlot = getMergedTimeSlotLabel(timetable, contiguousIds)

        if (state.isViewingSubmittedAttendance && state.isEditMode && state.activeRecordId) {
          const activeRecord = state.attendanceRecords.find((record) => record.id === state.activeRecordId)
          if (!activeRecord) {
            return {
              success: false,
              mode: "no-change" as const,
              message: "Original attendance record not found.",
            }
          }

          const changes = state.students
            .map((student) => {
              const original = activeRecord.students.find((item) => item.id === student.id)
              if (!original || original.status === student.status) return null

              return {
                studentId: student.id,
                rollNumber: student.rollNumber,
                studentName: student.name,
                fromStatus: original.status,
                toStatus: student.status,
              }
            })
            .filter((change): change is CorrectionChange => change !== null)

          if (changes.length === 0) {
            return {
              success: false,
              mode: "no-change" as const,
              message: "No attendance changes detected.",
            }
          }

          if (user?.role !== "faculty") {
            const now = new Date().toISOString()
            const requestedBy = `${user?.role.toUpperCase()} - ${user?.name}`
            const reason = `Requested correction for ${changes.length} student(s).`

            set((prev) => {
              const existingPending = prev.correctionRequests.find(
                (request) =>
                  request.status === "pending" &&
                  request.recordId === activeRecord.id &&
                  request.requestedBy === requestedBy
              )

              const requestPayload: CorrectionRequest = {
                id: existingPending?.id || Date.now().toString(),
                recordId: activeRecord.id,
                subject: activeRecord.subject,
                subjectCode: activeRecord.subjectCode,
                date: activeRecord.date,
                timeSlot: activeRecord.timeSlot,
                className: activeRecord.className,
                facultyName: cell.facultyName || "Faculty Assigned",
                reason,
                changes,
                requestedAt: now,
                requestedBy,
                status: "pending",
              }

              const nextRequests = existingPending
                ? prev.correctionRequests.map((request) =>
                    request.id === existingPending.id ? requestPayload : request
                  )
                : [requestPayload, ...prev.correctionRequests]

              useSharedStore.getState().addNotification({
                title: "New Correction Request",
                message: `${activeRecord.subjectCode} (${activeRecord.timeSlot}) correction requested by ${user?.name}.`,
                targetRole: "faculty",
              })

              const roster = useAcademicStore.getState().getSectionRoster(activeRecord.sectionId || "sec-1")
              return {
                correctionRequests: nextRequests,
                students: roster.map((student) => ({ ...student, status: "present" })),
                activeRecordId: null,
                isViewingSubmittedAttendance: false,
                isEditMode: false,
              }
            })

            useTimetableStore.getState().setSelectedCell(null)
            useSharedStore.getState().setCurrentPage("dashboard")

            return {
              success: true,
              mode: "request-created" as const,
              message: "Correction request submitted to faculty.",
            }
          }

          const editedAt = new Date().toISOString()
          const editedBy = `${user?.role.toUpperCase()} - ${user?.name}`

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

            AttendanceService.saveRecords(nextRecords)
            // Sync updated record to Supabase
            const updatedRecord = nextRecords.find(r => r.id === state.activeRecordId)
            if (updatedRecord) AppSyncService.upsertAttendanceRecord(updatedRecord)

            useSharedStore.getState().addNotification({
              title: "Attendance Updated",
              message: `${cell.subjectCode} (${mergedTimeSlot || cell.timeSlot}) attendance was edited by ${user?.name}`,
              targetRole: "faculty",
            })

            const roster = useAcademicStore.getState().getSectionRoster(state.activeRecordId ? (prev.attendanceRecords.find(r => r.id === state.activeRecordId)?.sectionId || "sec-1") : "sec-1")
            return {
              attendanceRecords: nextRecords,
              students: roster.map((student) => ({ ...student, status: "present" })),
              activeRecordId: null,
              isViewingSubmittedAttendance: false,
              isEditMode: false,
            }
          })

          useTimetableStore.getState().setSelectedCell(null)
          useSharedStore.getState().setCurrentPage("dashboard")

          return {
            success: true,
            mode: "updated" as const,
            message: "Attendance updated successfully.",
          }
        }

        const activeSectionId = cell.sectionId || useTimetableStore.getState().currentSectionFilter || "sec-1"
        const activeSessionId = cell.academicSessionId || useAcademicStore.getState().currentSessionId
        const activeSectionObj = useAcademicStore.getState().sections.find(s => s.id === activeSectionId)

        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subject: cell.subjectName,
          subjectCode: cell.subjectCode,
          date: new Date().toISOString().split("T")[0],
          timeSlot: mergedTimeSlot || cell.timeSlot,
          className: activeSectionObj?.name || "Class Room",
          sectionId: activeSectionId,
          academicSessionId: activeSessionId,
          students: state.students.map((student) => ({ ...student })),
          cellIds: contiguousIds,
          submittedAt: new Date().toISOString(),
          submittedBy: `${user?.role.toUpperCase()} - ${user?.name}`,
        }

        set((prev) => {
          const nextRecords = [newRecord, ...prev.attendanceRecords]
          AttendanceService.saveRecords(nextRecords)
          // Sync to Supabase
          AppSyncService.upsertAttendanceRecord(newRecord)
 
          // Update status in timetable grid
          useTimetableStore.setState((tState) => ({
            timetable: tState.timetable.map((entry) =>
              contiguousIds.includes(entry.id) ? { ...entry, status: "submitted" as const } : entry
            ),
          }))

          const drafts = { ...(prev.attendanceDrafts || {}) }
          delete drafts[cell.id]
 
          const roster = useAcademicStore.getState().getSectionRoster(activeSectionId)
          return {
            attendanceRecords: nextRecords,
            students: roster.map((student) => ({ ...student, status: "present" })),
            activeRecordId: null,
            isViewingSubmittedAttendance: false,
            isEditMode: false,
            attendanceDrafts: drafts,
          }
        })

        useTimetableStore.getState().setSelectedCell(null)
        useSharedStore.getState().setCurrentPage("dashboard")

        return {
          success: true,
          mode: "submitted" as const,
          message: "Attendance submitted successfully.",
        }
      },

      startEditingSubmittedAttendance: () => set({ isEditMode: true }),

      deleteAttendanceRecord: (recordId) =>
        set((state) => {
          const target = state.attendanceRecords.find((record) => record.id === recordId)
          if (!target) return {}

          const remainingRecords = state.attendanceRecords.filter((record) => record.id !== recordId)
          AttendanceService.saveRecords(remainingRecords)
          // Sync deletion to Supabase
          AppSyncService.deleteAttendanceRecord(recordId)

          const removedCellIds = target.cellIds || []
          const usedCellIds = new Set(remainingRecords.flatMap((record) => record.cellIds || []))

          // Update statuses in timetable
          useTimetableStore.setState((tState) => ({
            timetable: tState.timetable.map((entry) => {
              if (removedCellIds.includes(entry.id) && !usedCellIds.has(entry.id)) {
                return { ...entry, status: "upcoming" as const }
              }
              return entry
            }),
            selectedCell:
              tState.selectedCell && removedCellIds.includes(tState.selectedCell.id)
                ? null
                : tState.selectedCell,
          }))

          return {
            attendanceRecords: remainingRecords,
            correctionRequests: state.correctionRequests.filter((request) => request.recordId !== recordId),
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

          const user = useAuthStore.getState().user
          const editedAt = new Date().toISOString()
          const editedBy = `${user?.role.toUpperCase()} - ${user?.name}`
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

          AttendanceService.saveRecords(nextRecords)

          useSharedStore.getState().addNotification({
            title: "History Attendance Edited",
            message: `${target.subjectCode} (${target.timeSlot}) was edited from attendance history by ${user?.name}`,
            targetRole: "faculty",
          })

          return {
            attendanceRecords: nextRecords,
          }
        }),

      hydrateAttendanceRecords: () => {
        const savedRecords = AttendanceService.loadRecords()
        if (savedRecords.length === 0) return
        set({ attendanceRecords: savedRecords })
      },

      submitCorrectionRequest: ({ recordId, studentId, reason }) => {
        const state = get()
        const user = useAuthStore.getState().user
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
        const requestedBy = `${user?.role.toUpperCase()} - ${user?.name}`

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
        }))

        useSharedStore.getState().addNotification({
          title: "New Correction Request",
          message: `${student.rollNumber} ${student.name} requested correction for ${record.subjectCode} (${record.timeSlot}).`,
          targetRole: "faculty",
        })

        return { success: true, message: "Correction request submitted." }
      },

      approveCorrectionRequest: (requestId) =>
        set((state) => {
          const request = state.correctionRequests.find((item) => item.id === requestId)
          if (!request) return {}

          const user = useAuthStore.getState().user
          const updatedRecords =
            request.recordId && request.changes && request.changes.length > 0
              ? state.attendanceRecords.map((record) => {
                  if (record.id !== request.recordId) return record

                  return {
                    ...record,
                    students: record.students.map((student) => {
                      const change = request.changes?.find((item) => item.studentId === student.id)
                      return change ? { ...student, status: change.toStatus } : student
                    }),
                    editedAt: new Date().toISOString(),
                    editedBy: `${user?.role.toUpperCase()} - ${user?.name}`,
                    isEdited: true,
                  }
                })
              : state.attendanceRecords

          AttendanceService.saveRecords(updatedRecords)

          return {
            correctionRequests: state.correctionRequests.map((item) =>
              item.id === requestId ? { ...item, status: "approved" as const } : item
            ),
            attendanceRecords: updatedRecords,
          }
        }),

      rejectCorrectionRequest: (requestId) =>
        set((state) => ({
          correctionRequests: state.correctionRequests.map((request) =>
            request.id === requestId ? { ...request, status: "rejected" as const } : request
          ),
        })),

      deleteCorrectionRequest: (requestId) =>
        set((state) => ({
          correctionRequests: state.correctionRequests.filter((request) => request.id !== requestId),
        })),

      syncWithRoster: (roster) => {
        set({ students: roster.map((student) => ({ ...student, status: "present" })) })
      },
    }),
    {
      name: "attendance-records-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Inter-store synchronization: When selected timetable cell changes, set appropriate students state
useTimetableStore.subscribe((state) => {
  const cell = state.selectedCell
  if (!cell) {
    useAttendanceStore.setState({
      activeRecordId: null,
      isViewingSubmittedAttendance: false,
      isEditMode: false,
    })
    return
  }

  const attendanceState = useAttendanceStore.getState()
  if (cell.status !== "submitted") {
    const draft = attendanceState.attendanceDrafts?.[cell.id]
    if (draft) {
      useAttendanceStore.setState({
        students: draft.students.map((s) => ({ ...s })),
        activeRecordId: null,
        isViewingSubmittedAttendance: false,
        isEditMode: false,
      })
    } else {
      const sectionId = useTimetableStore.getState().currentSectionFilter || "sec-1"
      const roster = useAcademicStore.getState().getSectionRoster(sectionId)
      useAttendanceStore.setState({
        students: roster.map((s) => ({ ...s, status: "present" })),
        activeRecordId: null,
        isViewingSubmittedAttendance: false,
        isEditMode: false,
      })
    }
    return
  }

  const record = findAttendanceRecordForCell(attendanceState.attendanceRecords, cell)
  if (!record) {
    const draft = attendanceState.attendanceDrafts?.[cell.id]
    if (draft) {
      useAttendanceStore.setState({
        students: draft.students.map((s) => ({ ...s })),
        activeRecordId: null,
        isViewingSubmittedAttendance: false,
        isEditMode: false,
      })
    } else {
      const sectionId = useTimetableStore.getState().currentSectionFilter || "sec-1"
      const roster = useAcademicStore.getState().getSectionRoster(sectionId)
      useAttendanceStore.setState({
        students: roster.map((s) => ({ ...s, status: "present" })),
        activeRecordId: null,
        isViewingSubmittedAttendance: false,
        isEditMode: false,
      })
    }
    return
  }

  useAttendanceStore.setState({
    students: record.students.map((s) => ({ ...s })),
    activeRecordId: record.id,
    isViewingSubmittedAttendance: true,
    isEditMode: false,
  })
})

// Sync student list on roster CRUD
useStudentStore.subscribe((state) => {
  const sectionId = useTimetableStore.getState().currentSectionFilter || "sec-1"
  const roster = useAcademicStore.getState().getSectionRoster(sectionId)
  useAttendanceStore.getState().syncWithRoster(roster)
})
