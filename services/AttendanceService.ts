import type { AttendanceRecord } from "@/types"
import { STORAGE_KEYS } from "@/constants"

export class AttendanceService {
  static loadRecords(): AttendanceRecord[] {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_RECORDS)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  static saveRecords(records: AttendanceRecord[]): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_RECORDS, JSON.stringify(records))
    } catch {
      // Ignore storage failures
    }
  }
}
