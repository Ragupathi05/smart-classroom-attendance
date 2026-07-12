"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore } from "@/store"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, ShieldCheck, Target } from "lucide-react"
import { useClock } from "@/hooks/useClock"

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function MotivationCard() {
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
    if (!todayName) return { completed: 0, total: 0, remaining: 0 }

    const todayCells = timetable.filter((cell) => cell.day === todayName)
    const total = todayCells.length
    const completed = todayCells.filter(
      (cell) => cell.status === "submitted" || submittedCellIds.has(cell.id)
    ).length
    const remaining = total - completed

    return { completed, total, remaining }
  }, [timetable, todayName, submittedCellIds])

  const motivation = useMemo(() => {
    const { completed, total, remaining } = stats

    if (total === 0) {
      return {
        title: "Recharge Day",
        phrase: "No classes scheduled for today. Relax and prep for the next sessions!",
        icon: ShieldCheck,
        color: "from-slate-500/10 to-slate-650/10 border-slate-500/20",
        iconColor: "text-slate-500 bg-slate-500/10",
      }
    }

    if (remaining === 0) {
      return {
        title: "Goal Achieved! 🎉",
        phrase: "Great Job! Today's attendance sessions are fully completed.",
        icon: Trophy,
        color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
        iconColor: "text-emerald-500 bg-emerald-500/10",
      }
    }

    return {
      title: "Today's Mission",
      phrase: "Complete all attendance before the end of each class.",
      icon: Target,
      color: "from-cyan-500/10 to-indigo-500/10 border-cyan-500/25",
      iconColor: "text-cyan-500 bg-cyan-500/10",
    }
  }, [stats])

  const progressPercent = useMemo(() => {
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  }, [stats])

  if (!mounted) {
    return (
      <Card className="border border-border/50 bg-card/60 shadow-sm min-h-[82px] flex items-center">
        <CardContent className="flex items-center gap-4 p-5 w-full">
          <div className="h-10 w-10 bg-secondary/80 rounded-xl shrink-0 animate-pulse" />
          <div className="space-y-1 flex-1">
            <div className="h-4 bg-secondary/80 rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-secondary/60 rounded w-3/4 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const Icon = motivation.icon

  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${motivation.color} shadow-sm transition-all duration-300`}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${motivation.iconColor} transition-transform duration-300 hover:scale-105`}>
          <Icon className="h-5.5 w-5.5" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <h4 className="text-sm font-extrabold text-foreground tracking-tight">
            {motivation.title}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {motivation.phrase}
          </p>
          {stats.total > 0 && (
            <div className="pt-1.5 space-y-1 w-full">
              <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                <span>Progress</span>
                <span className="text-primary font-black">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
