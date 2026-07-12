"use client"

import React, { useMemo } from "react"
import { useSharedStore, useAuthStore, useTimetableStore, useAttendanceStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Info, AlertTriangle, MessageSquareCode } from "lucide-react"
import { useClock } from "@/hooks/useClock"

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

export function NotificationsWidget() {
  const { setCurrentPage } = useSharedStore()
  const { timetable, setSelectedCell } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()
  const now = useClock(15000)

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const nowDay = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayName = nowDay >= 1 && nowDay <= 6 ? weekDays[nowDay - 1] : null

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

  // Check if attendance has already been submitted for this active cell
  const isSubmitted = useMemo(() => {
    if (!activeCell) return false
    const submittedCellIds = new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
    return submittedCellIds.has(activeCell.id)
  }, [attendanceRecords, activeCell])

  // Calculate minutes remaining
  const minutesRemaining = useMemo(() => {
    if (!activeCell) return 0
    const [, endTimeStr] = activeCell.timeSlot.split("-")
    const [endHour, endMinute] = endTimeStr.split(":").map(Number)
    const endMinutes = endHour * 60 + endMinute
    return endMinutes - nowMinutes
  }, [activeCell, nowMinutes])

  // Filter notifications to ONLY show before-class-ends if unsubmitted & <= 15 minutes left
  const filteredNotifications = useMemo(() => {
    if (!todayName || !activeCell || isSubmitted) return []

    if (minutesRemaining > 0 && minutesRemaining <= 15) {
      return [{
        id: "before-class-ends",
        title: "Attendance Warning",
        message: `Attendance Reminder: ${activeCell.subjectName} attendance has not been submitted. ${minutesRemaining} minutes remaining.`,
        targetRole: "all",
        createdAt: now.toISOString(),
      }]
    }

    return []
  }, [activeCell, isSubmitted, minutesRemaining, todayName, now])

  const handleActionRedirect = (title: string) => {
    if (activeCell) {
      setSelectedCell(activeCell)
      setCurrentPage("mark-attendance")
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <Bell className="h-4.5 w-4.5 text-primary" />
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl bg-secondary/10">
            <Info className="h-4 w-4 text-muted-foreground/60 mb-1" />
            <p>You're all caught up!</p>
            <p className="mt-0.5 opacity-85">No pending notifications today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const isCorrection = notif.title.toLowerCase().includes("correction")
              const isAlert = notif.title.toLowerCase().includes("alert") || notif.title.toLowerCase().includes("warning")
              
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleActionRedirect(notif.title)}
                  className="flex w-full text-left gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3 transition-all duration-200 hover:bg-secondary/40 hover:border-primary/20 group cursor-pointer"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isCorrection 
                      ? "bg-indigo-500/10 text-indigo-500" 
                      : isAlert 
                      ? "bg-rose-500/10 text-rose-500" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {isCorrection ? (
                      <MessageSquareCode className="h-4 w-4" />
                    ) : isAlert ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {notif.title}
                      </span>
                      <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">
                      {notif.message}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
