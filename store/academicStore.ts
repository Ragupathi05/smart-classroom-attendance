import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useTimetableStore } from "./timetableStore"
import { useStudentStore } from "./studentStore"
import type { Student, StudentSectionAssignment } from "@/types"



export interface AcademicSession {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE"
}

export interface AcademicBatch {
  id: string
  name: string // e.g. "2023-2027 Batch"
  startYear: number
  endYear: number
  currentYearLevel: string // "1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated"
  currentSemester: "Odd" | "Even"
  status: "ACTIVE" | "INACTIVE" | "GRADUATED"
}

export interface Program {
  id: string
  name: string
  years: number
  studentCount: number
  sectionCount: number
}

export interface Section {
  id: string
  name: string
  year: string
  semester: string
  sectionName: string
  studentCount: number
  crName: string
  lrName: string
  facultyCount: number
  status: "Active" | "Inactive"
  batchId?: string // Scopes sections to specific student cohorts
  academicSessionId?: string
}

export interface FacultyMember {
  id: string
  code: string
  name: string
  department: string
  email: string
  phone: string
  subjects: string[]
  sections: string[]
  weeklyLoad: number
  weeklyWorkloadLimit?: number
  attendancePending: number
  status: "Active" | "Inactive"
  photo?: string
}

export interface DepartmentActivity {
  id: string
  time: string
  date: string
  type: string
  detail: string
}

export interface HodNotification {
  id: string
  title: string
  body: string
  target: string
  schedule: string
  sentAt: string
}

export interface CRLRAssignmentHistoryEntry {
  id: string
  sectionId: string
  role: "cr" | "lr"
  studentName: string
  assignedDate: string
}

interface AcademicState {
  batches: AcademicBatch[]
  programs: Program[]
  sections: Section[]
  facultyList: FacultyMember[]
  activities: DepartmentActivity[]
  notifications: HodNotification[]
  selectedSectionWorkspace: string | null
  currentBatchId: string
  viewingBatchId: string
  academicSessions: AcademicSession[]
  currentSessionId: string
  enrollments: StudentSectionAssignment[]
  crlrAssignmentHistory: CRLRAssignmentHistoryEntry[]
  
  // Actions
  setSelectedSectionWorkspace: (sectionId: string | null) => void
  setViewingBatchId: (id: string) => void
  addBatch: (batch: Omit<AcademicBatch, "id">) => void
  updateBatch: (id: string, batch: Partial<AcademicBatch>) => void
  deleteBatch: (id: string) => void
  addProgram: (program: Omit<Program, "id">) => void
  addSection: (section: Omit<Section, "id" | "batchId"> & { batchId?: string }) => void
  updateSection: (id: string, section: Partial<Section>) => void
  deleteSection: (id: string) => void
  addFaculty: (faculty: Omit<FacultyMember, "id">) => void
  updateFaculty: (id: string, faculty: Partial<FacultyMember>) => void
  deactivateFaculty: (id: string) => void
  deleteFaculty: (id: string) => void
  assignCRLR: (sectionId: string, crName: string, lrName: string) => void
  addActivity: (type: string, detail: string) => void
  createNotification: (notif: Omit<HodNotification, "id" | "sentAt">) => void
  promoteBatch: (batchId: string, config: { targetSemester: "Odd" | "Even"; retainFaculty: boolean; retainTimetable: boolean }) => Promise<void>
  addEnrollment: (studentId: string, sectionId: string, academicSessionId?: string) => void
  getSectionRoster: (sectionId: string) => Student[]
  getSectionStudentsWithStatus: (sectionId: string) => (Student & { enrollmentStatus: "Active" | "Inactive" | "Completed" | "Alumni" })[]
  transferStudent: (studentId: string, fromSectionId: string, toSectionId: string) => void
  toggleStudentActive: (studentId: string, sectionId: string, active: boolean) => void
  setSessionActive: (id: string) => void
  addAcademicSession: (name: string) => void
  clearSectionEnrollments: (sectionId: string) => void
  syncWithSupabase: () => Promise<void>
}




export const useAcademicStore = create<AcademicState>()(
  persist(
    (set, get) => ({
      batches: [],
      programs: [],
      sections: [],
      facultyList: [],
      activities: [],
      notifications: [],
      selectedSectionWorkspace: null,
      currentBatchId: "",
      viewingBatchId: "",
      academicSessions: [],
      currentSessionId: "",
      enrollments: [],
      crlrAssignmentHistory: [],


      setSelectedSectionWorkspace: (sectionId) => set({ selectedSectionWorkspace: sectionId }),
      
      setViewingBatchId: (id) => set({ viewingBatchId: id }),

      addBatch: (batch) => set((state) => {
        const newBatch: AcademicBatch = {
          ...batch,
          id: `batch-${Date.now()}`
        }

        try {
          const { SupabaseService } = require("@/services/SupabaseService")
          SupabaseService.createProgram({
            name: newBatch.name,
            years: newBatch.endYear - newBatch.startYear
          }).then((res: any) => {
            if (res && res.id) {
              set((currState) => ({
                batches: currState.batches.map(b => b.id === newBatch.id ? { ...b, id: res.id } : b),
                viewingBatchId: currState.viewingBatchId === newBatch.id ? res.id : currState.viewingBatchId,
                currentBatchId: currState.currentBatchId === newBatch.id ? res.id : currState.currentBatchId,
                // Also update any sections that were temporarily created with the client ID to map to the new database ID
                sections: currState.sections.map(s => s.batchId === newBatch.id ? { ...s, batchId: res.id } : s)
              }))
            }
          })
        } catch (err) {
          console.error("Failed to persist program/batch in Supabase:", err)
        }

        return {
          batches: [...state.batches, newBatch],
          viewingBatchId: state.viewingBatchId ? state.viewingBatchId : newBatch.id,
          currentBatchId: state.currentBatchId ? state.currentBatchId : newBatch.id,
          activities: [
            { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "Batch Configured", detail: `Student cohort ${batch.name} registered.` },
            ...state.activities
          ]
        }
      }),

      updateBatch: (id, updatedFields) => set((state) => {
        const updatedBatches = state.batches.map((b) =>
          b.id === id ? { ...b, ...updatedFields } : b
        )
        return {
          batches: updatedBatches,
          activities: [
            { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "Batch Updated", detail: `Batch settings modified.` },
            ...state.activities
          ]
        }
      }),

      deleteBatch: (id) => set((state) => {
        const updatedBatches = state.batches.filter((b) => b.id !== id)
        const updatedSections = state.sections.filter((s) => s.batchId !== id)
        return {
          batches: updatedBatches,
          sections: updatedSections,
          viewingBatchId: state.viewingBatchId === id ? (updatedBatches[0]?.id || "") : state.viewingBatchId,
          currentBatchId: state.currentBatchId === id ? (updatedBatches[0]?.id || "") : state.currentBatchId,
          activities: [
            { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "Batch Deleted", detail: `Batch removed from database.` },
            ...state.activities
          ]
        }
      }),

      addProgram: (program) => set((state) => ({
        programs: [...state.programs, { ...program, id: `prog-${Date.now()}` }]
      })),

      addSection: (section) => set((state) => {
        const newSection: Section = {
          ...section,
          id: `sec-${Date.now()}`,
          batchId: section.batchId || state.currentBatchId,
          academicSessionId: section.academicSessionId || state.currentSessionId,
        }

        try {
          const { SupabaseService } = require("@/services/SupabaseService")
          SupabaseService.getOrInitializeDepartmentId().then((deptId: string) => {
            SupabaseService.createSection({
              name: newSection.name,
              year: newSection.year,
              semester: newSection.semester,
              sectionName: newSection.sectionName,
              studentCount: newSection.studentCount,
              crName: newSection.crName,
              lrName: newSection.lrName,
              facultyCount: newSection.facultyCount,
              status: newSection.status,
              batchId: newSection.batchId,
              academicSessionId: newSection.academicSessionId
            }, deptId).then((res: any) => {
              if (res && res.id) {
                set((currState) => ({
                  sections: currState.sections.map(s => s.id === newSection.id ? { ...s, id: res.id } : s)
                }))
              }
            })
          })
        } catch (err) {
          console.error("Failed to persist section in Supabase:", err)
        }

        return {
          sections: [...state.sections, newSection],
          activities: [
            { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "Section Created", detail: `New section ${section.name} created.` },
            ...state.activities
          ]
        }
      }),

      updateSection: (id, updatedFields) => set((state) => ({
        sections: state.sections.map((s) => s.id === id ? { ...s, ...updatedFields } : s)
      })),

      deleteSection: (id) => set((state) => ({
        sections: state.sections.filter((s) => s.id !== id),
        selectedSectionWorkspace: state.selectedSectionWorkspace === id ? null : state.selectedSectionWorkspace
      })),

      addFaculty: (faculty) => set((state) => ({
        facultyList: [...state.facultyList, { ...faculty, id: `fac-${Date.now()}` }],
        activities: [
          { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "Faculty Registered", detail: `Registered ${faculty.name} (${faculty.code}).` },
          ...state.activities
        ]
      })),

      updateFaculty: (id, fields) => set((state) => ({
        facultyList: state.facultyList.map((f) => f.id === id ? { ...f, ...fields } : f)
      })),

      deactivateFaculty: (id) => set((state) => ({
        facultyList: state.facultyList.map((f) => f.id === id ? { ...f, status: "Inactive" as const } : f)
      })),

      deleteFaculty: (id) => set((state) => ({
        facultyList: state.facultyList.filter((f) => f.id !== id)
      })),

      assignCRLR: (sectionId, crName, lrName) => set((state) => {
        const section = state.sections.find((s) => s.id === sectionId)
        
        const newHistory = [...state.crlrAssignmentHistory]
        const todayStr = new Date().toISOString().split("T")[0]

        if (section) {
          if (crName && crName !== "To be assigned" && crName !== section.crName) {
            newHistory.unshift({
              id: `hist-${Date.now()}-cr`,
              sectionId,
              role: "cr",
              studentName: crName,
              assignedDate: todayStr
            })
          }
          if (lrName && lrName !== "To be assigned" && lrName !== section.lrName) {
            newHistory.unshift({
              id: `hist-${Date.now()}-lr`,
              sectionId,
              role: "lr",
              studentName: lrName,
              assignedDate: todayStr
            })
          }
        }

        return {
          sections: state.sections.map((s) => 
            s.id === sectionId ? { ...s, crName, lrName } : s
          ),
          crlrAssignmentHistory: newHistory,
          activities: [
            { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type: "CR/LR Assigned", detail: `CR/LR changed for ${section?.name || "Section"}.` },
            ...state.activities
          ]
        }
      }),

      addActivity: (type, detail) => set((state) => ({
        activities: [
          { id: `act-${Date.now()}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: "Today", type, detail },
          ...state.activities
        ]
      })),

      createNotification: (notif) => set((state) => {
        const newNotif: HodNotification = {
          ...notif,
          id: `notif-${Date.now()}`,
          sentAt: new Date().toLocaleString()
        }
        return {
          notifications: [newNotif, ...state.notifications]
        }
      }),

      promoteBatch: async (batchId, config) => {
        const batch = get().batches.find(b => b.id === batchId)
        if (!batch) return

        const isOddTransition = config.targetSemester === "Odd"
        const yearMapping: Record<string, string> = {
          "1st Year": "2nd Year",
          "2nd Year": "3rd Year",
          "3rd Year": "4th Year",
          "4th Year": "Graduated",
        }

        const nextYearLevel = isOddTransition ? (yearMapping[batch.currentYearLevel] || "Graduated") : batch.currentYearLevel
        const isGraduated = nextYearLevel === "Graduated"

        // 1. Create Next Academic Session name & entry
        const currentSession = get().academicSessions.find(s => s.id === get().currentSessionId)
        const currentSessionName = currentSession ? currentSession.name : "2026-2027"
        const years = currentSessionName.split("-").map(Number)
        const nextSessionName = `${years[0] + 1}-${years[1] + 1}`
        
        // Execute Supabase database migration in background
        const { SupabaseService } = require("@/services/SupabaseService")
        const dbResult = await SupabaseService.promoteBatchInSupabase(
          batchId,
          nextSessionName,
          nextYearLevel,
          config.targetSemester,
          { retainFaculty: config.retainFaculty, retainTimetable: config.retainTimetable }
        )

        const nextSessionId = dbResult.success && dbResult.nextSessionId
          ? dbResult.nextSessionId
          : `session-${nextSessionName}`

        const newSession: AcademicSession = {
          id: nextSessionId,
          name: nextSessionName,
          status: "ACTIVE"
        }
        const updatedSessions = get().academicSessions.map(s => ({
          ...s,
          status: "INACTIVE" as const
        })).concat(newSession)

        // 2. Update Batch parameters
        const updatedBatches = get().batches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                currentYearLevel: nextYearLevel,
                currentSemester: config.targetSemester,
                status: isGraduated ? ("GRADUATED" as const) : ("ACTIVE" as const),
              }
            : b
        )

        // 3. Clone sections into the new academic session (rather than modifying the old ones!)
        const batchSections = get().sections.filter(s => s.batchId === batchId && s.academicSessionId === get().currentSessionId)
        const newSectionsList = [...get().sections]
        const newAssignments = [...get().enrollments]

        batchSections.forEach((oldSec) => {
          let nextName = oldSec.name
          if (isOddTransition) {
            if (oldSec.year === "1st Year") nextName = oldSec.name.replace(/^I\s/, "II ")
            else if (oldSec.year === "2nd Year") nextName = oldSec.name.replace(/^II\s/, "III ")
            else if (oldSec.year === "3rd Year") nextName = oldSec.name.replace(/^III\s/, "IV ")
            else if (oldSec.year === "4th Year") nextName = `${oldSec.name} (Graduated)`
          }

          const newSectionId = `sec-promoted-${oldSec.id}-${Date.now()}`
          const newSectionObj: Section = {
            ...oldSec,
            id: newSectionId,
            name: nextName,
            year: nextYearLevel,
            semester: config.targetSemester,
            academicSessionId: nextSessionId,
            status: isGraduated ? ("Inactive" as const) : ("Active" as const),
            crName: "To be assigned",
            lrName: "To be assigned",
            facultyCount: config.retainFaculty ? oldSec.facultyCount : 0,
          }
          newSectionsList.push(newSectionObj)

          // 4. Migrate Student Section Assignments
          const oldEnrollments = get().enrollments.filter(e => e.sectionId === oldSec.id && e.status === "Active")
          oldEnrollments.forEach(e => {
            // Set old assignment status to Completed/Alumni
            const oldIdx = newAssignments.findIndex(item => item.id === e.id)
            if (oldIdx !== -1) {
              newAssignments[oldIdx] = {
                ...newAssignments[oldIdx],
                status: isGraduated ? "Alumni" as const : "Completed" as const
              }
            }

            // Create new assignment in the promoted section
            if (!isGraduated) {
              newAssignments.push({
                id: `enroll-${e.studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                studentId: e.studentId,
                sectionId: newSectionId,
                academicSessionId: nextSessionId,
                status: "Active" as const,
                joinedOn: new Date().toISOString().split("T")[0]
              })
            }
          })

          // 5. Carry forward timetable cell templates as drafts
          try {
            const tStore = useTimetableStore.getState()
            if (tStore && tStore.timetables) {
              const newTimetables = { ...tStore.timetables }
              if (config.retainTimetable && !isGraduated) {
                newTimetables[newSectionId] = (tStore.timetables[oldSec.id] || []).map(cell => ({
                  ...cell,
                  id: `new-${cell.id}-${Date.now()}`,
                  sectionId: newSectionId,
                  academicSessionId: nextSessionId,
                  isPublished: false // Created as Draft version!
                }))
              } else {
                newTimetables[newSectionId] = []
              }
              useTimetableStore.setState({ timetables: newTimetables })
            }
          } catch (e) {
            console.error("Timetable copy during promotion failed", e)
          }
        })

        set({
          academicSessions: updatedSessions,
          currentSessionId: nextSessionId,
          batches: updatedBatches,
          sections: newSectionsList,
          enrollments: newAssignments,
          selectedSectionWorkspace: newSectionsList.find(s => s.academicSessionId === nextSessionId)?.id || get().selectedSectionWorkspace,
          activities: [
            {
              id: `act-${Date.now()}`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: "Today",
              type: "Batch Promotion",
              detail: `Promoted ${batch.name} to ${nextYearLevel} for session ${nextSessionName}. Timetables copied as drafts.`
            },
            ...get().activities
          ]
        })
      },

      addEnrollment: (studentId, sectionId, academicSessionId) => set((state) => {
        const sessId = academicSessionId || state.currentSessionId
        const exists = state.enrollments.some(e => e.studentId === studentId && e.sectionId === sectionId && e.academicSessionId === sessId)
        if (exists) return {}

        try {
          const { SupabaseService } = require("@/services/SupabaseService")
          const student = useStudentStore.getState().classStudents.find(s => s.id === studentId)
          if (student) {
            SupabaseService.enrollStudent({
              rollNumber: student.rollNumber,
              name: student.name,
              gender: student.gender || "Male",
              mobileNumber: student.mobileNumber || ""
            }, sectionId, sessId)
          }
        } catch (err) {
          console.error("Supabase enrollment trigger failed:", err)
        }

        const newEnrollment: StudentSectionAssignment = {
          id: `enroll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId,
          sectionId,
          academicSessionId: sessId,
          status: "Active",
          joinedOn: new Date().toISOString().split("T")[0]
        }
        return {
          enrollments: [...state.enrollments, newEnrollment]
        }
      }),

      clearSectionEnrollments: (sectionId) => set((state) => {
        const sessId = state.currentSessionId
        const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        
        if (isValidUuid(sectionId) && isValidUuid(sessId)) {
          try {
            const { supabase } = require("@/lib/supabase/client")
            supabase
              .from("student_section_assignments")
              .update({ is_active: false })
              .eq("section_id", sectionId)
              .eq("academic_session_id", sessId)
              .then(({ error }: any) => {
                if (error) {
                  if (error.code === "42501") {
                    console.warn("Supabase RLS Restriction: clearSectionEnrollments bypassed, using local store.")
                  } else {
                    console.error("Error deactivating old assignments in Supabase:", error)
                  }
                }
              })
          } catch (err) {
            console.error("Failed to deactivate old assignments in Supabase:", err)
          }
        }

        return {
          enrollments: state.enrollments.filter(e => !(e.sectionId === sectionId && e.academicSessionId === sessId))
        }
      }),

      getSectionRoster: (sectionId) => {
        const state = get()
        const activeSession = state.currentSessionId
        const sectionStudentIds = state.enrollments
          .filter(e => e.sectionId === sectionId && e.academicSessionId === activeSession && e.status === "Active")
          .map(e => e.studentId)
        
        const allStudents = useStudentStore.getState().classStudents || []
        const roster = allStudents.filter(s => sectionStudentIds.includes(s.id))
        roster.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
        return roster
      },

      getSectionStudentsWithStatus: (sectionId) => {
        const state = get()
        const activeSession = state.currentSessionId
        const assignments = state.enrollments.filter(
          (e) => e.sectionId === sectionId && e.academicSessionId === activeSession
        )
        
        const allStudents = useStudentStore.getState().classStudents || []

        const list = assignments.map(enroll => {
          const student = allStudents.find(s => s.id === enroll.studentId)
          if (!student) return null
          return {
            ...student,
            enrollmentStatus: enroll.status
          }
        }).filter(Boolean) as (Student & { enrollmentStatus: "Active" | "Inactive" | "Completed" | "Alumni" })[]

        list.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
        return list
      },

      transferStudent: (studentId, fromSectionId, toSectionId) => set((state) => {
        // End the active enrollment for the old section
        const updatedEnrollments = state.enrollments.map((e) => {
          if (e.studentId === studentId && e.sectionId === fromSectionId && e.status === "Active" && e.academicSessionId === state.currentSessionId) {
            return { ...e, status: "Completed" as const }
          }
          return e
        })

        // Add new enrollment for target section
        const newEnrollment: StudentSectionAssignment = {
          id: `enroll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId,
          sectionId: toSectionId,
          academicSessionId: state.currentSessionId,
          status: "Active",
          joinedOn: new Date().toISOString().split("T")[0]
        }

        return {
          enrollments: [...updatedEnrollments, newEnrollment]
        }
      }),

      toggleStudentActive: (studentId, sectionId, active) => set((state) => {
        const updated = state.enrollments.map((e) => {
          if (e.studentId === studentId && e.sectionId === sectionId && e.academicSessionId === state.currentSessionId) {
            return {
              ...e,
              status: active ? ("Active" as const) : ("Inactive" as const)
            }
          }
          return e
        })
        return { enrollments: updated }
      }),

      setSessionActive: (id) => set((state) => {
        const updated = state.academicSessions.map(s => ({
          ...s,
          status: (s.id === id ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE"
        }))
        
        // Persist active status change to Supabase in the background
        try {
          const { supabase } = require("@/lib/supabase/client")
          supabase.from("academic_sessions").update({ status: "INACTIVE" }).eq("status", "ACTIVE").then(() => {
            supabase.from("academic_sessions").update({ status: "ACTIVE" }).eq("id", id).catch(console.error)
          }).catch(console.error)
        } catch (e) {
          console.error("Failed to update active session in Supabase:", e)
        }

        return {
          academicSessions: updated,
          currentSessionId: id
        }
      }),

      addAcademicSession: (name) => set((state) => {
        const id = `session-${name.replace(/\s+/g, "-").toLowerCase()}`
        const exists = state.academicSessions.some(s => s.name === name)
        if (exists) return {}
        const newSession: AcademicSession = {
          id,
          name,
          status: "INACTIVE"
        }

        const years = name.split("-").map(Number)
        const startYear = years[0] || new Date().getFullYear()
        const endYear = years[1] || (startYear + 1)
        const startDate = `${startYear}-06-01`
        const endDate = `${endYear}-05-31`

        try {
          const { SupabaseService } = require("@/services/SupabaseService")
          SupabaseService.createAcademicSession({
            name: newSession.name,
            status: newSession.status
          }, startYear, endYear, startDate, endDate).then((res: any) => {
            if (res && res.id) {
              set((currState) => ({
                academicSessions: currState.academicSessions.map(s => s.id === newSession.id ? { ...s, id: res.id } : s),
                currentSessionId: currState.currentSessionId === newSession.id ? res.id : currState.currentSessionId,
                // Also update any sections that were temporarily created with the client ID to map to the new database ID
                sections: currState.sections.map(s => s.academicSessionId === newSession.id ? { ...s, academicSessionId: res.id } : s)
              }))
            }
          })
        } catch (err) {
          console.error("Failed to persist academic session in Supabase:", err)
        }

        return {
          academicSessions: [...state.academicSessions, newSession]
        }
      }),

      syncWithSupabase: async () => {
        try {
          const { SupabaseService } = require("@/services/SupabaseService")
          const deptId = await SupabaseService.getOrInitializeDepartmentId()
          
          let sessions = await SupabaseService.fetchAcademicSessions()
          
          // Auto-bootstrap active session if database is empty
          if (sessions.length === 0) {
            const currentYear = new Date().getFullYear()
            const sessionName = `${currentYear}-${currentYear + 1}`
            const startYear = currentYear
            const endYear = currentYear + 1
            const startDate = `${startYear}-06-01`
            const endDate = `${endYear}-05-31`
            
            try {
              const res = await SupabaseService.createAcademicSession({
                name: sessionName,
                status: "ACTIVE"
              }, startYear, endYear, startDate, endDate)
              if (res) {
                sessions = [res]
              }
            } catch (err) {
              console.error("Failed to auto-bootstrap academic session:", err)
            }
          }

          const activeSession = sessions.find((s: any) => s.status === "ACTIVE")
          
          const programs = await SupabaseService.fetchPrograms()
          const sections = await SupabaseService.fetchSections(deptId)
          const facultyList = await SupabaseService.fetchFaculty(deptId)
          
          // Fetch student roster and assignments
          const students = await SupabaseService.fetchAllStudents()
          const enrollments = await SupabaseService.fetchAllEnrollments()

          // Sync studentStore
          useStudentStore.setState({ classStudents: students })

           const updatedBatches = programs.map((p: any) => {
            const match = get().batches.find((b: any) => {
              const normL = b.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              const normP = p.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              return b.id === p.id || normL === normP
            })
            return {
              id: p.id,
              name: p.name,
              startYear: match?.startYear || 2023,
              endYear: match?.endYear || 2027,
              currentYearLevel: match?.currentYearLevel || "3rd Year",
              currentSemester: match?.currentSemester || "Odd",
              status: match?.status || "ACTIVE"
            }
          })

          let updatedViewingBatchId = get().viewingBatchId
          let updatedCurrentBatchId = get().currentBatchId

          const oldViewingBatch = get().batches.find((b: any) => b.id === get().viewingBatchId)
          if (oldViewingBatch) {
            const matchingNewBatch = updatedBatches.find((b: any) => {
              const normOld = oldViewingBatch.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              const normNew = b.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              return normOld === normNew
            })
            if (matchingNewBatch) {
              updatedViewingBatchId = matchingNewBatch.id
            }
          } else if (updatedBatches.length > 0) {
            updatedViewingBatchId = updatedBatches[0].id
          }

          const oldCurrentBatch = get().batches.find((b: any) => b.id === get().currentBatchId)
          if (oldCurrentBatch) {
            const matchingNewBatch = updatedBatches.find((b: any) => {
              const normOld = oldCurrentBatch.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              const normNew = b.name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "")
              return normOld === normNew
            })
            if (matchingNewBatch) {
              updatedCurrentBatchId = matchingNewBatch.id
            }
          } else if (updatedBatches.length > 0) {
            updatedCurrentBatchId = updatedBatches[0].id
          }

          const nextState: any = {
            academicSessions: sessions,
            batches: updatedBatches,
            viewingBatchId: updatedViewingBatchId,
            currentBatchId: updatedCurrentBatchId,
            sections: sections,
            facultyList: facultyList,
            enrollments: enrollments
          }
 
           if (activeSession) {
             nextState.currentSessionId = activeSession.id
           } else if (sessions.length > 0) {
             nextState.currentSessionId = sessions[0].id
           } else {
             nextState.currentSessionId = ""
           }
 
           // Automatically set selected section if null
           if (!get().selectedSectionWorkspace && sections.length > 0) {
             nextState.selectedSectionWorkspace = sections[0].id
           }
 
           set(nextState)
        } catch (err) {
          console.error("Failed to sync with Supabase:", err)
        }
      },
    }),
    {
      name: "attendance-academic-store-v8",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
