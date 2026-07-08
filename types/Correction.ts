import { AttendanceStatus } from "./Attendance"

export interface CorrectionChange {
  studentId: string
  rollNumber: string
  studentName: string
  fromStatus: AttendanceStatus
  toStatus: AttendanceStatus
}

export interface CorrectionRequest {
  id: string
  recordId?: string
  studentId?: string
  studentName?: string
  rollNumber?: string
  subject: string
  subjectCode?: string
  date: string
  timeSlot?: string
  className?: string
  facultyName?: string
  reason: string
  changes?: CorrectionChange[]
  requestedAt?: string
  requestedBy?: string
  status: "pending" | "approved" | "rejected"
}
