import type { AttendanceRecord, Student } from "@/types"

export const ALLOWED_EDIT_WINDOW_MS = 60 * 60 * 1000

export function getCounts(students: Student[]) {
  const present = students.filter((student) => student.status === "present").length
  const permission = students.filter((student) => student.status === "permission").length
  const absent = students.filter((student) => student.status === "absent").length
  return { present, permission, absent }
}

export function isWithinAllowedWindow(record: AttendanceRecord): boolean {
  if (!record.submittedAt) return false
  const submittedTime = new Date(record.submittedAt).getTime()
  return Date.now() - submittedTime <= ALLOWED_EDIT_WINDOW_MS
}

export function formatShortRoll(rollNumber: string): string {
  const regularMatch = /^23691A33(\d{2})$/i.exec(rollNumber)
  if (regularMatch) {
    return regularMatch[1]
  }

  const lateralMatch = /^24695A33(\d{2})$/i.exec(rollNumber)
  if (lateralMatch) {
    return `LE${Number(lateralMatch[1])}`
  }

  return rollNumber
}
