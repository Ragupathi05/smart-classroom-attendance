"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useSharedStore, useAttendanceStore, useStudentStore, useTimetableStore, useSettingsStore } from "@/store"
import { History, Users, BarChart3, CalendarDays, Settings } from "lucide-react"

export function QuickActions() {
  const { setCurrentPage } = useSharedStore()
  const { attendanceRecords } = useAttendanceStore()
  const { classStudents } = useStudentStore()
  const { timetable } = useTimetableStore()
  const { appSettings } = useSettingsStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const actions = useMemo(() => {
    // 1. Calculate Roster History description
    const todayStr = new Date().toISOString().split("T")[0]
    const todayRecordsCount = attendanceRecords.filter(r => r.date === todayStr).length
    const historyDesc = mounted 
      ? `${todayRecordsCount} ${todayRecordsCount === 1 ? "record" : "records"} today`
      : "Review submitted logs"

    // 2. Calculate Student Roster description
    const totalStudents = classStudents.length
    const rosterDesc = mounted
      ? `${totalStudents} students enrolled`
      : "Manage list & imports"

    // 3. Calculate Analytics Hub description
    let overallAttended = 0
    let overallTotal = 0
    attendanceRecords.forEach((record) => {
      overallTotal += record.students.length
      overallAttended += record.students.filter(
        (s) => s.status === "present" || s.status === "permission"
      ).length
    })
    const avgAttendance = overallTotal > 0 ? Math.round((overallAttended / overallTotal) * 100) : 0
    const analyticsDesc = mounted
      ? `${avgAttendance}% overall attendance`
      : "Inspect graphs & statistics"

    // 4. Calculate Timetable Grid description
    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const nowDay = new Date().getDay()
    const todayName = nowDay >= 1 && nowDay <= 6 ? weekDays[nowDay - 1] : null
    const todayCells = todayName ? timetable.filter((cell) => cell.day === todayName) : []
    const timetableDesc = mounted
      ? `${todayCells.length} periods scheduled today`
      : "Adjust daily schedules"

    // 5. Calculate App Settings description
    const appPreferencesCount = [
      appSettings?.notificationsEnabled,
      appSettings?.allowLateSubmissions,
      appSettings?.autoSyncData,
    ].filter(Boolean).length
    const settingsDesc = mounted
      ? `${appPreferencesCount} preferences enabled`
      : "Configure configurations"

    return [
      {
        title: "Roster History",
        description: historyDesc,
        icon: History,
        page: "history",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        richExtra: (
          <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80 leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>9:10</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1" />
            <span>10:10</span>
          </div>
        )
      },
      {
        title: "Student Roster",
        description: rosterDesc,
        icon: Users,
        page: "student-manager",
        color: "text-violet-500",
        bgColor: "bg-violet-500/10",
        richExtra: (
          <div className="mt-2 flex -space-x-1 overflow-hidden">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[8px] font-black text-slate-600 dark:text-slate-400 ring-1 ring-background">R</span>
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] font-black text-primary ring-1 ring-background">S</span>
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-350 dark:bg-slate-700 text-[8px] font-black text-white dark:text-slate-300 ring-1 ring-background">+</span>
          </div>
        )
      },
      {
        title: "Analytics Hub",
        description: analyticsDesc,
        icon: BarChart3,
        page: "analytics",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        richExtra: (
          <div className="mt-2.5 flex items-end gap-0.5 h-3">
            <div className="w-1 bg-emerald-500/30 rounded-t h-1.5" />
            <div className="w-1 bg-emerald-500/50 rounded-t h-2.5" />
            <div className="w-1 bg-emerald-500/40 rounded-t h-2" />
            <div className="w-1 bg-emerald-500/70 rounded-t h-3" />
            <div className="w-1 bg-emerald-500/90 rounded-t h-1.5" />
          </div>
        )
      },
      {
        title: "Timetable Grid",
        description: timetableDesc,
        icon: CalendarDays,
        page: "timetable-editor",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        richExtra: (
          <div className="mt-2.5 grid grid-cols-4 gap-0.5 w-8 h-3">
            <div className="bg-amber-500/20 rounded-sm" />
            <div className="bg-amber-500/50 rounded-sm" />
            <div className="bg-amber-500/10 rounded-sm" />
            <div className="bg-amber-500/30 rounded-sm" />
          </div>
        )
      },
      {
        title: "App Settings",
        description: settingsDesc,
        icon: Settings,
        page: "settings",
        color: "text-slate-500",
        bgColor: "bg-slate-500/10",
        richExtra: (
          <div className="mt-2.5 flex items-center gap-0.5 h-3">
            <div className="h-1 w-1 rounded-full bg-slate-400" />
            <div className="h-1 w-1 rounded-full bg-slate-400" />
            <div className="h-1 w-1 rounded-full bg-slate-400" />
            <div className="h-1.5 w-2.5 border border-slate-400 rounded-sm ml-0.5" />
          </div>
        )
      },
    ]
  }, [mounted, attendanceRecords, classStudents.length, timetable, appSettings])

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">
        Quick Access Shortcuts
      </h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {actions.map((action, index) => {
          const Icon = action.icon

          return (
            <button
              key={action.title}
              type="button"
              onClick={() => setCurrentPage(action.page)}
              className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 cursor-pointer group"
            >
              <div className="flex w-full items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bgColor} ${action.color} transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="h-5.5 w-5.5" />
                </div>
                {action.richExtra}
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {action.title}
                </h4>
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground leading-relaxed">
                  {action.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
