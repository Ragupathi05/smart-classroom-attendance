"use client"

import React, { useMemo } from "react"
import { Users, UserCheck, Clock, AlertCircle } from "lucide-react"
import { useAuthStore, useTimetableStore, useAttendanceStore, useStudentStore } from "@/store"
import { TimetableGrid } from "@/features/timetable/components/TimetableGrid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatisticsCard } from "@/components/shared"

export function Dashboard() {
  const { user } = useAuthStore()
  const { timetable } = useTimetableStore()
  const { attendanceRecords, correctionRequests } = useAttendanceStore()
  const { classStudents } = useStudentStore()

  const todayRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    return attendanceRecords.filter((r) => r.date === todayStr)
  }, [attendanceRecords])

  const stats = useMemo(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const today = dayNames[new Date().getDay()]
    const classesToday = timetable.filter((cell) => cell.day === today).length
    const attendanceMarked = timetable.filter((t) => t.status === "submitted").length
    const pendingCorrections = correctionRequests.filter((req) => req.status === "pending").length

    return [
      {
        title: "Total Students",
        icon: Users,
        value: classStudents.length,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        title: "Classes Today",
        icon: Clock,
        value: classesToday,
        color: "text-chart-2",
        bgColor: "bg-chart-2/10",
      },
      {
        title: "Attendance Marked",
        icon: UserCheck,
        value: attendanceMarked,
        color: "text-chart-2",
        bgColor: "bg-chart-2/10",
      },
      {
        title: "Pending Corrections",
        icon: AlertCircle,
        value: pendingCorrections,
        color: "text-chart-3",
        bgColor: "bg-chart-3/10",
      },
    ]
  }, [timetable, classStudents.length, correctionRequests])

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {user?.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user?.role === "faculty" 
            ? "View attendance records and analytics for your classes"
            : "Manage attendance for your class today"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatisticsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            bgColor={stat.bgColor}
            index={index}
          />
        ))}
      </div>

      {/* Timetable Grid */}
      <TimetableGrid />

      {/* Recent Attendance */}
      {todayRecords.length > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <UserCheck className="h-5 w-5 text-primary" />
              {"Today's Attendance Records"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayRecords.map((record, index) => {
                const present = record.students.filter((s) => s.status === "present").length
                const absent = record.students.filter((s) => s.status === "absent").length
                const permission = record.students.filter((s) => s.status === "permission").length
                const total = record.students.length
                const percentage = Math.round((present / total) * 100)
                
                return (
                  <div
                    key={record.id}
                    className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-secondary/30 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:bg-secondary/50 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-105">
                        <span className="text-sm font-bold text-primary">{record.subjectCode}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{record.subject}</p>
                        <p className="text-xs text-muted-foreground">{record.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-2" />
                        <span className="text-muted-foreground">{present}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-3" />
                        <span className="text-muted-foreground">{permission}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-chart-5" />
                        <span className="text-muted-foreground">{absent}</span>
                      </div>
                      <div className="ml-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {percentage}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
