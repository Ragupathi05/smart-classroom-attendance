"use client"

import { Users, UserCheck, UserX, AlertCircle } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { TimetableGrid } from "./timetable-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const stats = [
  {
    title: "Total Students",
    icon: Users,
    getValue: () => 20,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  {
    title: "Classes Today",
    icon: UserCheck,
    getValue: () => 6,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Attendance Marked",
    icon: UserCheck,
    getValue: (timetable: any[]) => timetable.filter((t) => t.status === "submitted").length,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Pending Corrections",
    icon: AlertCircle,
    getValue: () => 2,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
]

export function Dashboard() {
  const { timetable, attendanceRecords, user } = useAppStore()

  const todayRecords = attendanceRecords.filter(
    (r) => r.date === new Date().toISOString().split("T")[0]
  )

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === "faculty" 
            ? "View attendance records and analytics"
            : "Manage attendance for your class today"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const value = stat.getValue(timetable)
          return (
            <Card key={stat.title} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              {"Today's Attendance"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayRecords.map((record) => {
                const present = record.students.filter((s) => s.status === "present").length
                const absent = record.students.filter((s) => s.status === "absent").length
                const permission = record.students.filter((s) => s.status === "permission").length
                
                return (
                  <div
                    key={record.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <span className="text-sm font-bold text-primary">{record.subjectCode}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{record.subject}</p>
                        <p className="text-xs text-muted-foreground sm:text-sm">{record.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
                      <span className="text-primary">{present} Present</span>
                      <span className="text-warning">{permission} Perm</span>
                      <span className="text-destructive">{absent} Absent</span>
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
