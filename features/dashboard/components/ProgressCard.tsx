"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore } from "@/store"
import { Card, CardContent } from "@/components/ui/card"
import { useClock } from "@/hooks/useClock"
import { Progress } from "@/components/ui/progress"
import { ClipboardCheck } from "lucide-react"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function ProgressCard() {
  const { timetable } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()
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
    if (!todayName) return { completed: 0, total: 0, remaining: 0, percentage: 0 }

    const todayCells = timetable.filter((cell) => cell.day === todayName)
    const total = todayCells.length
    const completed = todayCells.filter(
      (cell) => cell.status === "submitted" || submittedCellIds.has(cell.id)
    ).length
    const remaining = total - completed
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { completed, total, remaining, percentage }
  }, [timetable, todayName, submittedCellIds])

  if (!mounted) {
    return (
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col justify-center min-h-[160px]">
        <CardContent className="p-6 space-y-4">
          <div className="h-4 bg-secondary/80 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-secondary/80 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-secondary/80 rounded w-full animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  if (!todayName || stats.total === 0) {
    return (
      <Card className="overflow-hidden border-border/50 bg-card/85 backdrop-blur-md shadow-sm h-full flex flex-col justify-center">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Schedule</h3>
          <p className="text-sm text-muted-foreground mt-1">No classes scheduled for today.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-md shadow-sm h-full flex flex-col justify-center">
      <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Today's Progress
          </h3>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-5xl font-black tracking-tight text-foreground leading-none tabular-nums">
              {stats.percentage}%
            </span>
            <span className="text-xs font-extrabold text-primary">Completions</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Detailed Progress Bar */}
          <div className="relative h-4 w-full rounded-full bg-secondary overflow-hidden border border-border/20">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground pt-1 px-1.5">
            <span className="text-emerald-600 dark:text-emerald-450">{stats.completed} Completed</span>
            <span className="text-slate-350 dark:text-slate-700">|</span>
            <span>{stats.remaining} Remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
