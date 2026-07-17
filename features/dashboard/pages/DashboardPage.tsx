"use client"

import React, { useMemo, useEffect, useState } from "react"
import { useAuthStore, useSharedStore, useAcademicStore, useTimetableStore, useAttendanceStore, useStudentStore } from "@/store"
import {
  Users,
  Shield,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Bell,
  Sparkles,
  BookOpen,
  Briefcase,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getLocalDateStringForDay } from "@/utils/date-helpers"
import { SUBJECT_ROOMS } from "@/constants"
import { cn } from "@/lib/utils"

export function Dashboard() {
  const { user } = useAuthStore()
  const { setCurrentPage } = useSharedStore()
  const [timeStr, setTimeStr] = useState("")

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Academic details
  const { selectedSectionWorkspace, facultyList, sections, activities, academicSessions, programs, currentSessionId } = useAcademicStore()
  const { timetable, setSelectedCell, loadTimetableForSection } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()

  const activeSectionId = useMemo(() => {
    if (user?.role === "cr" || user?.role === "lr") {
      return user.sectionId || "sec-1"
    }
    return selectedSectionWorkspace || "sec-1"
  }, [user, selectedSectionWorkspace])

  // Auto-initialize section timetable
  useEffect(() => {
    loadTimetableForSection(activeSectionId)
  }, [activeSectionId, loadTimetableForSection])

  // Today's Date String
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0]
  }, [])

  // Load summary from service
  const summary = useMemo(() => {
    const { DashboardService } = require("@/services")
    return DashboardService.getTodaySummary(activeSectionId, todayStr)
  }, [activeSectionId, todayStr, timetable, attendanceRecords])

  const todayClasses = summary.todayClasses

  // Completed class cell IDs
  const completedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((r) => r.cellIds || []))
  }, [attendanceRecords])

  const currentSessionObj = useMemo(() => {
    return academicSessions.find(s => s.id === currentSessionId)
  }, [academicSessions, currentSessionId])

  // --- HOD DASHBOARD VIEW ---
  if (user?.role === "hod") {
    // Filter sections by selected session
    const activeSections = sections.filter((s) => s.academicSessionId === currentSessionId || !s.academicSessionId)

    // 1. Calculate Department Setup Wizard Progress
    const setupSteps = [
      { id: "session", label: "Academic Session", done: academicSessions.length > 0 },
      { id: "programs", label: "Programs Configured", done: programs.length > 0 },
      { id: "sections", label: "Classroom Sections", done: activeSections.length > 0 },
      { id: "faculty", label: "Faculty Roster", done: facultyList.length > 0 },
      { id: "students", label: "Students Enrolled", done: (useStudentStore.getState().classStudents || []).length > 0 },
      { id: "timetable", label: "Timetable Published", done: Object.keys(useTimetableStore.getState().timetables || {}).length > 0 },
      { id: "crlr", label: "CR/LR Appointed", done: activeSections.some(s => s.crName && s.crName !== "To be assigned" && s.crName !== "Unassigned") }
    ]
    const completedStepsCount = setupSteps.filter(s => s.done).length
    const setupProgressPercent = Math.round((completedStepsCount / setupSteps.length) * 100)

    // 2. Department Command Center Analytics
    const totalFacultyCount = facultyList.length
    const crAssignedCount = activeSections.filter(s => s.crName && s.crName !== "To be assigned" && s.crName !== "Unassigned").length
    const lrAssignedCount = activeSections.filter(s => s.lrName && s.lrName !== "To be assigned" && s.lrName !== "Unassigned").length
    const crPercent = activeSections.length > 0 ? Math.round((crAssignedCount / activeSections.length) * 100) : 0
    const lrPercent = activeSections.length > 0 ? Math.round((lrAssignedCount / activeSections.length) * 100) : 0
    
    // Command Center Stats
    const facultyPendingCount = summary.pending
    const crMissingCount = activeSections.length - crAssignedCount
    const getSectionFacultyCount = (secName: string) => facultyList.filter(f => f.sections && f.sections.includes(secName)).length
    const timetableIssuesCount = activeSections.filter(s => getSectionFacultyCount(s.name) === 0).length
    const timetableRate = activeSections.length > 0 ? Math.round((activeSections.filter(s => getSectionFacultyCount(s.name) > 0).length / activeSections.length) * 100) : 90
    const facultyRate = facultyPendingCount === 0 ? 95 : Math.max(0, Math.round(((totalFacultyCount - facultyPendingCount) / totalFacultyCount) * 100))

    // Overall Department Health Score
    const avgAttendance = summary.averageAttendance
    const crlrRate = crPercent > 0 ? (crPercent + lrPercent) / 2 : 85
    const deptHealthScore = Math.round((avgAttendance * 0.4) + (crlrRate * 0.2) + (timetableRate * 0.2) + (facultyRate * 0.2))
    const unreadNotificationsCount = 5

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                <Sparkles className="h-4 w-4" />
                Department Command Center
              </div>
              <h1 className="text-2xl font-black text-foreground">Good Morning, {user.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <span>Computer Science & Engineering Department •</span>
                <select
                  value={currentSessionId}
                  onChange={(e) => useAcademicStore.setState({ currentSessionId: e.target.value })}
                  className="bg-transparent border-none text-xs font-black text-primary p-0 m-0 focus:ring-0 cursor-pointer focus:outline-none"
                >
                  {academicSessions.map((session) => (
                    <option key={session.id} value={session.id} className="bg-card text-foreground">
                      Session: {session.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {timeStr && (
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {timeStr}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {todayDateStr}
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Summary KPIs */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="border-border/60 rounded-2xl shadow-sm bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-xs font-bold">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today's Attendance</p>
                <p className="text-2xl font-black text-emerald-600">{avgAttendance}%</p>
                <p className="text-[10px] text-muted-foreground font-medium">Average presence rate</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 rounded-2xl shadow-sm bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-xs font-bold">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today's Schedule</p>
                <p className="text-2xl font-black text-primary">{summary.totalClasses} classes</p>
                <p className="text-[10px] text-muted-foreground font-medium">{summary.conducted} marked / {summary.pending} pending</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 rounded-2xl shadow-sm bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-xs font-bold">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Faculty</p>
                <p className="text-2xl font-black text-foreground">{totalFacultyCount} Members</p>
                <p className="text-[10px] text-muted-foreground font-medium">CSE Department Roster</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 rounded-2xl shadow-sm bg-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1 text-xs font-bold">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Active Sections</p>
                <p className="text-2xl font-black text-foreground">{activeSections.length} Classes</p>
                <p className="text-[10px] text-muted-foreground font-medium">{crAssignedCount + lrAssignedCount} CR/LR appointed</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-650 dark:text-amber-400 border border-amber-500/20">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Operations & Navigation */}
          <Card className="lg:col-span-2 border-border/60 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Quick Operations</CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground">
                Instantly manage your department, rosters, timetables, and student representatives.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-3 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setCurrentPage("academic")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 hover:border-primary/45 transition-all text-center group"
                >
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-2 group-hover:scale-105 transition-transform">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-foreground">Academic Setup</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-semibold leading-snug">Manage batches, sections, programs</span>
                </button>

                <button
                  onClick={() => setCurrentPage("people")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 hover:border-primary/45 transition-all text-center group"
                >
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-650 dark:text-emerald-450 mb-2 group-hover:scale-105 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-foreground">People Directory</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-semibold leading-snug">Register faculty, appoint CR/LR</span>
                </button>

                <button
                  onClick={() => setCurrentPage("timetable-editor")}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/30 hover:border-primary/45 transition-all text-center group"
                >
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-650 dark:text-amber-450 mb-2 group-hover:scale-105 transition-transform">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black text-foreground">Timetable Builder</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-semibold leading-snug">Configure slots, view schedules</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Log */}
          <Card className="border-border/60 rounded-2xl shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Recent Activities</CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground">
                Logs of recent administrative actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 max-h-[220px] overflow-y-auto space-y-3.5">
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground font-semibold text-center py-6">No recent actions logged.</p>
              ) : (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex gap-2.5 items-start text-xs font-bold leading-normal">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    <div className="space-y-0.5">
                      <p className="text-foreground font-black text-[11px]">{act.type}</p>
                      <p className="text-[10.5px] text-muted-foreground font-semibold">{act.detail}</p>
                      <p className="text-[9px] text-muted-foreground/60 font-semibold">{act.time} • {act.date}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- FACULTY DASHBOARD VIEW ---
  if (user?.role === "faculty") {
    // Pinned active class
    const activeClass = todayClasses.find((c) => !completedCellIds.has(c.id)) || todayClasses[0] || null
    const nextClass = todayClasses.find((c) => c.id !== activeClass?.id && !completedCellIds.has(c.id)) || null

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Welcome */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                <Briefcase className="h-4 w-4" />
                Teaching Assistant Layout
              </div>
              <h1 className="text-2xl font-black text-foreground">Dr. Kumar</h1>
              <p className="text-xs text-muted-foreground font-semibold">
                CSE Department Faculty • Tuesday teaching schedule
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              {todayDateStr}
            </div>
          </div>
        </div>

        {/* Schedule Summary Header */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Today's Schedule", value: `${todayClasses.length} Classes`, icon: Clock, color: "text-blue-500 bg-blue-500/10" },
            { label: "Completed classes", value: `${todayClasses.filter((c) => completedCellIds.has(c.id)).length} Marked`, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
            { label: "Remaining classes", value: `${todayClasses.filter((c) => !completedCellIds.has(c.id)).length} pending`, icon: AlertCircle, color: "text-amber-500 bg-amber-500/10" },
            { label: "Weekly Workload", value: "14 Hours load", icon: Calendar, color: "text-indigo-500 bg-indigo-500/10" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/60 shadow-sm rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-black text-foreground">{stat.value}</p>
                </div>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", stat.color)}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pinned cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Class Card */}
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm rounded-2xl flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase">Active / Next Class</Badge>
                {activeClass && (
                  <Badge variant="outline" className="border-primary/30 text-primary font-bold text-[10px]">
                    {activeClass.timeSlot}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-black text-foreground mt-3">
                {activeClass ? activeClass.subjectName : "No active class running"}
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground">
                {activeClass ? `Room: ${SUBJECT_ROOMS[activeClass.subjectCode] || "Room 404"} • Section: III CSE A` : "Done with schedule"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {activeClass ? (
                <Button
                  onClick={() => {
                    setSelectedCell(activeClass)
                    setCurrentPage("mark-attendance")
                  }}
                  className="w-full text-xs font-bold rounded-xl"
                >
                  Open Attendance Workspace
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground font-bold">You have no remaining scheduled classes today.</p>
              )}
            </CardContent>
          </Card>

          {/* Next Class details */}
          <Card className="border-border/60 rounded-2xl shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className="bg-secondary text-foreground font-bold text-[9px] uppercase">Upcoming Period</Badge>
                {nextClass && (
                  <Badge variant="outline" className="border-border text-muted-foreground font-bold text-[10px]">
                    {nextClass.timeSlot}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg font-black text-foreground mt-3">
                {nextClass ? nextClass.subjectName : "No additional classes scheduled"}
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground">
                {nextClass ? `Room: ${SUBJECT_ROOMS[nextClass.subjectCode] || "Room 302"} • Section: III AIML B` : "All periods accounted for"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {nextClass ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCell(nextClass)
                    setCurrentPage("mark-attendance")
                  }}
                  className="w-full text-xs font-bold rounded-xl border-border"
                >
                  Preview Student Roster
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground font-bold">Done for the day.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // --- CR / LR DASHBOARD VIEW ---
  // Roster completed count
  const todayCompletedCount = todayClasses.filter((c) => completedCellIds.has(c.id)).length
  const todayRemainingCount = todayClasses.length - todayCompletedCount
  const completionPercentage = todayClasses.length > 0 ? Math.round((todayCompletedCount / todayClasses.length) * 100) : 0

  const activePeriod = todayClasses.find((c) => !completedCellIds.has(c.id)) || todayClasses[0] || null
  const nextPeriod = todayClasses.find((c) => c.id !== activePeriod?.id && !completedCellIds.has(c.id)) || null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
              <Users className="h-4 w-4" />
              Class Operations Dashboard
            </div>
            <h1 className="text-2xl font-black text-foreground">Good Morning, {user?.name || "Representative"}</h1>
            <p className="text-xs text-muted-foreground font-semibold">
              {user?.role === "cr" ? "Class Representative" : "Ladies Representative"} • {user?.className || "III CSE A"} • Academic Session: 2026-2027
            </p>
          </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              {timeStr && (
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {timeStr}
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                {todayDateStr}
              </div>
            </div>
        </div>
      </div>

      {/* Roster & Feed Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Today's Agenda Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Today's Class Timetable</h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[10px] uppercase">
              {user?.className || "III CSE A"}
            </Badge>
          </div>

          <div className="grid gap-3">
            {todayClasses.length === 0 ? (
              <Card className="border-2 border-dashed border-border/80 rounded-2xl p-10 text-center text-muted-foreground bg-secondary/5">
                <BookOpen className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-black uppercase tracking-wider text-foreground">No classes scheduled today</p>
                <p className="text-[11px] font-semibold text-muted-foreground/75 mt-0.5">Enjoy your free day off!</p>
              </Card>
            ) : (
              todayClasses.map((c) => {
                const completed = completedCellIds.has(c.id)
                const isActive = activePeriod?.id === c.id
                const isNext = nextPeriod?.id === c.id

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-card shadow-sm transition-all duration-200 gap-3",
                      completed ? "border-emerald-500/20 bg-emerald-500/[0.01]" :
                      isActive ? "border-amber-500/40 bg-amber-500/[0.02] shadow-amber-500/5 ring-1 ring-amber-500/20" :
                      isNext ? "border-blue-500/30 bg-blue-500/[0.01]" :
                      "border-border/60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold",
                        completed ? "bg-emerald-500/10 text-emerald-650 border-emerald-500/20" :
                        isActive ? "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse" :
                        isNext ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                        "bg-secondary/40 text-muted-foreground border-border/50"
                      )}>
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="text-xs font-bold text-foreground space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn("text-sm font-black", completed && "line-through opacity-70")}>{c.subjectName} ({c.subjectCode})</p>
                          <Badge className={cn(
                            "text-[8px] font-black uppercase tracking-wider border-none px-2 py-0.5 rounded-full text-white",
                            completed ? "bg-emerald-600" :
                            isActive ? "bg-amber-500" :
                            isNext ? "bg-blue-600" :
                            "bg-slate-500"
                          )}>
                            {completed ? "✓ Attendance Submitted" :
                             isActive ? "Currently Active" :
                             isNext ? "Next Period" :
                             "Scheduled"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          Time Slot: {c.timeSlot} • Instructor: {c.facultyName} • Room: {SUBJECT_ROOMS[c.subjectCode] || "Room 302"}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedCell(c)
                        setCurrentPage("mark-attendance")
                      }}
                      size="xs"
                      variant={completed ? "outline" : isActive ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] font-black rounded-lg sm:self-auto self-start uppercase tracking-wider h-8 px-3.5",
                        isActive && "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/10"
                      )}
                    >
                      {completed ? "Review" : isActive ? "Mark Attendance" : "Pre-open Sheet"}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Sidebar stats & alerts */}
        <div className="space-y-4">
          
          {/* Progress Bar completion */}
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Today's Progress</h2>
          <Card className="border-border/60 rounded-2xl shadow-sm flex flex-col justify-between p-5 bg-card">
            <div className="space-y-1">
              <p className="text-base font-black text-foreground">{todayCompletedCount} of {todayClasses.length} Completed</p>
              <p className="text-[10px] font-bold text-muted-foreground">Attendance status stats for today</p>
            </div>
            <div className="space-y-3.5 mt-5">
              <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-350" style={{ width: `${completionPercentage}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs font-black text-muted-foreground uppercase tracking-wider text-[9px]">
                <span>{completionPercentage}% complete</span>
                <span>{todayRemainingCount} pending</span>
              </div>
            </div>
          </Card>

          {/* Side Notification list */}
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Class alerts</h2>
          <Card className="border-border/60 rounded-2xl shadow-sm p-5 text-xs font-semibold text-muted-foreground space-y-3 bg-card">
            <div className="flex gap-2 items-start border-b border-border/40 pb-3">
              <AlertCircle className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-black text-xs">Cloud Computing starts in 15 minutes</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">Please ensure student attendance is submitted before 10:15 AM.</p>
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <Bell className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground font-black text-xs">Workshop Override Tomorrow</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">IEEE seminar declared for period 3 tomorrow. Attendance override active.</p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
