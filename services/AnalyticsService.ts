import { useAttendanceStore, useAcademicStore } from "@/store"
import type { AttendanceRecord } from "@/types"

export interface SubjectAttendance {
  subject: string
  code: string
  percentage: number
  conducted: number
}

export interface WeeklyTrend {
  week: string
  percentage: number
}

export interface StudentAttendanceAlert {
  id: string
  name: string
  rollNumber: string
  attended: number
  total: number
  percentage: number
}

export interface SectionAnalyticsResult {
  overallAverage: number
  subjectWise: SubjectAttendance[]
  weeklyTrend: WeeklyTrend[]
  warningList: StudentAttendanceAlert[]
}

export const AnalyticsService = {
  calculateSectionStats(sectionId: string, academicSessionId: string): SectionAnalyticsResult {
    const attendanceState = useAttendanceStore.getState()
    
    // 1. Filter attendance records by section and session
    const records = attendanceState.attendanceRecords.filter(r => 
      r.sectionId === sectionId && 
      r.academicSessionId === academicSessionId
    )

    if (records.length === 0) {
      return {
        overallAverage: 0,
        subjectWise: [],
        weeklyTrend: [],
        warningList: []
      }
    }

    // 2. Calculate Overall Average
    let totalPresentRateSum = 0
    records.forEach(r => {
      const present = r.students.filter(s => s.status !== "absent").length
      const total = r.students.length
      if (total > 0) {
        totalPresentRateSum += (present / total) * 100
      }
    })
    const overallAverage = Math.round(totalPresentRateSum / records.length)

    // 3. Subject-wise calculation
    const subjectMap = new Map<string, { name: string; present: number; total: number; count: number }>()
    records.forEach(r => {
      const present = r.students.filter(s => s.status !== "absent").length
      const total = r.students.length
      
      const current = subjectMap.get(r.subjectCode) || { name: r.subject, present: 0, total: 0, count: 0 }
      current.present += present
      current.total += total
      current.count += 1
      subjectMap.set(r.subjectCode, current)
    })

    const subjectWise: SubjectAttendance[] = Array.from(subjectMap.entries()).map(([code, data]) => ({
      code,
      subject: data.name,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      conducted: data.count
    }))

    // 4. Weekly Trend (Group by ISO week key or simply record date sorting)
    // To make it simple and visual, let's group by date and sort chronologically
    const dateMap = new Map<string, { present: number; total: number }>()
    records.forEach(r => {
      const present = r.students.filter(s => s.status !== "absent").length
      const total = r.students.length
      const current = dateMap.get(r.date) || { present: 0, total: 0 }
      current.present += present
      current.total += total
      dateMap.set(r.date, current)
    })

    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const weeklyTrend: WeeklyTrend[] = sortedDates.map(([date, data]) => {
      // Convert date string e.g. "2026-07-12" to "Jul 12"
      const dateObj = new Date(date)
      const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      return {
        week: label,
        percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }
    })

    // 5. Warning list: Calculate attendance for each student in the roster
    const studentMap = new Map<string, { name: string; rollNumber: string; attended: number; total: number }>()
    
    records.forEach(r => {
      r.students.forEach(s => {
        const current = studentMap.get(s.id) || { name: s.name, rollNumber: s.rollNumber, attended: 0, total: 0 }
        current.total += 1
        if (s.status !== "absent") {
          current.attended += 1
        }
        studentMap.set(s.id, current)
      })
    })

    const warningList: StudentAttendanceAlert[] = Array.from(studentMap.entries())
      .map(([id, data]) => {
        const percentage = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0
        return {
          id,
          name: data.name,
          rollNumber: data.rollNumber,
          attended: data.attended,
          total: data.total,
          percentage
        }
      })
      .filter(student => student.percentage < 75) // Low attendance is below 75%
      .sort((a, b) => a.percentage - b.percentage)

    return {
      overallAverage,
      subjectWise,
      weeklyTrend,
      warningList
    }
  }
}
