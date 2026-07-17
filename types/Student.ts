import { AttendanceStatus } from "./Attendance"

export interface Student {
  id: string
  rollNumber: string
  name: string
  status: AttendanceStatus
  gender?: "Male" | "Female"
  mobileNumber?: string
}
