"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore, useSharedStore, useAuthStore, useSessionStore } from "@/store"
import type { TimetableCell as TimetableCellType } from "@/types"
import { useClock } from "@/hooks/useClock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"
import { SUBJECT_ROOMS } from "@/constants"
import { getLocalDateStringForDay } from "@/utils/date-helpers"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const timeSlots = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "Lunch Break",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

const classSlots = ["9:10-10:10", "10:10-11:10", "11:10-12:10", "1:00-2:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]
const slotToDataRow: Record<string, number> = {
  "9:10-10:10": 1,
  "10:10-11:10": 2,
  "11:10-12:10": 3,
  "1:00-2:00": 5,
  "2:00-3:00": 6,
  "3:00-4:00": 7,
  "4:00-5:00": 8,
}

const displayTime = (slot: string) => slot.replace(/-/g, "–")

type CalculatedStatus =
  | "current"
  | "submitted"
  | "missed"
  | "upcoming"
  | "holiday"
  | "seminar"
  | "workshop"
  | "exam"
  | "cancelled"
  | "free-period"
  | "guest-lecture"
  | "industrial-visit"
  | "extra-class"

const stateStyles: Record<CalculatedStatus, string> = {
  current:
    "border-blue-400 dark:border-blue-600 bg-blue-500/10 dark:bg-blue-950/20 text-blue-900 dark:text-blue-450 shadow-[0_0_0_2.5px_rgba(59,130,246,0.6),0_0_24px_rgba(59,130,246,0.5)] font-extrabold scale-[1.01] animate-pulse transition-transform duration-200",
  submitted:
    "border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/15 text-emerald-900 dark:text-emerald-450 dark:border-emerald-800/60",
  missed:
    "border-rose-300 bg-rose-50/70 dark:bg-rose-950/15 text-rose-900 dark:text-rose-455 dark:border-rose-800/60",
  upcoming:
    "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
  holiday:
    "border-slate-300 bg-slate-800/10 text-slate-500 dark:border-slate-850 dark:bg-slate-950/20 dark:text-slate-500 opacity-85",
  seminar:
    "border-purple-300 bg-purple-500/10 text-purple-900 dark:border-purple-800/60 dark:bg-purple-950/15 dark:text-purple-400 font-semibold",
  workshop:
    "border-amber-350 bg-amber-500/10 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/15 dark:text-amber-400 font-semibold",
  exam:
    "border-yellow-350 bg-yellow-500/10 text-yellow-900 dark:border-yellow-800/60 dark:bg-yellow-950/15 dark:text-yellow-405 font-semibold",
  cancelled:
    "border-slate-200 bg-slate-100/20 text-slate-450 dark:border-slate-800 dark:bg-slate-950/5 dark:text-slate-500 line-through opacity-60",
  "free-period":
    "border-slate-200 bg-slate-50/40 text-slate-450 dark:border-slate-800 dark:bg-slate-950/5 dark:text-slate-500 opacity-75",
  "guest-lecture":
    "border-blue-300 bg-blue-500/10 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/15 dark:text-blue-400 font-semibold",
  "industrial-visit":
    "border-teal-350 bg-teal-500/10 text-teal-900 dark:border-teal-800/60 dark:bg-teal-950/15 dark:text-teal-400 font-semibold",
  "extra-class":
    "border-emerald-300 bg-emerald-550/10 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/15 dark:text-emerald-400 font-semibold",
}

const stateLabel: Record<CalculatedStatus, string> = {
  current: "Current class",
  submitted: "Attendance completed",
  missed: "Attendance missing",
  upcoming: "Upcoming class",
  holiday: "Holiday (Not Required)",
  seminar: "Seminar (Not Required)",
  workshop: "Workshop (Not Required)",
  exam: "Examination (Optional)",
  cancelled: "Cancelled period",
  "free-period": "Free Hour",
  "guest-lecture": "Guest Lecture (Optional)",
  "industrial-visit": "Industrial Visit (Optional)",
  "extra-class": "Extra Class (Required)",
}

type MergedCell = {
  cell: Omit<TimetableCellType, "status"> & { status: CalculatedStatus }
  startSlot: string
  span: number
}

const dayToIndex: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const slotStartToMinutes = (slot: string): number => {
  const [time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

import { 
  Check, 
  AlertTriangle, 
  Presentation, 
  Settings as SettingsIcon, 
  CalendarX, 
  Slash, 
  PlusCircle, 
  UserCheck, 
  Compass, 
  GraduationCap, 
  Coffee 
} from "lucide-react"

const slotEndToMinutes = (slot: string): number => {
  const [, time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

const getStatusIcon = (status: CalculatedStatus) => {
  switch (status) {
    case "submitted":
      return <Check className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
    case "missed":
      return <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
    case "seminar":
      return <Presentation className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
    case "workshop":
      return <SettingsIcon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
    case "holiday":
      return <CalendarX className="h-4.5 w-4.5 text-slate-500" />
    case "cancelled":
      return <Slash className="h-4.5 w-4.5 text-slate-400" />
    case "extra-class":
      return <PlusCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
    case "guest-lecture":
      return <UserCheck className="h-4.5 w-4.5 text-blue-650 dark:text-blue-400" />
    case "industrial-visit":
      return <Compass className="h-4.5 w-4.5 text-teal-650 dark:text-teal-400" />
    case "exam":
      return <GraduationCap className="h-4.5 w-4.5 text-yellow-600 dark:text-yellow-400" />
    case "free-period":
      return <Coffee className="h-4.5 w-4.5 text-slate-450" />
    default:
      return null
  }
}

export function TimetableGrid() {
  const { timetable, setSelectedCell, specialDays } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()
  const { setCurrentPage } = useSharedStore()
  const { user } = useAuthStore()
  const { sessionRecords } = useSessionStore()
  const now = useClock(15000) // update every 15s

  const submittedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
  }, [attendanceRecords])

  const nowDay = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayName = days[nowDay - 1]

  const getDisplayStatus = (cell: TimetableCellType): CalculatedStatus => {
    const cellDateStr = getLocalDateStringForDay(cell.day)
    const sessionKey = `${cellDateStr}_${cell.id}`
    const sessionRecord = sessionRecords?.[sessionKey]

    // If session is marked submitted, show submitted style
    if (cell.status === "submitted" || submittedCellIds.has(cell.id) || sessionRecord?.attendanceStatus === "submitted") {
      return "submitted"
    }

    // Check custom session record overrides
    if (sessionRecord) {
      const type = sessionRecord.currentSessionType
      if (type === "seminar") return "seminar"
      if (type === "workshop") return "workshop"
      if (type === "holiday") return "holiday"
      if (type === "cancelled") return "cancelled"
      if (type === "free_hour") return "free-period"
      if (type === "guest_lecture") return "guest-lecture"
      if (type === "industrial_visit") return "industrial-visit"
      if (type === "examination") return "exam"
      if (type === "extra_class") return "extra-class"
    }

    // Check Special Days override (holiday, examination, event)
    const specialDay = specialDays?.[cellDateStr]
    if (specialDay) {
      if (specialDay.type === "holiday") return "holiday"
      if (specialDay.type === "examination") return "exam"
      if (specialDay.type === "event") return "seminar"
    }

    // Check Cell Type override
    if (cell.type === "holiday") return "holiday"
    if (cell.type === "seminar") return "seminar"
    if (cell.type === "workshop") return "workshop"
    if (cell.type === "cancelled") return "cancelled"
    if (cell.type === "free-period") return "free-period"
    if (cell.type === "exam") return "exam"

    const cellDayIndex = dayToIndex[cell.day] ?? -1
    if (cellDayIndex < nowDay) {
      return "missed"
    }
    if (cellDayIndex > nowDay) {
      return "upcoming"
    }

    const start = slotStartToMinutes(cell.timeSlot)
    const end = slotEndToMinutes(cell.timeSlot)

    if (nowMinutes >= start && nowMinutes < end) {
      return "current"
    }
    if (nowMinutes >= end) {
      return "missed"
    }

    return "upcoming"
  }

  const timetableWithStatus = useMemo(
    () => timetable.map((cell) => ({ ...cell, status: getDisplayStatus(cell) })),
    [timetable, nowDay, nowMinutes, submittedCellIds, specialDays]
  )

  const hasCurrentClassToday = useMemo(() => {
    if (!todayName) return false
    return timetableWithStatus.some((cell) => cell.day === todayName && cell.status === "current")
  }, [timetableWithStatus, todayName])

  const handleCellClick = (cell: TimetableCellType) => {
    if (user?.role === "faculty") return
    if (cell.subjectCode === "MM") return

    setSelectedCell(cell)
    setCurrentPage("mark-attendance")
  }

  const getCellForSlot = (day: string, timeSlot: string): TimetableCellType | null => {
    return timetableWithStatus.find((cell) => cell.day === day && cell.timeSlot === timeSlot) || null
  }

  const getMergedCellsForDay = (day: string): MergedCell[] => {
    const merged: MergedCell[] = []

    for (let i = 0; i < classSlots.length; i += 1) {
      const slot = classSlots[i]
      const current = getCellForSlot(day, slot)
      if (!current) continue

      let span = 1
      while (i + span < classSlots.length) {
        const nextSlot = classSlots[i + span]
        const nextCell = getCellForSlot(day, nextSlot)
        if (!nextCell || nextCell.subjectCode !== current.subjectCode || nextCell.status !== current.status) break
        span += 1
      }

      merged.push({ cell: current, startSlot: slot, span })
      i += span - 1
    }

    return merged
  }

  const occupiedRowsByDay: Record<string, Set<number>> = Object.fromEntries(days.map((day) => [day, new Set<number>()]))
  const mergedByDay: Record<string, MergedCell[]> = {}

  for (const day of days) {
    const merged = getMergedCellsForDay(day)
    mergedByDay[day] = merged

    for (const item of merged) {
      const startRow = slotToDataRow[item.startSlot]
      for (let row = startRow; row < startRow + item.span; row += 1) {
        occupiedRowsByDay[day].add(row)
      }
    }
  }  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const todayIndex = nowDay - 1

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Weekly Timetable
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className="grid grid-cols-[120px_repeat(6,minmax(120px,1fr))] grid-rows-[48px_repeat(8,74px)] gap-2">
              <div className="flex items-center justify-center rounded-lg border border-border bg-secondary/50 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Time
              </div>

              {days.map((day, index) => (
                <div
                  key={day}
                  style={{ gridColumn: index + 2, gridRow: 1 }}
                  className={cn(
                    "relative z-0 flex flex-col items-center justify-center rounded-lg border px-2 py-2 text-sm font-semibold",
                    todayIndex === index
                      ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                      : "border-border/50 bg-secondary/20 text-slate-700 dark:text-slate-350"
                  )}
                >
                  {day}
                  {todayIndex === index && hasCurrentClassToday ? (
                    <span className="mt-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                      Current now
                    </span>
                  ) : null}
                </div>
              ))}

              {timeSlots.map((slot, index) => {
                const isLunch = slot === "Lunch Break"
                return (
                  <div
                    key={slot}
                    style={{ gridColumn: 1, gridRow: index + 2 }}
                    className={cn(
                      "relative z-0 flex items-center justify-center rounded-lg border px-2 py-4 text-xs font-semibold",
                      isLunch 
                        ? "border-amber-300 bg-amber-500/10 text-amber-800 dark:text-amber-400" 
                        : "border-border/50 bg-secondary/10 text-slate-750 dark:text-slate-300"
                    )}
                  >
                    {isLunch ? "Lunch" : displayTime(slot)}
                  </div>
                )
              })}

              <div
                style={{ gridColumn: "2 / span 6", gridRow: 5 }}
                className="relative z-0 flex items-center justify-center rounded-lg border border-amber-355 bg-amber-500/10 px-2 py-4 text-sm font-bold text-amber-900 dark:text-amber-400"
              >
                Lunch Break
              </div>              {days.flatMap((day, dayIndex) =>
                mergedByDay[day].map(({ cell, startSlot, span }) => {
                  const startRow = slotToDataRow[startSlot] + 1
                  const isMentorMentee = cell.subjectCode === "MM"
                  const isDisabled = user?.role === "faculty" || isMentorMentee
                  const room = SUBJECT_ROOMS[cell.subjectCode] || "Room 402"
                  const isHovered = hoveredCellId === cell.id
                  const isNearTop = startRow <= 4 // open downward if top rows to avoid cut-off

                  return (
                    <button
                      key={cell.id}
                      type="button"
                      onClick={() => handleCellClick(cell)}
                      onMouseEnter={() => setHoveredCellId(cell.id)}
                      onMouseLeave={() => setHoveredCellId(null)}
                      disabled={isDisabled}
                      style={{
                        gridColumn: dayIndex + 2,
                        gridRow: `${startRow} / span ${span}`,
                        zIndex: isHovered ? 100 : 10,
                      }}
                      className={cn(
                        "relative group rounded-lg border px-3 py-3.5 text-left transition-all duration-200",
                        isMentorMentee 
                          ? "border-border/60 bg-secondary/10 text-slate-800 dark:text-slate-350" 
                          : stateStyles[cell.status],
                        !isDisabled && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                        isDisabled && "cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <span className={cn(
                          "text-base font-black tracking-wide truncate",
                          cell.status === "cancelled" && "line-through opacity-65 text-muted-foreground"
                        )}>
                          {cell.subjectCode}
                        </span>
                        {cell.status === "current" ? (
                          <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-650 dark:text-blue-400 animate-pulse border border-blue-500/35 flex items-center gap-1 shrink-0">
                            <span className="h-1 w-1 rounded-full bg-blue-500 animate-ping" />
                            LIVE
                          </span>
                        ) : (
                          !isMentorMentee && getStatusIcon(cell.status)
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold opacity-80 truncate">
                        {isMentorMentee
                          ? "Mentor - Mentee"
                          : span > 1
                          ? `${stateLabel[cell.status]} (${span} hrs)`
                          : stateLabel[cell.status]}
                      </p>

                      {/* Floating hover details popover */}
                      <div
                        style={isNearTop ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }}
                        className={cn(
                          "pointer-events-none absolute left-1/2 z-50 w-52 -translate-x-1/2 scale-95 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-900 dark:text-slate-100 opacity-0 shadow-xl transition-all duration-200 group-hover:scale-100 group-hover:opacity-100",
                          isNearTop ? "origin-top" : "origin-bottom"
                        )}>
                        <div className="space-y-1.5 whitespace-normal">
                          <p className="font-extrabold text-[13px] text-foreground leading-snug">
                            {cell.subjectName}
                          </p>
                          <p className="font-bold text-primary">{cell.subjectCode}</p>
                          <div className="h-px bg-border/50 my-1" />
                          <p className="text-[11px]"><span className="text-muted-foreground">Faculty:</span> <span className="font-semibold text-foreground">{cell.facultyName}</span></p>
                          <p className="text-[11px]"><span className="text-muted-foreground">Room:</span> <span className="font-semibold text-foreground">{room}</span></p>
                          <p className="text-[11px]"><span className="text-muted-foreground">Time:</span> <span className="font-semibold text-foreground">{cell.timeSlot}</span></p>
                        </div>
                        <div className={cn(
                          "absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white dark:bg-slate-900",
                          isNearTop
                            ? "bottom-full left-1/2 translate-y-1/2 border-t border-l border-slate-200 dark:border-slate-800"
                            : "top-full left-1/2 -translate-y-1/2 border-b border-r border-slate-200 dark:border-slate-800"
                        )} />
                      </div>
                    </button>
                  )
                })
              )}

              {days.flatMap((day, dayIndex) =>
                classSlots
                  .filter((slot) => !occupiedRowsByDay[day].has(slotToDataRow[slot]))
                  .map((slot) => (
                    <div
                      key={`${day}-${slot}-blank`}
                      style={{ gridColumn: dayIndex + 2, gridRow: slotToDataRow[slot] + 1 }}
                      className="flex items-center justify-center rounded-lg border border-border/40 bg-secondary/5"
                      title={`${day} ${slot} - Free Hour`}
                    >
                      <span className="text-xs text-slate-400 font-bold">-</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 rounded-xl border border-border/50 bg-secondary/10 p-4 text-xs font-bold text-muted-foreground">
          <span className="text-foreground">Timetable Legend:</span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 
            Completed
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" /> 
            Current Class
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> 
            Upcoming Class
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-border" /> 
            Free Hour
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 
            Missed Class
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
