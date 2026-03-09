"use client"

import { useMemo } from "react"
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, BookOpen } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Colors for charts - computed values, not CSS variables
const COLORS = {
  primary: "#818cf8", // Indigo (primary)
  success: "#4ade80", // Green 
  warning: "#fbbf24", // Amber
  destructive: "#f87171", // Red
  muted: "#6b7280", // Gray
  grid: "#374151",
}

const ATTENDED_STATUSES = new Set(["present", "permission"])
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

const getShortWeekday = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

const toPercent = (attended: number, total: number) =>
  total > 0 ? Math.round((attended / total) * 100) : 0

const getISOWeekKey = (date: Date): string => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

export function Analytics() {
  const { attendanceRecords, students } = useAppStore()

  const {
    overallStats,
    attendanceTrend,
    weeklyTrendData,
    subjectData,
    lowAttendanceStudents,
  } = useMemo(() => {
    const weeklyBuckets = WEEK_DAYS.reduce<Record<string, { attended: number; total: number; classes: number }>>(
      (acc, day) => {
        acc[day] = { attended: 0, total: 0, classes: 0 }
        return acc
      },
      {}
    )

    const subjectBuckets = new Map<
      string,
      { subject: string; fullName: string; attended: number; total: number; classes: number }
    >()
    const weekAttendanceBuckets = new Map<string, { attended: number; total: number }>()

    let overallAttended = 0
    let overallTotal = 0

    attendanceRecords.forEach((record) => {
      const total = record.students.length
      const attended = record.students.filter((student) => ATTENDED_STATUSES.has(student.status)).length

      overallAttended += attended
      overallTotal += total

      const recordDate = new Date(`${record.date}T00:00:00`)
      const weekKey = getISOWeekKey(recordDate)
      const weekBucket = weekAttendanceBuckets.get(weekKey)
      if (weekBucket) {
        weekBucket.attended += attended
        weekBucket.total += total
      } else {
        weekAttendanceBuckets.set(weekKey, { attended, total })
      }

      const weekday = getShortWeekday(record.date)
      if (weeklyBuckets[weekday]) {
        weeklyBuckets[weekday].attended += attended
        weeklyBuckets[weekday].total += total
        weeklyBuckets[weekday].classes += 1
      }

      const existing = subjectBuckets.get(record.subjectCode)
      if (existing) {
        existing.attended += attended
        existing.total += total
        existing.classes += 1
      } else {
        subjectBuckets.set(record.subjectCode, {
          subject: record.subjectCode,
          fullName: record.subject,
          attended,
          total,
          classes: 1,
        })
      }
    })

    const computedWeeklyTrendData = WEEK_DAYS.map((day) => {
      const bucket = weeklyBuckets[day]
      return {
        day,
        attendance: toPercent(bucket.attended, bucket.total),
      }
    })

    const computedSubjectData = Array.from(subjectBuckets.values())
      .map((subject) => ({
        subject: subject.subject,
        fullName: subject.fullName,
        attendance: toPercent(subject.attended, subject.total),
        classes: subject.classes,
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject))

    const perStudent = new Map<string, { name: string; rollNumber: string; attended: number; classes: number }>()
    students.forEach((student) => {
      perStudent.set(student.rollNumber, {
        name: student.name,
        rollNumber: student.rollNumber,
        attended: 0,
        classes: 0,
      })
    })

    attendanceRecords.forEach((record) => {
      record.students.forEach((student) => {
        const existing = perStudent.get(student.rollNumber)
        if (!existing) return

        existing.classes += 1
        if (ATTENDED_STATUSES.has(student.status)) {
          existing.attended += 1
        }
      })
    })

    const computedLowAttendanceStudents = Array.from(perStudent.values())
      .filter((student) => student.classes > 0)
      .map((student) => {
        const attendance = toPercent(student.attended, student.classes)
        return {
          ...student,
          attendance,
        }
      })
      .filter((student) => student.attendance < 75)
      .sort((a, b) => a.attendance - b.attendance)

    const highestSubject = computedSubjectData.reduce<{ subject: string; value: number } | null>(
      (best, subject) => {
        if (!best || subject.attendance > best.value) {
          return { subject: subject.fullName, value: subject.attendance }
        }
        return best
      },
      null
    )

    const lowestSubject = computedSubjectData.reduce<{ subject: string; value: number } | null>(
      (worst, subject) => {
        if (!worst || subject.attendance < worst.value) {
          return { subject: subject.fullName, value: subject.attendance }
        }
        return worst
      },
      null
    )

    const computedOverallStats = {
      averageAttendance: toPercent(overallAttended, overallTotal),
      totalClasses: attendanceRecords.length,
      highestAttendance: highestSubject ?? { subject: "N/A", value: 0 },
      lowestAttendance: lowestSubject ?? { subject: "N/A", value: 0 },
    }

    const now = new Date()
    const previousWeekDate = new Date(now)
    previousWeekDate.setDate(now.getDate() - 7)

    const currentWeekKey = getISOWeekKey(now)
    const previousWeekKey = getISOWeekKey(previousWeekDate)

    const currentWeekBucket = weekAttendanceBuckets.get(currentWeekKey)
    const previousWeekBucket = weekAttendanceBuckets.get(previousWeekKey)

    const currentWeekAverage = currentWeekBucket
      ? toPercent(currentWeekBucket.attended, currentWeekBucket.total)
      : computedOverallStats.averageAttendance
    const previousWeekAverage = previousWeekBucket
      ? toPercent(previousWeekBucket.attended, previousWeekBucket.total)
      : currentWeekAverage

    const trend =
      currentWeekAverage > previousWeekAverage
        ? "up"
        : currentWeekAverage < previousWeekAverage
        ? "down"
        : "same"

    const computedAttendanceTrend = {
      currentWeekAverage,
      previousWeekAverage,
      trend,
      trendLabel: trend === "up" ? "↑ Improving" : trend === "down" ? "↓ Dropping" : "→ Stable",
      trendColor: trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500",
    }

    return {
      overallStats: computedOverallStats,
      attendanceTrend: computedAttendanceTrend,
      weeklyTrendData: computedWeeklyTrendData,
      subjectData: computedSubjectData,
      lowAttendanceStudents: computedLowAttendanceStudents,
    }
  }, [attendanceRecords, students])

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reports & Analytics</h1>
        <p className="mt-1 text-muted-foreground">Comprehensive attendance analytics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Average Attendance",
            value: `${attendanceTrend.currentWeekAverage}%`,
            trendLabel: attendanceTrend.trendLabel,
            trendColor: attendanceTrend.trendColor,
            icon: TrendingUp,
            color: "text-primary",
            bgColor: "bg-primary/10",
          },
          {
            title: "Total Classes",
            value: overallStats.totalClasses,
            icon: BookOpen,
            color: "text-chart-2",
            bgColor: "bg-chart-2/10",
          },
          {
            title: "Highest Attendance",
            value: `${overallStats.highestAttendance.value}%`,
            subtitle: overallStats.highestAttendance.subject,
            icon: TrendingUp,
            color: "text-chart-2",
            bgColor: "bg-chart-2/10",
          },
          {
            title: "Lowest Attendance",
            value: `${overallStats.lowestAttendance.value}%`,
            subtitle: overallStats.lowestAttendance.subject,
            icon: TrendingDown,
            color: "text-chart-5",
            bgColor: "bg-chart-5/10",
          },
        ].map((stat, index) => (
          <Card 
            key={stat.title} 
            className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    {stat.trendLabel ? (
                      <span className={`text-sm font-medium ${stat.trendColor}`}>{stat.trendLabel}</span>
                    ) : null}
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Trend */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Weekly Attendance Trend
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Daily attendance percentage this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance %",
                  color: COLORS.primary,
                },
              }}
              className="h-[280px]"
            >
              <LineChart data={weeklyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
                <XAxis dataKey="day" stroke={COLORS.muted} fontSize={12} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: COLORS.primary }}
                  name="Attendance %"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subject-wise Attendance */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject-wise Attendance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Attendance percentage by subject
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance %",
                  color: COLORS.primary,
                },
              }}
              className="h-[280px]"
            >
              <BarChart data={subjectData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
                <XAxis dataKey="subject" stroke={COLORS.muted} fontSize={12} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="attendance" radius={[6, 6, 0, 0]} name="Attendance %">
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 85 ? COLORS.success : entry.attendance >= 75 ? COLORS.warning : COLORS.destructive}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {subjectData.length === 0 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                No attendance records available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Below 75% */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-chart-3" />
            Students Below 75% Attendance
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Students who need to improve their attendance to meet requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Roll No.</TableHead>
                  <TableHead className="text-muted-foreground">Student Name</TableHead>
                  <TableHead className="text-center text-muted-foreground">Attended</TableHead>
                  <TableHead className="text-center text-muted-foreground">Total</TableHead>
                  <TableHead className="text-center text-muted-foreground">Percentage</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowAttendanceStudents.map((student, index) => (
                  <TableRow 
                    key={student.rollNumber} 
                    className="border-border/50 transition-colors hover:bg-secondary/50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {student.rollNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                    <TableCell className="text-center text-foreground">{student.attended}</TableCell>
                    <TableCell className="text-center text-foreground">{student.classes}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-chart-5">{student.attendance}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-chart-5/30 bg-chart-5/10 text-chart-5">
                        At Risk
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {lowAttendanceStudents.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No students below 75% attendance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
