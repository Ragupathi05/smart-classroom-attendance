"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore, useStudentStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CalendarDays, CheckCircle, Clock, Percent } from "lucide-react"
import { useClock } from "@/hooks/useClock"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function QuickStats() {
  const { timetable } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()
  const { classStudents } = useStudentStore()
  const now = useClock(30000)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const nowDay = now.getDay()
  const todayName = nowDay >= 1 && nowDay <= 6 ? weekDays[nowDay - 1] : null

  const submittedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
  }, [attendanceRecords])

  const stats = useMemo(() => {
    // 1. Total students in class
    const studentsCount = classStudents.length

    // 2. Scheduled classes today
    const todayCells = todayName ? timetable.filter((cell) => cell.day === todayName) : []
    const classesToday = todayCells.length

    // 3. Completed classes today
    const completedClasses = todayCells.filter(
      (cell) => cell.status === "submitted" || submittedCellIds.has(cell.id)
    ).length

    // 4. Pending classes today
    const pendingClasses = classesToday - completedClasses

    // 5. Overall Average Attendance
    let overallAttended = 0
    let overallTotal = 0

    attendanceRecords.forEach((record) => {
      overallTotal += record.students.length
      overallAttended += record.students.filter(
        (s) => s.status === "present" || s.status === "permission"
      ).length
    })

    const avgAttendance = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0

    return {
      studentsCount,
      classesToday,
      completedClasses,
      pendingClasses,
      avgAttendance,
    }
  }, [timetable, classStudents.length, attendanceRecords, todayName, submittedCellIds])

  if (!mounted) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <div className="h-5 bg-secondary/80 rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent className="grid gap-3.5 pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-secondary/40 rounded-xl animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const items = [
    { label: "Total Students", value: stats.studentsCount, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Classes Today", value: stats.classesToday, icon: CalendarDays, color: "text-violet-500", bgColor: "bg-violet-500/10" },
    { label: "Completed", value: stats.completedClasses, icon: CheckCircle, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Pending Today", value: stats.pendingClasses, icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { label: "Avg Attendance", value: `${stats.avgAttendance}%`, icon: Percent, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  ]

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-base font-bold text-foreground">Actionable Statistics</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3.5 pb-4">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div 
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-3.5 py-2.5 transition-all duration-200 hover:bg-secondary/40"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-base font-black text-foreground tabular-nums">{item.value}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
