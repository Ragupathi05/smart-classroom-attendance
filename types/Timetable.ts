export type TimetableCellClassType =
  | "regular"
  | "lab"
  | "seminar"
  | "workshop"
  | "holiday"
  | "exam"
  | "cancelled"
  | "extra-class"
  | "free-period"

export interface TimetableCell {
  id: string
  subjectCode: string
  subjectName: string
  facultyName: string
  day: string
  timeSlot: string
  status: "current" | "submitted" | "missed" | "upcoming"
  type?: TimetableCellClassType
}

export interface SpecialDay {
  date: string // YYYY-MM-DD
  type: "working" | "holiday" | "event" | "examination"
  reason?: string
}
