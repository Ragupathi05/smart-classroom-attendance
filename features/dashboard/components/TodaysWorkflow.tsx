"use client"

import React, { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useTimetableStore, useAttendanceStore, useSharedStore, useAuthStore, useSessionStore, useAcademicStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useClock } from "@/hooks/useClock"
import { ClipboardCheck, Play, Eye, BookOpen, CheckCircle2, AlertCircle, CircleDot } from "lucide-react"
import { getCounts } from "@/utils/attendance-helpers"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const classSlots = ["9:10-10:10", "10:10-11:10", "11:10-12:10", "1:00-2:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]
const slotOrder = new Map(classSlots.map((slot, idx) => [slot, idx]))

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

export function TodaysWorkflow() {
  const { timetable, setSelectedCell, specialDays, currentSectionFilter } = useTimetableStore()
  const { sections } = useAcademicStore()
  const { attendanceRecords } = useAttendanceStore()
  const { setCurrentPage } = useSharedStore()
  const { user } = useAuthStore()
  const { sessionRecords } = useSessionStore()
  const now = useClock(15000) // Update every 15 seconds
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const nowDay = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayName = nowDay >= 1 && nowDay <= 6 ? weekDays[nowDay - 1] : null

  const todayDateStr = useMemo(() => {
    return now.toISOString().split("T")[0]
  }, [now])

  const specialDayToday = useMemo(() => {
    const specialDay = specialDays?.[todayDateStr]
    if (!specialDay) return null
    
    let isSpecialDayActive = false
    const activeSection = sections.find(s => s.id === currentSectionFilter)

    if (!specialDay.scopeType || specialDay.scopeType === "all") {
      isSpecialDayActive = true
    } else if (specialDay.scopeType === "batch") {
      if (activeSection && specialDay.scopeTargetIds?.includes(activeSection.batchId)) {
        isSpecialDayActive = true
      }
    } else if (specialDay.scopeType === "section") {
      if (specialDay.scopeTargetIds?.includes(currentSectionFilter)) {
        isSpecialDayActive = true
      }
    }

    return isSpecialDayActive ? specialDay : null
  }, [specialDays, todayDateStr, currentSectionFilter, sections])

  const submittedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
  }, [attendanceRecords])

  const sortedTodayCells = useMemo(() => {
    if (!todayName) return []
    return timetable
      .filter((cell) => cell.day === todayName)
      .sort((a, b) => (slotOrder.get(a.timeSlot) ?? 99) - (slotOrder.get(b.timeSlot) ?? 99))
  }, [timetable, todayName])

  const workflowItems = useMemo(() => {
    return sortedTodayCells.map((cell) => {
      const cellDateStr = now.toISOString().split("T")[0]
      const sessionKey = `${cellDateStr}_${cell.id}`
      const sessionRecord = sessionRecords?.[sessionKey]
      const currentSessionType = sessionRecord?.currentSessionType || cell.type || "regular"
      const isSkipped = sessionRecord?.attendanceStatus === "skipped"

      const isSubmitted = cell.status === "submitted" || submittedCellIds.has(cell.id) || sessionRecord?.attendanceStatus === "submitted"
      
      const matchingRecord = attendanceRecords.find(
        (record) => record.cellIds?.includes(cell.id) || 
        (record.date === cellDateStr && 
         record.subjectCode === cell.subjectCode && 
         record.timeSlot === cell.timeSlot)
      ) || null

      const start = slotStartToMinutes(cell.timeSlot)
      const end = slotEndToMinutes(cell.timeSlot)

      let status: "submitted" | "current" | "missed" | "upcoming" | "holiday" | "seminar" | "workshop" | "exam" | "cancelled" | "free-period" | "guest-lecture" | "industrial-visit" | "extra-class" = "upcoming"
      
      if (isSubmitted) {
        status = "submitted"
      } else if (currentSessionType === "holiday") {
        status = "holiday"
      } else if (currentSessionType === "seminar") {
        status = "seminar"
      } else if (currentSessionType === "workshop") {
        status = "workshop"
      } else if (currentSessionType === "cancelled") {
        status = "cancelled"
      } else if (currentSessionType === "free_hour") {
        status = "free-period"
      } else if (isSkipped) {
        status = "holiday" // treated as no attendance expected/required
      } else if (currentSessionType === "guest_lecture") {
        status = "guest-lecture"
      } else if (currentSessionType === "industrial_visit") {
        status = "industrial-visit"
      } else if (currentSessionType === "examination") {
        status = "exam"
      } else if (currentSessionType === "extra_class") {
        status = "extra-class"
      } else {
        const specialDay = specialDays?.[cellDateStr]
        let isSpecialDayActive = false
        const activeSection = sections.find(s => s.id === currentSectionFilter)

        if (specialDay) {
          if (!specialDay.scopeType || specialDay.scopeType === "all") {
            isSpecialDayActive = true
          } else if (specialDay.scopeType === "batch") {
            if (activeSection && specialDay.scopeTargetIds?.includes(activeSection.batchId)) {
              isSpecialDayActive = true
            }
          } else if (specialDay.scopeType === "section") {
            if (specialDay.scopeTargetIds?.includes(currentSectionFilter)) {
              isSpecialDayActive = true
            }
          }
        }

        if (isSpecialDayActive && specialDay) {
          if (specialDay.type === "holiday") status = "holiday"
          else if (specialDay.type === "examination") status = "exam"
          else if (specialDay.type === "event") status = "seminar"
        } else {
          if (nowMinutes >= start && nowMinutes < end) {
            status = "current"
          } else if (nowMinutes >= end) {
            status = "missed"
          }
        }
      }

      return {
        cell,
        status,
        record: matchingRecord,
      }
    })
  }, [sortedTodayCells, submittedCellIds, attendanceRecords, nowMinutes, now, specialDays, sessionRecords])

  const stats = useMemo(() => {
    const total = workflowItems.length
    const completed = workflowItems.filter((item) => item.status === "submitted").length
    const remaining = total - completed
    return { completed, total, remaining }
  }, [workflowItems])

  const handleAction = (cell: any) => {
    setSelectedCell(cell)
    setCurrentPage("mark-attendance")
  }

  if (!mounted) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between">
          <div className="h-5 bg-secondary/80 rounded w-1/3 animate-pulse" />
          <div className="h-4 bg-secondary/80 rounded w-12 animate-pulse" />
        </CardHeader>
        <CardContent className="pb-4 space-y-4">
          <div className="h-10 bg-secondary/40 rounded-xl animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="h-4 w-4 rounded-full bg-secondary/65 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-secondary/65 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-secondary/45 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (specialDayToday && specialDayToday.type === "holiday") {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Today's Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl bg-secondary/5">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 animate-bounce" />
            <p className="font-bold text-foreground text-sm">Holiday Override Active</p>
            <p className="mt-1 max-w-xs">{specialDayToday.reason || "No class attendance checklist expected for today."}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Today's Workflow
        </CardTitle>
        {stats.total > 0 && (
          <span className="text-xs text-muted-foreground font-semibold">
            Goal: {stats.completed}/{stats.total} Done
          </span>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        {stats.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl bg-secondary/10">
            <BookOpen className="h-5 w-5 text-muted-foreground/60 mb-1.5" />
            <p>No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Goal header banner */}
            <div className="rounded-xl bg-secondary/35 p-3.5 text-xs border border-border/40">
              {stats.remaining === 0 ? (
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  🎉 Outstanding! Today's mission is fully accomplished!
                </span>
              ) : (
                <span className="font-semibold text-muted-foreground">
                  Today's Mission: Complete all attendance before the end of each class.
                </span>
              )}
            </div>

            {/* Checklist Layout */}
            <div className="space-y-3">
              {workflowItems.map(({ cell, status, record }) => {
                const counts = record ? getCounts(record.students) : null
                const isMentorMentee = cell.subjectCode === "MM"

                const isNoAttendanceRequired =
                  status === "holiday" ||
                  status === "seminar" ||
                  status === "workshop" ||
                  status === "cancelled" ||
                  status === "free-period"

                const isDisabled = user?.role === "faculty" || isMentorMentee || isNoAttendanceRequired

                return (
                  <div key={cell.id} className="relative flex items-center justify-between gap-4 p-3 rounded-xl border border-border/40 bg-secondary/15 hover:bg-secondary/30 transition-all duration-200">
                    {/* Left prefix and content */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox prefix indicator */}
                      <div className="shrink-0 flex items-center justify-center">
                        {status === "submitted" ? (
                          <div className="h-5 w-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-450 text-xs font-black">
                            ✓
                          </div>
                        ) : status === "current" ? (
                          <div className="h-5 w-5 rounded-md bg-blue-500/10 border border-blue-500/35 flex items-center justify-center text-blue-650 dark:text-blue-400 text-[10px] font-black animate-pulse">
                            ●
                          </div>
                        ) : status === "missed" ? (
                          <div className="h-5 w-5 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-455 text-[10px] font-black">
                            ⚠
                          </div>
                        ) : status === "holiday" || status === "cancelled" || status === "free-period" ? (
                          <div className="h-5 w-5 rounded-md bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-500 text-xs font-semibold">
                            —
                          </div>
                        ) : status === "seminar" || status === "workshop" ? (
                          <div className="h-5 w-5 rounded-md bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-650 dark:text-purple-400 text-xs font-semibold animate-pulse">
                            ●
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-md border border-slate-350 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs font-semibold">
                            ○
                          </div>
                        )}
                      </div>

                      {/* Text content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-extrabold text-foreground truncate",
                            (status === "submitted" || isNoAttendanceRequired) && "line-through opacity-60 text-muted-foreground font-medium"
                          )}>
                            {cell.subjectCode} - {cell.subjectName}
                          </span>
                          {status === "current" && (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-450 border border-blue-500/20 text-[9px] font-extrabold px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                          {status === "missed" && (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Missed
                            </Badge>
                          )}
                          {status === "holiday" && (
                            <Badge className="bg-slate-500/10 text-slate-655 dark:text-slate-450 border border-slate-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Holiday
                            </Badge>
                          )}
                          {status === "seminar" && (
                            <Badge className="bg-purple-500/10 text-purple-655 dark:text-purple-400 border border-purple-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Seminar
                            </Badge>
                          )}
                          {status === "workshop" && (
                            <Badge className="bg-amber-500/10 text-amber-655 dark:text-amber-450 border border-amber-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Workshop
                            </Badge>
                          )}
                          {status === "cancelled" && (
                            <Badge className="bg-slate-500/10 text-slate-400 dark:text-slate-650 border border-slate-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Cancelled
                            </Badge>
                          )}
                          {status === "guest-lecture" && (
                            <Badge className="bg-blue-500/10 text-blue-655 dark:text-blue-400 border border-blue-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Guest Lecture
                            </Badge>
                          )}
                          {status === "industrial-visit" && (
                            <Badge className="bg-teal-500/10 text-teal-655 dark:text-teal-400 border border-teal-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Industrial Visit
                            </Badge>
                          )}
                          {status === "exam" && (
                            <Badge className="bg-yellow-500/10 text-yellow-655 dark:text-yellow-405 border border-yellow-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Examination
                            </Badge>
                          )}
                          {status === "extra-class" && (
                            <Badge className="bg-emerald-500/10 text-emerald-655 dark:text-emerald-400 border border-emerald-500/25 text-[9px] font-extrabold px-1.5 py-0">
                              Extra Class
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold mt-0.5">
                          <span>{cell.timeSlot}</span>
                          <span>•</span>
                          <span className="truncate">{cell.facultyName}</span>
                          {counts && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-450">{counts.present} Present</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right action shortcut button */}
                    <div className="shrink-0 self-center">
                      {status === "submitted" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(cell)}
                          className="h-7 w-7 p-0 rounded-lg hover:bg-secondary/80"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ) : isNoAttendanceRequired ? (
                        <span className="text-[10px] text-muted-foreground/80 font-bold px-2.5 py-1 rounded-lg border border-border/30 bg-muted/40 uppercase tracking-wide">
                          Not Required
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isDisabled}
                          variant={status === "current" ? "default" : "outline"}
                          onClick={() => handleAction(cell)}
                          className={`h-7 px-3.5 text-[11px] font-bold rounded-lg ${
                            status === "current"
                              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                              : "border-rose-250 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          }`}
                        >
                          {status === "current" ? "Mark" : "Log"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
