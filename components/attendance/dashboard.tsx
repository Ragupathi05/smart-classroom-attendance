"use client"

import { Users, UserCheck, Clock, AlertCircle } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { TimetableGrid } from "./timetable-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "Total Students",
    icon: Users,
    getValue: (_timetable: any[], students: any[]) => students.length,
    color: "text-primary",
    bgColor: "bg-primary/10",
    trend: null,
  },
  {
    title: "Classes Today",
    icon: Clock,
    getValue: (timetable: any[]) => {
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const today = dayNames[new Date().getDay()]
      return timetable.filter((cell) => cell.day === today).length
    },
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    trend: null,
  },
  {
    title: "Attendance Marked",
    icon: UserCheck,
    getValue: (timetable: any[]) => timetable.filter((t) => t.status === "submitted").length,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    trend: null,
  },
  {
    title: "Pending Corrections",
    icon: AlertCircle,
    getValue: (_timetable: any[], _students: any[], correctionRequests: any[]) =>
      correctionRequests.filter((req) => req.status === "pending").length,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    trend: null,
  },
]

export function Dashboard() {
  const { timetable, attendanceRecords, user, students, correctionRequests } = useAppStore()

  const todayRecords = attendanceRecords.filter(
    (r) => r.date === new Date().toISOString().split("T")[0]
  )

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
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const value = stat.getValue(timetable, students, correctionRequests)
          return (
            <Card 
              key={stat.title} 
              className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.trend && <p className="mt-0.5 text-[10px] text-chart-2">{stat.trend}</p>}
                </div>
              </CardContent>
            </Card>
          )
        })}
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
