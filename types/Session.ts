export type SessionType =
  | "regular"
  | "lab"
  | "seminar"
  | "workshop"
  | "guest_lecture"
  | "industrial_visit"
  | "examination"
  | "extra_class"
  | "free_hour"
  | "holiday"
  | "cancelled"

export interface SessionRecord {
  id: string // `${date}_${cellId}`
  date: string // YYYY-MM-DD
  day: string
  period: string // timeSlot
  subjectCode: string
  subjectName: string
  facultyName: string
  roomName: string
  originalSessionType: string
  currentSessionType: SessionType
  attendanceRequired: "Required" | "Optional" | "Not Required"
  attendanceStatus: "submitted" | "not_submitted" | "skipped"
  modifiedBy: string
  modifiedTime: string // e.g. "10:15 AM" or ISO
  notes?: string
}
