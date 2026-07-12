"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Search, PencilLine, Save, Share2, Trash2, Hand } from "lucide-react"
import { useAttendanceStore, useAuthStore, useTimetableStore, useSessionStore } from "@/store"
import type { AttendanceRecord, AttendanceStatus, Student } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/useToast"
import { cn } from "@/lib/utils"
import { copyTextRobust, tryOpenWindow } from "@/utils/share-helpers"
import { formatDate, formatDateTime, formatTimeSlotLabel } from "@/utils/date-helpers"
import { getCounts, isWithinAllowedWindow, formatShortRoll } from "@/utils/attendance-helpers"
import { AttendanceHistoryDetail } from "../components/AttendanceHistoryDetail"

const LONG_PRESS_MS = 500

const statusOptions: { value: AttendanceStatus; label: string; colorClass: string }[] = [
  { value: "present", label: "Present", colorClass: "text-green-600" },
  { value: "permission", label: "Permission", colorClass: "text-yellow-600" },
  { value: "absent", label: "Absent", colorClass: "text-red-600" },
]

export function AttendanceHistoryPage() {
  const {
    attendanceRecords,
    updateAttendanceRecordFromHistory,
    deleteAttendanceRecord,
  } = useAttendanceStore()
  const { specialDays } = useTimetableStore()
  const { sessionRecords } = useSessionStore()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [draftStudents, setDraftStudents] = useState<Student[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [longPressedRecordId, setLongPressedRecordId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const attendanceItems = attendanceRecords.map((r) => ({
      id: r.id,
      date: r.date,
      type: "record" as const,
      subjectCode: r.subjectCode,
      subject: r.subject,
      timeSlot: r.timeSlot,
      isEdited: r.isEdited,
      students: r.students,
      rawRecord: r
    }))

    const specialDayItems = Object.values(specialDays || {}).map((d) => ({
      id: `special-${d.date}`,
      date: d.date,
      type: "special-day" as const,
      subjectCode: "CAL",
      subject: d.reason || `Calendar Override: ${d.type}`,
      timeSlot: "Full Day",
      isEdited: false,
      students: [],
      specialType: d.type
    }))

    const sessionOverridesItems = Object.values(sessionRecords || {})
      .filter((s) => s.attendanceStatus === "skipped" || s.attendanceRequired === "Not Required")
      .map((s) => ({
        id: s.id,
        date: s.date,
        type: "special-day" as const,
        subjectCode: s.subjectCode,
        subject: `${s.subjectName}${s.notes ? ` - Notes: ${s.notes}` : ""}`,
        timeSlot: s.period,
        isEdited: false,
        students: [],
        specialType: s.currentSessionType
      }))

    const combined = [...attendanceItems, ...specialDayItems, ...sessionOverridesItems]

    return combined
      .filter((item) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.subject.toLowerCase().includes(normalizedSearch) ||
          item.subjectCode.toLowerCase().includes(normalizedSearch) ||
          item.date.includes(normalizedSearch)

        const matchesDate = selectedDate.length === 0 || item.date === selectedDate

        return matchesSearch && matchesDate
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [attendanceRecords, specialDays, searchTerm, selectedDate, sessionRecords])

  const openDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setDraftStudents(record.students.map((student) => ({ ...student })))
    setIsEditMode(false)
  }

  const saveEdit = () => {
    if (!selectedRecord) return
    updateAttendanceRecordFromHistory(selectedRecord.id, draftStudents)

    setSelectedRecord({
      ...selectedRecord,
      students: draftStudents.map((student) => ({ ...student })),
      editedAt: new Date().toISOString(),
      editedBy: `${user?.role.toUpperCase()} - ${user?.name}`,
      isEdited: true,
    })
    setIsEditMode(false)

    toast({
      title: "Attendance Updated",
      description: "Attendance record updated and faculty notification sent.",
    })
  }

  const buildShareReport = (record: AttendanceRecord, students: Student[]) => {
    const counts = getCounts(students)
    const absentStudents = students.filter((student) => student.status === "absent")
    const permissionStudents = students.filter((student) => student.status === "permission")

    const absentRolls = absentStudents.map((student) => formatShortRoll(student.rollNumber)).join(", ") || "-"
    const permissionRolls =
      permissionStudents.map((student) => formatShortRoll(student.rollNumber)).join(", ") || "-"

    return `${formatDate(record.date)}
${record.subjectCode} - (${formatTimeSlotLabel(record.timeSlot)})

Absentees: ${absentRolls}
Permissions: ${permissionRolls}

Present: ${counts.present}
Permission: ${counts.permission}
Absent: ${counts.absent}`
  }

  const handleShareAttendance = async () => {
    if (!selectedRecord) return

    const report = buildShareReport(selectedRecord, draftStudents)
    const subjectLine = `Attendance - ${selectedRecord.subjectCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: subjectLine,
          text: report,
        })
        return
      } catch (error) {
        // User closed share sheet; do not show an error toast for this normal action.
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
      }
    }

    const copied = await copyTextRobust(report)
    if (copied) {
      toast({
        title: "Attendance Copied",
        description: "Attendance report copied. You can now share it.",
      })
      return
    }

    const whatsappMessage = encodeURIComponent(report)
    const emailSubject = encodeURIComponent(subjectLine)
    const emailBody = encodeURIComponent(report)

    // Last-resort fallback so user can still share when clipboard is blocked.
    const openedWhatsApp = tryOpenWindow(`https://wa.me/?text=${whatsappMessage}`)
    if (openedWhatsApp) {
      toast({
        title: "Opened WhatsApp",
        description: "Share window opened because direct share/copy was unavailable.",
      })
      return
    }

    const openedEmail = tryOpenWindow(`mailto:?subject=${emailSubject}&body=${emailBody}`)
    if (openedEmail) {
      toast({
        title: "Opened Email",
        description: "Email draft opened because direct share/copy was unavailable.",
      })
      return
    }

    toast({
      title: "Share Blocked",
      description: "Browser blocked sharing and popups. Please allow popups and try again.",
      variant: "destructive",
    })
  }

  const updateStudentInDraft = (studentId: string, status: AttendanceStatus) => {
    setDraftStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, status } : student))
    )
  }

  const startLongPress = (recordId: string) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
    }

    longPressTriggeredRef.current = false
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setLongPressedRecordId(recordId)
    }, LONG_PRESS_MS)
  }

  const endLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleRowClick = (record: AttendanceRecord) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    openDetail(record)
  }

  const handleRemoveRecord = (record: AttendanceRecord) => {
    const shouldDelete = window.confirm(
      `Remove ${record.subjectCode} on ${formatDate(record.date)} ${record.timeSlot}?`
    )
    if (!shouldDelete) return

    deleteAttendanceRecord(record.id)
    setLongPressedRecordId(null)
    toast({
      title: "Record Removed",
      description: `${record.subjectCode} attendance record was removed.`,
    })
  }

  if (selectedRecord) {
    const canEdit = isWithinAllowedWindow(selectedRecord)
    const counts = getCounts(draftStudents)

    return (
      <AttendanceHistoryDetail
        selectedRecord={selectedRecord}
        draftStudents={draftStudents}
        isEditMode={isEditMode}
        canEdit={canEdit}
        counts={counts}
        statusOptions={statusOptions}
        onBack={() => setSelectedRecord(null)}
        onShare={handleShareAttendance}
        onEditToggle={() => setIsEditMode(true)}
        onSave={saveEdit}
        onStudentStatusChange={updateStudentInDraft}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
        <p className="text-muted-foreground">Previously recorded attendance entries.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, code, or date"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="bg-input pl-9"
          />
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full sm:w-[220px]"
        />
        {(searchTerm || selectedDate) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("")
              setSelectedDate("")
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg font-semibold text-foreground">Attendance Records ({filteredRecords.length})</CardTitle>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              <Hand className="h-3.5 w-3.5" />
              <span>Long press a row to remove</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Period/Time</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Permission</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((item) => {
                if (item.type === "special-day") {
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-not-allowed border-border bg-slate-500/5 transition-colors hover:bg-slate-500/10"
                    >
                      <TableCell className="font-semibold text-muted-foreground">{formatDate(item.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-500/10 px-2 py-1 text-xs font-bold text-indigo-650">
                            {item.subjectCode}
                          </span>
                          <span className="text-foreground font-medium">{item.subject}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.timeSlot}</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell>
                        <Badge className={`capitalize text-[10px] font-extrabold ${
                          item.specialType === "holiday" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-100" :
                          item.specialType === "examination" || item.specialType === "exam" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 hover:bg-yellow-100" :
                          item.specialType === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 line-through" :
                          item.specialType === "seminar" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 hover:bg-purple-100" :
                          item.specialType === "workshop" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-100" :
                          item.specialType === "guest_lecture" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-100" :
                          item.specialType === "industrial_visit" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 hover:bg-teal-100" :
                          item.specialType === "extra_class" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100" :
                          "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-400 hover:bg-slate-100"
                        }`}>
                          {item.specialType ? item.specialType.replace("_", " ") : "Special Day"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                }

                const counts = getCounts(item.students)
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                    onClick={() => handleRowClick(item.rawRecord)}
                    onPointerDown={() => startLongPress(item.id)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onPointerCancel={endLongPress}
                  >
                    <TableCell className="font-medium text-foreground">{formatDate(item.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          {item.subjectCode}
                        </span>
                        <span className="text-foreground">{item.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{item.timeSlot}</TableCell>
                    <TableCell className="text-center text-green-600">{counts.present}</TableCell>
                    <TableCell className="text-center text-yellow-600">{counts.permission}</TableCell>
                    <TableCell className="text-center text-red-600">{counts.absent}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={item.isEdited ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                          {item.isEdited ? "Edited" : "Submitted"}
                        </Badge>
                        {longPressedRecordId === item.id ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRemoveRecord(item.rawRecord)
                            }}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredRecords.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No attendance records found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AttendanceHistory() {
  return <AttendanceHistoryPage />
}
