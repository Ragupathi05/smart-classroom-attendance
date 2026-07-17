import { useTimetableStore, useAttendanceStore, useAcademicStore } from "@/store"
import type { TimetableCell, AttendanceRecord } from "@/types"

export interface TodayDashboardSummary {
  totalClasses: number
  conducted: number
  pending: number
  averageAttendance: number
  presentCount: number
  absentCount: number
  progressPercentage: number
  todayClasses: TimetableCell[]
}

export const DashboardService = {
  getTodaySummary(sectionId: string, dateStr: string): TodayDashboardSummary {
    const timetableState = useTimetableStore.getState()
    const attendanceState = useAttendanceStore.getState()
    const academicState = useAcademicStore.getState()

    // 1. Get today's classes from timetable templates
    const allCells = timetableState.timetables[sectionId] || []
    
    // Map Javascript day number to day string
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const todayDayName = dayNames[new Date(dateStr).getDay()]
    
    const todayClasses = allCells.filter(cell => cell.day === todayDayName && cell.isPublished !== false)
    const totalClasses = todayClasses.length

    // 2. Fetch today's submitted attendance records for this section
    const activeSessionId = academicState.currentSessionId
    const submittedRecords = attendanceState.attendanceRecords.filter(r => 
      r.sectionId === sectionId &&
      r.academicSessionId === activeSessionId &&
      r.date === dateStr
    )

    const conducted = submittedRecords.length
    const pending = Math.max(0, totalClasses - conducted)

    // Calculate present and absent counts across today's sessions
    let presentSum = 0
    let absentSum = 0
    let rateSum = 0

    submittedRecords.forEach(record => {
      const present = record.students.filter(s => s.status !== "absent").length
      const absent = record.students.filter(s => s.status === "absent").length
      const total = record.students.length
      
      presentSum += present
      absentSum += absent
      
      if (total > 0) {
        rateSum += (present / total) * 100
      }
    })

    const averageAttendance = conducted > 0 ? Math.round(rateSum / conducted) : 0
    const progressPercentage = totalClasses > 0 ? Math.round((conducted / totalClasses) * 100) : 0

    return {
      totalClasses,
      conducted,
      pending,
      averageAttendance,
      presentCount: presentSum,
      absentCount: absentSum,
      progressPercentage,
      todayClasses
    }
  }
}
