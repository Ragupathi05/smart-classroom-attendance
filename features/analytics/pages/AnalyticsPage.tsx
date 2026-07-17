"use client"

import { useEffect, useMemo, useState } from "react"
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
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, BookOpen, Filter } from "lucide-react"
import { useAnalyticsStore, useStudentStore, useAcademicStore, useAuthStore } from "@/store"
import { getISOWeekKey } from "@/utils/date-helpers"
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
import { cn } from "@/lib/utils"

// Colors for charts
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

export function Analytics() {
  const { user } = useAuthStore()
  const isRepresentative = user?.role === "cr" || user?.role === "lr"
  const { attendanceRecords } = useAnalyticsStore()
  const { classStudents: students } = useStudentStore()
  const { sections, facultyList, batches, currentSessionId } = useAcademicStore()

  // Filter states
  const [filterSession, setFilterSession] = useState(() => {
    return batches.find(b => b.status === "ACTIVE")?.id || batches[0]?.id || ""
  })
  const [filterSection, setFilterSection] = useState("all")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterFaculty, setFilterFaculty] = useState("all")

  const filteredSectionsForBatch = useMemo(() => {
    return sections.filter(s => s.batchId === filterSession)
  }, [sections, filterSession])

  useEffect(() => {
    setFilterSection("all")
  }, [filterSession])

  // Generate unique subjects for dropdown from records
  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>()
    attendanceRecords.forEach((r) => {
      if (r.subjectCode) subs.add(r.subjectCode)
    })
    return Array.from(subs)
  }, [attendanceRecords])

  // Filter records based on Power BI selections
  const {
    overallStats,
    attendanceTrend,
    weeklyTrendData,
    subjectData,
    lowAttendanceStudents,
  } = useMemo(() => {
    const activeSession = currentSessionId
    const activeSection = isRepresentative ? (user?.sectionId || "sec-1") : filterSection

    // 1. Filter attendance records based on selected slicer inputs
    const records = attendanceRecords.filter((r) => {
      // Session filter
      if (r.academicSessionId && r.academicSessionId !== activeSession) return false

      // Get section object for this record
      const rSec = sections.find((s) => s.id === r.sectionId)
      if (!rSec) return false

      // Batch filter
      if (filterSession && rSec.batchId !== filterSession) return false

      // Section filter (if not "all")
      if (activeSection !== "all" && rSec.id !== activeSection) return false

      // Subject filter
      if (filterSubject !== "all" && r.subjectCode !== filterSubject) return false

      // Faculty filter
      if (filterFaculty !== "all") {
        const fac = facultyList.find((f) => f.id === filterFaculty)
        if (fac && r.facultyName !== fac.name && !r.facultyName?.includes(fac.name)) return false
      }

      return true
    })

    // 2. Compute Overall stats
    let totalPresentRateSum = 0
    let totalClassesCount = records.length
    records.forEach(r => {
      const present = r.students.filter(s => s.status !== "absent").length
      const total = r.students.length
      if (total > 0) {
        totalPresentRateSum += (present / total) * 100
      }
    })
    const overallAverage = totalClassesCount > 0 ? Math.round(totalPresentRateSum / totalClassesCount) : 0

    // 3. Subject-wise stats
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
    const computedSubjectData = Array.from(subjectMap.entries()).map(([code, data]) => ({
      subject: code,
      fullName: data.name,
      attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      classes: data.count
    }))

    const highestSubject = computedSubjectData.reduce<{ subject: string; value: number } | null>(
      (best, s) => {
        if (!best || s.attendance > best.value) {
          return { subject: s.fullName, value: s.attendance }
        }
        return best
      },
      null
    )

    const lowestSubject = computedSubjectData.reduce<{ subject: string; value: number } | null>(
      (worst, s) => {
        if (!worst || s.attendance < worst.value) {
          return { subject: s.fullName, value: s.attendance }
        }
        return worst
      },
      null
    )

    const computedOverallStats = {
      averageAttendance: overallAverage,
      totalClasses: totalClassesCount,
      highestAttendance: highestSubject ?? { subject: "N/A", value: 0 },
      lowestAttendance: lowestSubject ?? { subject: "N/A", value: 0 },
    }

    // 4. Compute Daily/Weekly Trend
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
    const weeklyData = sortedDates.map(([date, data]) => {
      const dateObj = new Date(date)
      const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      return {
        day: label,
        attendance: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
      }
    })

    const lastTwoWeeks = weeklyData.slice(-2)
    const currentWeekAverage = lastTwoWeeks[1]?.attendance ?? overallAverage
    const previousWeekAverage = lastTwoWeeks[0]?.attendance ?? overallAverage
    
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
      trendColor: trend === "up" ? "text-green-600" : trend === "down" ? "text-red-650" : "text-gray-500",
    }

    // 5. Warning list
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

    const computedLowAttendanceStudents = Array.from(studentMap.entries())
      .map(([id, data]) => {
        const percentage = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0
        return {
          id,
          name: data.name,
          rollNumber: data.rollNumber,
          attended: data.attended,
          classes: data.total,
          attendance: percentage
        }
      })
      .filter(student => student.attendance < 75)
      .sort((a, b) => a.attendance - b.attendance)

    return {
      overallStats: computedOverallStats,
      attendanceTrend: computedAttendanceTrend,
      weeklyTrendData: weeklyData,
      subjectData: computedSubjectData,
      lowAttendanceStudents: computedLowAttendanceStudents
    }
  }, [filterSection, filterSession, filterSubject, filterFaculty, attendanceRecords, isRepresentative, user, sections, facultyList, currentSessionId])

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Analytics Dashboard</h1>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">Comprehensive attendance charts, trends, and compliance metrics</p>
      </div>

      {/* Power BI Global Filters Bar */}
      {isRepresentative ? (
        <div className="flex flex-wrap gap-4 items-center bg-secondary/15 border border-border/80 p-4 rounded-2xl justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-primary">
              <Filter className="h-4.5 w-4.5" />
              <span className="uppercase tracking-widest text-[9px] font-black">Filtered Scope:</span>
            </div>
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-xs px-2.5 py-0.5 rounded-lg">
              {user?.className || "III CSE A"}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 items-center bg-secondary/15 border border-border/80 p-4 rounded-2xl justify-between">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold w-full">
            <div className="flex items-center gap-1.5 text-primary">
              <Filter className="h-4.5 w-4.5" />
              <span className="uppercase tracking-widest text-[9px] font-black">Analytics Slicers:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Batch:</span>
              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="bg-card border text-[11px] font-bold rounded-lg h-7 px-2 focus:outline-none"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Section:</span>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="bg-card border text-[11px] font-bold rounded-lg h-7 px-2 focus:outline-none"
              >
                <option value="all">All Sections</option>
                {filteredSectionsForBatch.map((sec) => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Subject:</span>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-card border text-[11px] font-bold rounded-lg h-7 px-2 focus:outline-none"
              >
                <option value="all">All Subjects</option>
                {uniqueSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Faculty:</span>
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="bg-card border text-[11px] font-bold rounded-lg h-7 px-2 focus:outline-none"
              >
                <option value="all">All Faculty</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Average Attendance",
            value: `${overallStats.averageAttendance}%`,
            trendLabel: attendanceTrend.trendLabel,
            trendColor: attendanceTrend.trendColor,
            icon: TrendingUp,
            iconColor: "text-indigo-650 dark:text-indigo-400",
            cardClass: "stats-card-indigo",
          },
          {
            title: "Total Classes Logged",
            value: overallStats.totalClasses,
            icon: BookOpen,
            iconColor: "text-indigo-650 dark:text-indigo-400",
            cardClass: "stats-card-indigo",
          },
          {
            title: "Highest Subject",
            value: `${overallStats.highestAttendance.value}%`,
            subtitle: overallStats.highestAttendance.subject,
            icon: TrendingUp,
            iconColor: "text-emerald-600 dark:text-emerald-400",
            cardClass: "stats-card-emerald",
          },
          {
            title: "Lowest Subject",
            value: `${overallStats.lowestAttendance.value}%`,
            subtitle: overallStats.lowestAttendance.subject,
            icon: TrendingDown,
            iconColor: "text-rose-600 dark:text-rose-400",
            cardClass: "stats-card-rose",
          },
        ].map((stat, index) => (
          <div 
            key={stat.title} 
            className={cn("group rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] shadow-sm bg-card/65 animate-fade-in-up", stat.cardClass)}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div>
              <p className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">{stat.title}</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <p className="text-2xl font-black leading-none text-foreground">{stat.value}</p>
                {stat.trendLabel ? (
                  <span className={`text-[10px] font-black ${stat.trendColor}`}>{stat.trendLabel}</span>
                ) : null}
              </div>
              {stat.subtitle && (
                <p className="text-[11px] font-bold text-muted-foreground mt-1 truncate max-w-[140px]">{stat.subtitle}</p>
              )}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/90 shadow-sm border border-border/40 transition-transform duration-200 group-hover:scale-110">
              <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Trend */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
              Weekly Attendance Trend
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">
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
                <XAxis dataKey="day" stroke={COLORS.muted} fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={11} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={COLORS.primary}
                  strokeWidth={3.5}
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
            <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              Subject-wise Attendance
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-muted-foreground">
              Attendance by subject (Click a bar to slice other cards)
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
              <BarChart
                data={subjectData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const clickedSubject = state.activePayload[0].payload.subject
                    setFilterSubject((prev) => (prev === clickedSubject ? "all" : clickedSubject))
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
                <XAxis dataKey="subject" stroke={COLORS.muted} fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={11} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="attendance" radius={[5, 5, 0, 0]} name="Attendance %">
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 85 ? COLORS.success : entry.attendance >= 75 ? COLORS.warning : COLORS.destructive}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Students Below 75% */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-wider text-muted-foreground">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            Students Below 75% Attendance (At Risk)
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground">
            List of students matching the filters whose attendance rates do not meet minimum requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-black text-[10px] uppercase">Roll No.</TableHead>
                  <TableHead className="text-muted-foreground font-black text-[10px] uppercase">Student Name</TableHead>
                  <TableHead className="text-center text-muted-foreground font-black text-[10px] uppercase">Attended</TableHead>
                  <TableHead className="text-center text-muted-foreground font-black text-[10px] uppercase">Total</TableHead>
                  <TableHead className="text-center text-muted-foreground font-black text-[10px] uppercase">Percentage</TableHead>
                  <TableHead className="text-muted-foreground font-black text-[10px] uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowAttendanceStudents.map((student, index) => (
                  <TableRow 
                    key={student.rollNumber} 
                    className="border-border/50 transition-colors hover:bg-secondary/40 font-semibold"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {student.rollNumber}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{student.name}</TableCell>
                    <TableCell className="text-center text-foreground font-bold">{student.attended} lectures</TableCell>
                    <TableCell className="text-center text-foreground">{student.classes} lectures</TableCell>
                    <TableCell className="text-center">
                      <span className="font-black text-rose-500">{student.attendance}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-none bg-rose-500/10 text-rose-500 dark:text-rose-400 font-bold px-2 py-0 text-[10px] uppercase">
                        At Risk
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {lowAttendanceStudents.length === 0 && (
            <div className="py-12 text-center text-xs font-semibold text-muted-foreground">
              <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p>No students below 75% attendance under this filter selection</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
