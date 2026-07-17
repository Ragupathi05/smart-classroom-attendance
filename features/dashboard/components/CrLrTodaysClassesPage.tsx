"use client"

import { useEffect, useMemo } from "react"
import { useTimetableStore, useAttendanceStore, useSharedStore, useSessionStore, useAuthStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Eye, BookOpen, Clock, AlertCircle } from "lucide-react"
import { getLocalDateStringForDay, isSlotInFuture } from "@/utils/date-helpers"
import { SUBJECT_ROOMS } from "@/constants"
import { cn } from "@/lib/utils"

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const classSlots = ["9:10-10:10", "10:10-11:10", "11:10-12:10", "1:00-2:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]
const slotOrder = new Map(classSlots.map((slot, idx) => [slot, idx]))

export function CrLrTodaysClassesPage() {
  const { timetable, setSelectedCell, loadTimetableForSection } = useTimetableStore()
  const { attendanceRecords } = useAttendanceStore()
  const { setCurrentPage } = useSharedStore()
  const { sessionRecords } = useSessionStore()
  const { user } = useAuthStore()

  // Sync section timetable
  useEffect(() => {
    if (user?.className) {
      loadTimetableForSection(user.className)
    }
  }, [user, loadTimetableForSection])

  const todayName = useMemo(() => {
    const dayIndex = new Date().getDay()
    return dayIndex >= 1 && dayIndex <= 6 ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIndex - 1] : null
  }, [])

  const todayDateStr = useMemo(() => {
    return new Date().toISOString().split("T")[0]
  }, [])

  const sortedTodayCells = useMemo(() => {
    if (!todayName) return []
    return timetable
      .filter((cell) => cell.day === todayName)
      .sort((a, b) => (slotOrder.get(a.timeSlot) ?? 99) - (slotOrder.get(b.timeSlot) ?? 99))
  }, [timetable, todayName])

  const submittedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
  }, [attendanceRecords])

  const handleStartMarking = (cell: any) => {
    setSelectedCell(cell)
    setCurrentPage("mark-attendance")
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">Today's Timetable Schedule</h1>
        <p className="text-xs text-muted-foreground font-semibold">Select an active or pending class period below to mark roster attendance</p>
      </div>

      {/* Slots Checklist */}
      <div className="grid gap-4">
        {sortedTodayCells.length === 0 ? (
          <Card className="border-2 border-dashed border-border/80 rounded-2xl p-10 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 text-muted-foreground/45 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">No Classes Scheduled Today</p>
            <p className="text-[11px] font-semibold">Enjoy your free day off!</p>
          </Card>
        ) : (
          sortedTodayCells.map((cell) => {
            const sessionKey = `${todayDateStr}_${cell.id}`
            const sessionRecord = sessionRecords?.[sessionKey]
            const currentType = sessionRecord?.currentSessionType || cell.type || "regular"
            
            const record = attendanceRecords.find(
              (r) =>
                r.cellIds?.includes(cell.id) ||
                (r.subjectCode === cell.subjectCode && r.date === todayDateStr && r.className === user?.className)
            )

            const isSubmitted = !!record || cell.status === "submitted" || submittedCellIds.has(cell.id) || sessionRecord?.attendanceStatus === "submitted"
            const isSkipped = sessionRecord?.attendanceStatus === "skipped"

            const isNoAttendanceRequired =
              currentType === "seminar" ||
              currentType === "workshop" ||
              currentType === "holiday" ||
              currentType === "cancelled" ||
              currentType === "free_hour" ||
              isSkipped

            const room = SUBJECT_ROOMS[cell.subjectCode] || "Room 402"

            const presentCount = record ? record.students.filter((s) => s.status === "present").length : 0
            const absentCount = record ? record.students.filter((s) => s.status === "absent").length : 0
            const permissionCount = record ? record.students.filter((s) => s.status === "permission").length : 0

            const isFuture = isSlotInFuture(cell.timeSlot)

            return (
              <Card key={cell.id} className={cn("border shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/10", isSubmitted ? "border-emerald-500/25 bg-emerald-500/[0.02]" : "border-border/60")}>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-sm font-black text-foreground truncate", isSubmitted && "opacity-75")}>
                          {cell.subjectName} ({cell.subjectCode})
                        </p>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase tracking-wider border-none px-2 py-0.5 rounded-full text-white",
                          isSubmitted ? "bg-emerald-600" :
                          isFuture ? "bg-slate-400 dark:bg-slate-700" :
                          isNoAttendanceRequired ? "bg-slate-500" :
                          "bg-cyan-600"
                        )}>
                          {isSubmitted ? "Submitted" : isFuture ? "Upcoming" : isNoAttendanceRequired ? "Not Required" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-semibold">
                        Slot: {cell.timeSlot} • Room: {room} • Instructor: {cell.facultyName}
                      </p>
                      {isSubmitted && record && (
                        <div className="flex items-center gap-3.5 mt-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          <span className="text-emerald-600">Present {presentCount}</span>
                          <span className="text-rose-500">Absent {absentCount}</span>
                          <span className="text-amber-500">Permission {permissionCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={isFuture && !isSubmitted ? undefined : () => handleStartMarking(cell)}
                    disabled={isFuture && !isSubmitted}
                    size="sm"
                    className="text-xs font-bold rounded-xl self-start sm:self-auto uppercase tracking-wider"
                    variant={isSubmitted ? "outline" : "default"}
                  >
                    {isSubmitted ? <Eye className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
                    {isSubmitted ? "View Details" : isFuture ? "Not Started" : "Start Attendance"}
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
