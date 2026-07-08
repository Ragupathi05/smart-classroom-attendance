export interface TimetableCell {
  id: string
  subjectCode: string
  subjectName: string
  facultyName: string
  day: string
  timeSlot: string
  status: "current" | "submitted" | "missed" | "upcoming"
}
