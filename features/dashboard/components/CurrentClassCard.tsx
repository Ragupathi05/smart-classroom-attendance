"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore, useSharedStore, useAuthStore, useSessionStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useClock } from "@/hooks/useClock"
import { Clock, UserCheck, AlertCircle, Play, Eye, BookOpen, Coffee, CheckCircle2 } from "lucide-react"
import { getCounts } from "@/utils/attendance-helpers"
import { SUBJECT_ROOMS } from "@/constants"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const slotStartToMinutes = (slot: string): number => {
  const [time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

const slotEndToMinutes = (slot: string): number => {
  const [, time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

export function CurrentClassCard() {
  const { timetable, setSelectedCell, specialDays } = useTimetableStore()
  const { attendanceRecords, correctionRequests } = useAttendanceStore()
  const { setCurrentPage } = useSharedStore()
  const { user } = useAuthStore()
  const { sessionRecords } = useSessionStore()
  const now = useClock(10000) // Update every 10 seconds
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const nowDay = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayName = nowDay >= 1 && nowDay <= 6 ? weekDays[nowDay - 1] : null

  // Find if we are currently in lunch break (12:10 - 13:00)
  const isLunchBreak = useMemo(() => {
    return nowMinutes >= 11 * 60 + 10 && nowMinutes < 13 * 60
  }, [nowMinutes])

  // Get active cell from timetable schedule
  const activeCell = useMemo(() => {
    if (!todayName) return null
    return timetable.find((cell) => {
      if (cell.day !== todayName) return false
      const start = slotStartToMinutes(cell.timeSlot)
      const end = slotEndToMinutes(cell.timeSlot)
      return nowMinutes >= start && nowMinutes < end
    }) || null
  }, [timetable, todayName, nowMinutes])

  // Calculate today's stats summary
  const stats = useMemo(() => {
    if (!todayName) return { completed: 0, total: 0, remaining: 0, present: 0, absent: 0, permission: 0, avgAttendance: 0, pendingCorrections: 0 }
    
    const todayCells = timetable.filter((cell) => cell.day === todayName)
    const total = todayCells.length
    
    const submittedCellIds = new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
    const completedCells = todayCells.filter(
      (cell) => cell.status === "submitted" || submittedCellIds.has(cell.id)
    )
    const completed = completedCells.length
    const remaining = total - completed

    // Calculate aggregated attendance for today
    const todayDateStr = now.toISOString().split("T")[0]
    const todayRecords = attendanceRecords.filter(r => r.date === todayDateStr)

    let present = 0
    let absent = 0
    let permission = 0
    let totalStudentsCount = 0

    todayRecords.forEach(record => {
      record.students.forEach(s => {
        totalStudentsCount++
        if (s.status === "present") present++
        else if (s.status === "absent") absent++
        else if (s.status === "permission") permission++
      })
    })

    const avgAttendance = totalStudentsCount > 0 ? Math.round((present / totalStudentsCount) * 100) : 0
    const pendingCorrections = (correctionRequests || []).filter(r => r.status === "pending").length

    return { completed, total, remaining, present, absent, permission, avgAttendance, pendingCorrections }
  }, [timetable, todayName, attendanceRecords, correctionRequests, now])

  // Find the next upcoming class today
  const nextCell = useMemo(() => {
    if (!todayName) return null
    const upcoming = timetable
      .filter((cell) => cell.day === todayName)
      .map(cell => ({ cell, start: slotStartToMinutes(cell.timeSlot) }))
      .filter(item => item.start > nowMinutes)
      .sort((a, b) => a.start - b.start)
    
    return upcoming.length > 0 ? upcoming[0].cell : null
  }, [timetable, todayName, nowMinutes])

  const nextClassCountdown = useMemo(() => {
    if (!nextCell) return null
    const start = slotStartToMinutes(nextCell.timeSlot)
    const diff = start - nowMinutes
    if (diff > 0 && diff <= 30) {
      return { subjectCode: nextCell.subjectCode, minutes: diff }
    }
    return null
  }, [nextCell, nowMinutes])

  // Check if attendance has already been submitted for this active cell
  const matchingRecord = useMemo(() => {
    if (!activeCell) return null
    return attendanceRecords.find(
      (record) => record.cellIds?.includes(activeCell.id) || 
      (record.date === now.toISOString().split("T")[0] && 
       record.subjectCode === activeCell.subjectCode && 
       record.timeSlot === activeCell.timeSlot)
    ) || null
  }, [attendanceRecords, activeCell, now])

  const sessionKey = useMemo(() => {
    if (!activeCell) return ""
    const todayDateStr = now.toISOString().split("T")[0]
    return `${todayDateStr}_${activeCell.id}`
  }, [activeCell, now])

  const sessionRecord = sessionKey ? sessionRecords[sessionKey] : null
  const currentSessionType = sessionRecord?.currentSessionType || activeCell?.type || "regular"

  const isNoAttendanceRequired = useMemo(() => {
    return (
      currentSessionType === "seminar" ||
      currentSessionType === "workshop" ||
      currentSessionType === "holiday" ||
      currentSessionType === "cancelled" ||
      currentSessionType === "free_hour" ||
      (sessionRecord?.attendanceStatus === "skipped")
    )
  }, [currentSessionType, sessionRecord])

  if (!mounted) {
    return (
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col justify-center min-h-[220px]">
        <CardContent className="p-6 space-y-4">
          <div className="h-4 bg-secondary/80 rounded w-1/4 animate-pulse" />
          <div className="h-8 bg-secondary/80 rounded w-3/4 animate-pulse" />
          <div className="h-12 bg-secondary/85 rounded w-full animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const todayDateStr = now.toISOString().split("T")[0]
  const specialDayToday = specialDays?.[todayDateStr]

  if (specialDayToday && specialDayToday.type === "holiday") {
    return (
      <Card className="overflow-hidden border-2 border-slate-500/20 bg-gradient-to-br from-card to-slate-500/5 shadow-lg h-full flex flex-col justify-center min-h-[220px]">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-3 border border-indigo-500/20">
            <Coffee className="h-6 w-6 text-indigo-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Today is a Holiday!</h3>
          {specialDayToday.reason ? (
            <p className="text-sm text-muted-foreground mt-2 max-w-md font-semibold">
              Reason: <span className="text-foreground">{specialDayToday.reason}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Enjoy your day off! No attendance expected.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (specialDayToday && specialDayToday.type === "event") {
    return (
      <Card className="overflow-hidden border-2 border-purple-500/20 bg-gradient-to-br from-card to-purple-500/5 shadow-lg h-full flex flex-col justify-center min-h-[220px]">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3 border border-purple-500/20">
            <BookOpen className="h-6 w-6 text-purple-500 animate-bounce" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Calendar Event Today</h3>
          {specialDayToday.reason ? (
            <p className="text-sm text-muted-foreground mt-2 max-w-md font-bold">
              Activity: <span className="text-foreground">{specialDayToday.reason}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">A special event is scheduled. Check timetable overrides.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (specialDayToday && specialDayToday.type === "examination") {
    return (
      <Card className="overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5 shadow-lg h-full flex flex-col justify-center min-h-[220px]">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3 border border-blue-500/20">
            <Clock className="h-6 w-6 text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Examination Session</h3>
          {specialDayToday.reason ? (
            <p className="text-sm text-muted-foreground mt-2 max-w-md font-semibold">
              Subject: <span className="text-foreground">{specialDayToday.reason}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Examination session is in progress today.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const handleAction = () => {
    const targetCell = activeCell || nextCell
    if (!targetCell) return
    setSelectedCell(targetCell)
    setCurrentPage("mark-attendance")
  }

  // Define layout states when there is no active class card
  if (!todayName) {
    return (
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col justify-center">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Happy Sunday!</h3>
          <p className="text-sm text-muted-foreground mt-1">No classes are scheduled for today. Rest up!</p>
        </CardContent>
      </Card>
    )
  }

  // Today's summary card when classes are complete
  if (stats.total > 0 && stats.remaining === 0) {
    return (
      <Card className="relative overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5 shadow-lg transition-all duration-300 h-full flex flex-col justify-between min-h-[220px]">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-emerald-500/5 blur-2xl" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Today's Summary
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 font-bold px-2 py-0.5 text-xs">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              All Completed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight">
              Mission Completed
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">Excellent work today! 🎉</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary/50 p-4 text-xs font-semibold">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Conducted</span>
              <span className="text-sm font-extrabold text-foreground">{stats.total} Classes</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Avg Attendance</span>
              <span className="text-sm font-extrabold text-foreground">{stats.avgAttendance}%</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Absent / Leave</span>
              <span className="text-sm font-extrabold text-foreground">{stats.absent} / {stats.permission}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Corrections</span>
              <span className="text-sm font-extrabold text-foreground">{stats.pendingCorrections} Pending</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setCurrentPage("history")}
              variant="outline"
              className="w-full border-emerald-500/30 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10 font-bold h-11 transition-all duration-200"
            >
              <Eye className="mr-2 h-4.5 w-4.5" />
              View Today's Records
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLunchBreak) {
    return (
      <Card className="overflow-hidden border-amber-250 bg-amber-500/10 dark:bg-amber-950/5 backdrop-blur-md shadow-sm h-full flex flex-col justify-center">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 mb-3 animate-bounce">
            <Coffee className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Lunch Break</h3>
          <p className="text-sm text-muted-foreground mt-1">It's lunch hour (12:10 PM – 1:00 PM). Enjoy your break!</p>
        </CardContent>
      </Card>
    )
  }

  // Pre-mark next class if starting soon
  if (!activeCell && nextClassCountdown && nextCell) {
    const room = SUBJECT_ROOMS[nextCell.subjectCode] || "Room 402"
    return (
      <Card className="relative overflow-hidden border-2 border-cyan-500/35 bg-gradient-to-br from-card to-cyan-500/10 shadow-cyan-500/5 transition-all duration-300 h-full flex flex-col justify-between min-h-[220px]">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Next Class
            </CardTitle>
            <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 font-bold px-2 py-0.5 text-xs animate-pulse flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Starts in {nextClassCountdown.minutes} min
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight">
              {nextCell.subjectName}
            </h2>
            <p className="text-xs font-black uppercase tracking-wider text-primary">{nextCell.subjectCode}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/50 p-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Faculty</span>
              <span className="text-sm font-bold text-foreground truncate block leading-snug">{nextCell.facultyName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Time & Room</span>
              <span className="text-sm font-bold text-foreground block leading-snug">
                {nextCell.timeSlot} | {room}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleAction}
              disabled={user?.role === "faculty" || nextCell.subjectCode === "MM"}
              className="w-full bg-cyan-600 hover:bg-cyan-550 text-white font-bold h-11 shadow-md shadow-cyan-600/20 transition-all duration-200 hover:scale-[1.01]"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start Attendance
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activeCell) {
    const isBeforeClasses = nowMinutes < 9 * 60 + 10
    const isAfterClasses = nowMinutes >= 17 * 60

    return (
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col justify-center min-h-[220px]">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {isBeforeClasses ? "Classes Haven't Started" : isAfterClasses ? "Classes Completed" : "Free Hour"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isBeforeClasses 
              ? "Today's schedule begins at 09:10 AM." 
              : isAfterClasses 
              ? "All scheduled classes are complete for today." 
              : "No scheduled class is running at this period."}
          </p>
        </CardContent>
      </Card>
    )
  }

  const room = SUBJECT_ROOMS[activeCell.subjectCode] || "Room 402"
  const counts = matchingRecord ? getCounts(matchingRecord.students) : null

  if (activeCell && isNoAttendanceRequired) {
    return (
      <Card className={`relative overflow-hidden border-2 shadow-lg transition-all duration-300 h-full flex flex-col justify-between min-h-[220px] ${
        currentSessionType === "seminar" ? "border-purple-500/35 bg-gradient-to-br from-card to-purple-500/10" :
        currentSessionType === "workshop" ? "border-amber-500/35 bg-gradient-to-br from-card to-amber-500/10" :
        currentSessionType === "holiday" ? "border-slate-500/30 bg-gradient-to-br from-card to-slate-500/10" :
        currentSessionType === "cancelled" ? "border-slate-400/25 bg-gradient-to-br from-card to-slate-400/5 opacity-80" :
        "border-slate-300/30 bg-gradient-to-br from-card to-slate-300/5"
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Current Class Override
            </CardTitle>
            <Badge className={cn(
              "font-bold px-2 py-0.5 text-xs uppercase tracking-wide border",
              currentSessionType === "seminar" ? "bg-purple-500/10 text-purple-655 border-purple-500/20" :
              currentSessionType === "workshop" ? "bg-amber-500/10 text-amber-655 border-amber-500/20" :
              currentSessionType === "holiday" ? "bg-slate-500/10 text-slate-655 border-slate-500/20" :
              currentSessionType === "cancelled" ? "bg-rose-500/10 text-rose-655 border-rose-500/20" :
              "bg-slate-100 text-slate-600 border-slate-200 text-foreground"
            )}>
              {currentSessionType === "free_hour" ? "Free Hour" : currentSessionType.replace("_", " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className={cn(
              "text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight",
              currentSessionType === "cancelled" && "line-through opacity-70"
            )}>
              {activeCell.subjectName}
            </h2>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{activeCell.subjectCode}</p>
          </div>

          <div className="rounded-xl bg-secondary/60 p-4 text-xs font-semibold space-y-1">
            <p className="text-foreground">Attendance is not expected for this period.</p>
            {sessionRecord?.notes && (
              <p className="text-muted-foreground italic mt-1 font-medium truncate">
                Note: {sessionRecord.notes}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={handleAction}
              className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-bold h-11 border border-border/50 shadow-sm transition-all duration-200"
            >
              <Eye className="mr-2 h-4.5 w-4.5" />
              View Session Details
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`relative overflow-hidden border-2 shadow-lg transition-all duration-300 h-full flex flex-col justify-between ${
      matchingRecord
        ? "border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5"
        : "border-cyan-500/35 bg-gradient-to-br from-card to-cyan-500/10 shadow-cyan-500/5 animate-pulse-subtle"
    }`}>
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-primary/5 blur-2xl" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Current Class
          </CardTitle>
          {matchingRecord ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 text-xs">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Completed
            </Badge>
          ) : (
            <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 font-bold px-2 py-0.5 text-xs animate-pulse">
              <AlertCircle className="mr-1 h-3.5 w-3.5" />
              Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl leading-tight">
            {activeCell.subjectName}
          </h2>
          <p className="text-xs font-black uppercase tracking-wider text-primary">{activeCell.subjectCode}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/50 p-4 text-xs font-semibold">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Faculty</span>
            <span className="text-sm font-bold text-foreground truncate block leading-snug">{activeCell.facultyName}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Time & Room</span>
            <span className="text-sm font-bold text-foreground block leading-snug">
              {activeCell.timeSlot} | {room}
            </span>
          </div>
        </div>

        {counts && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-foreground">{counts.present} Present</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-foreground">{counts.permission} Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              <span className="text-foreground">{counts.absent} Absent</span>
            </div>
          </div>
        )}

        <div className="pt-2">
          {matchingRecord ? (
            <Button 
              onClick={handleAction} 
              variant="outline" 
              className="w-full border-emerald-500/30 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10 font-bold h-11 transition-all duration-200"
            >
              <Eye className="mr-2 h-4.5 w-4.5" />
              View Roster Records
            </Button>
          ) : (
            <Button 
              onClick={handleAction} 
              disabled={user?.role === "faculty" || activeCell.subjectCode === "MM"}
              className="w-full bg-cyan-600 hover:bg-cyan-550 text-white font-bold h-11 shadow-md shadow-cyan-600/20 transition-all duration-200 hover:scale-[1.01]"
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Start Attendance
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
