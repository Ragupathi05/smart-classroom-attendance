import { Student } from "./Student"

export type AttendanceStatus = "present" | "permission" | "absent"

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
  sectionId?: string
  academicSessionId?: string
}
