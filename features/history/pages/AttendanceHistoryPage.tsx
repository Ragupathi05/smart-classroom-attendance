"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Search, PencilLine, Save, Share2, Trash2, Hand } from "lucide-react"
import { useAttendanceStore, useAuthStore, useTimetableStore, useSessionStore, useAcademicStore, useConfirmStore } from "@/store"
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
import { formatDate, formatDateTime, formatTimeSlotLabel, isSlotInFuture } from "@/utils/date-helpers"
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
  const confirm = useConfirmStore((state) => state.confirm)
  const getTodayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [searchDate, setSearchDate] = useState(getTodayStr)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(getTodayStr)
  const [hasSearched, setHasSearched] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [draftStudents, setDraftStudents] = useState<Student[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [longPressedRecordId, setLongPressedRecordId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const [filterPeriod, setFilterPeriod] = useState("")
  const [filterStatus, setFilterStatus] = useState("all") // "all" | "has_absentees" | "full_attendance"

  const isCRLR = user?.role === "cr" || user?.role === "lr"

  const { selectedSectionWorkspace, getSectionRoster, currentSessionId, academicSessions, sections } = useAcademicStore()
  const [selectedSessionId, setSelectedSessionId] = useState(currentSessionId)
  const targetSectionId = isCRLR 
    ? (user?.sectionId || "sec-1") 
    : (selectedSectionWorkspace || "sec-1")

  const filteredRecords = useMemo(() => {
    const activeSession = selectedSessionId

    const normalizedSearch = searchTerm.trim().toLowerCase()

    const attendanceItems = attendanceRecords
      .filter((r) => {
        // Match section and active academic session
        const matchesSection = r.sectionId === targetSectionId
        const matchesSession = r.academicSessionId === activeSession
        return matchesSection && matchesSession
      })
      .map((r) => ({
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

    const specialDayItems = Object.values(specialDays || {})
      .filter((d) => {
        if (!targetSectionId) return true
        if (!d.scopeType || d.scopeType === "all") return true
        
        const activeSection = sections.find(s => s.id === targetSectionId)
        if (d.scopeType === "batch") {
          return !!(activeSection && d.scopeTargetIds?.includes(activeSection.batchId))
        }
        if (d.scopeType === "section" || d.scopeType === "custom") {
          return !!d.scopeTargetIds?.includes(targetSectionId)
        }
        return false
      })
      .map((d) => ({
        id: `special-${d.date}`,
        date: d.date,
        type: "special-day" as const,
        subjectCode: "CAL",
        subject: d.reason || `Calendar Override: ${d.type}`,
        timeSlot: "Full Day",
        isEdited: false,
        students: [],
        specialType: d.type,
        rawRecord: null
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
        specialType: s.currentSessionType,
        rawRecord: null
      }))

    // Dynamically calculate unmarked scheduled classes for selected date (Pending list)
    const getDayName = (dateStr: string) => {
      if (!dateStr) return ""
      const dateParts = dateStr.split("-")
      if (dateParts.length !== 3) return ""
      const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      return dayNames[d.getDay()]
    }
    const selectedDayName = getDayName(selectedDate)
    
    const timetableState = useTimetableStore.getState()
    const allCells = timetableState.timetables[targetSectionId] || []
    const scheduledCells = selectedDayName 
      ? allCells.filter(cell => cell.day === selectedDayName && cell.isPublished !== false) 
      : []

    const pendingItems = scheduledCells
      .filter(cell => {
        if (isSlotInFuture(cell.timeSlot, selectedDate)) {
          return false
        }
        const hasRecord = attendanceRecords.some(r => 
          r.sectionId === targetSectionId &&
          r.academicSessionId === activeSession &&
          r.date === selectedDate &&
          r.timeSlot === cell.timeSlot
        )
        return !hasRecord
      })
      .map(cell => ({
        id: `pending-${cell.id}-${selectedDate}`,
        date: selectedDate,
        type: "pending" as const,
        subjectCode: cell.subjectCode,
        subject: cell.subjectName,
        timeSlot: cell.timeSlot,
        isEdited: false,
        students: [],
        rawRecord: {
          id: `pending-rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          subject: cell.subjectName,
          subjectCode: cell.subjectCode,
          date: selectedDate,
          timeSlot: cell.timeSlot,
          className: sections.find(s => s.id === targetSectionId)?.name || "Class Room",
          sectionId: targetSectionId,
          academicSessionId: activeSession,
          students: getSectionRoster(targetSectionId).map(student => ({ ...student, status: "present" })),
          cellIds: [cell.id],
          isEdited: false
        } as AttendanceRecord
      }))

    const combined = [...attendanceItems, ...specialDayItems, ...sessionOverridesItems, ...pendingItems]

    return combined
      .filter((item) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.subject.toLowerCase().includes(normalizedSearch) ||
          item.subjectCode.toLowerCase().includes(normalizedSearch) ||
          item.date.includes(normalizedSearch)

        const matchesDate = selectedDate.length === 0 || item.date === selectedDate

        const matchesPeriod = filterPeriod === "" || item.timeSlot.includes(filterPeriod)

        let matchesStatus = true
        if (item.type === "record" && filterStatus !== "all") {
          const counts = getCounts(item.students)
          if (filterStatus === "has_absentees") {
            matchesStatus = counts.absent > 0
          } else if (filterStatus === "full_attendance") {
            matchesStatus = counts.absent === 0
          }
        }

        return matchesSearch && matchesDate && matchesPeriod && matchesStatus
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [attendanceRecords, specialDays, searchTerm, selectedDate, sessionRecords, isCRLR, hasSearched, user, filterPeriod, filterStatus, targetSectionId, selectedSessionId])

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast({
        title: "No records to export",
        description: "Filter your list to find records to export.",
      })
      return
    }
    const headers = ["Date", "Subject Code", "Subject Name", "Period", "Present", "Permission", "Absent"]
    const rows = filteredRecords.map(item => {
      const counts = item.type === "record" ? getCounts(item.students) : { present: 0, permission: 0, absent: 0 }
      return [
        item.date,
        item.subjectCode,
        item.subject,
        item.timeSlot,
        item.type === "record" ? counts.present : "—",
        item.type === "record" ? counts.permission : "—",
        item.type === "record" ? counts.absent : "—"
      ]
    })
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `attendance_history_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({
      title: "Export Successful",
      description: "CSV file downloaded successfully.",
    })
  }

  const openDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record)
    setDraftStudents(record.students.map((student) => ({ ...student })))
    setIsEditMode(false)
  }

  const saveEdit = () => {
    if (!selectedRecord) return
    const { useAttendanceStore } = require("@/store")
    const { attendanceRecords } = useAttendanceStore.getState()
    const exists = attendanceRecords.some(r => r.id === selectedRecord.id)

    const finalRecord: AttendanceRecord = {
      ...selectedRecord,
      students: draftStudents.map((student) => ({ ...student })),
      editedAt: new Date().toISOString(),
      editedBy: `${user?.role.toUpperCase()} - ${user?.name}`,
      isEdited: exists,
    }

    if (exists) {
      updateAttendanceRecordFromHistory(selectedRecord.id, draftStudents)
    } else {
      // First-time submission of past missed attendance
      finalRecord.submittedAt = new Date().toISOString()
      finalRecord.submittedBy = `${user?.role.toUpperCase()} - ${user?.name}`
      delete finalRecord.editedAt
      delete finalRecord.editedBy
      finalRecord.isEdited = false

      const nextRecords = [finalRecord, ...attendanceRecords]
      useAttendanceStore.setState({ attendanceRecords: nextRecords })
      const { AttendanceService } = require("@/services")
      AttendanceService.saveRecords(nextRecords)
    }

    setSelectedRecord(finalRecord)
    setIsEditMode(false)

    toast({
      title: exists ? "Attendance Updated" : "Attendance Submitted",
      description: exists 
        ? "Attendance record updated successfully." 
        : "Past attendance has been successfully recorded.",
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

  const handleRowClick = (item: any) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }

    if (item.type === "pending") {
      setSelectedRecord(item.rawRecord)
      setDraftStudents(item.rawRecord.students.map((student: any) => ({ ...student })))
      setIsEditMode(true)
    } else {
      openDetail(item.rawRecord)
    }
  }

  const handleRemoveRecord = (record: AttendanceRecord) => {
    confirm({
      title: "Remove Attendance Record",
      message: `Are you sure you want to remove the attendance record for ${record.subjectCode} on ${formatDate(record.date)} ${record.timeSlot}? This action cannot be undone.`,
      confirmText: "Remove",
      onConfirm: () => {
        deleteAttendanceRecord(record.id)
        setLongPressedRecordId(null)
        toast({
          title: "Record Removed",
          description: `${record.subjectCode} attendance record was removed.`,
        })
      }
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center flex-wrap lg:gap-2.5 bg-card border border-border/60 p-4 rounded-2xl shadow-sm">
        {/* Search query */}
        <div className="relative w-full lg:w-[350px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subject..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="bg-input/40 pl-9 text-xs font-semibold rounded-xl h-10 border border-border/80"
          />
        </div>

        {/* Date Picker */}
        <div className="w-full lg:w-[160px]">
          <Input
            type="date"
            value={searchDate}
            onChange={(event) => setSearchDate(event.target.value)}
            className="w-full bg-input/40 border border-border/80 text-xs font-bold rounded-xl h-10 px-3 text-foreground"
          />
        </div>

        {/* Period Filter */}
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="w-full lg:w-[130px] bg-input/40 border border-border/80 text-xs font-bold rounded-xl h-10 px-3 focus:outline-none text-foreground"
        >
          <option value="">All Periods</option>
          <option value="9:10">Period 1</option>
          <option value="10:10">Period 2</option>
          <option value="11:40">Period 3</option>
          <option value="12:40">Period 4</option>
          <option value="2:00">Period 5</option>
          <option value="3:00">Period 6</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full lg:w-[130px] bg-input/40 border border-border/80 text-xs font-bold rounded-xl h-10 px-3 focus:outline-none text-foreground"
        >
          <option value="all">All Status</option>
          <option value="has_absentees">Has Absentees</option>
          <option value="full_attendance">Full Attendance</option>
        </select>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full lg:w-auto">
          <Button
            onClick={() => {
              setSearchTerm(searchQuery)
              setSelectedDate(searchDate)
              setHasSearched(true)
            }}
            className="flex-1 lg:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider px-4"
          >
            Search
          </Button>
          
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="flex-1 lg:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider border-emerald-600/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-4"
          >
            Export
          </Button>

          {(searchQuery !== "" || searchDate !== getTodayStr() || filterPeriod !== "" || filterStatus !== "all") && (
            <Button
              variant="outline"
              className="flex-1 lg:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider px-4"
              onClick={() => {
                const today = getTodayStr()
                setSearchQuery("")
                setSearchDate(today)
                setSearchTerm("")
                setSelectedDate(today)
                setFilterPeriod("")
                setFilterStatus("all")
                setHasSearched(true)
              }}
            >
              Clear
            </Button>
          )}
        </div>
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

                if (item.type === "pending") {
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer border-border bg-amber-500/5 transition-colors hover:bg-amber-500/10"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-600">
                              {item.subjectCode}
                            </span>
                            <span className="text-foreground font-semibold">{item.subject}</span>
                          </div>
                          <span className="text-[10px] text-amber-600/80 font-bold block mt-0.5 animate-pulse">
                            ⚠️ Missed Class - Click to mark attendance
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{item.timeSlot}</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold">
                          Pending
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
                    onClick={() => handleRowClick(item)}
                    onPointerDown={() => startLongPress(item.id)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onPointerCancel={endLongPress}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                            {item.subjectCode}
                          </span>
                          <span className="text-foreground font-semibold">{item.subject}</span>
                        </div>
                        {item.rawRecord && (
                          <div className="text-[10px] text-muted-foreground/80 font-medium">
                            {item.rawRecord.isEdited ? (
                              <span>
                                Last edited by <strong className="text-foreground/90">{item.rawRecord.editedBy || "HOD"}</strong> at {item.rawRecord.editedAt ? new Date(item.rawRecord.editedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true }) + " on " + new Date(item.rawRecord.editedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                              </span>
                            ) : (
                              <span>
                                Submitted by <strong className="text-foreground/90">{item.rawRecord.submittedBy || "CR"}</strong> at {item.rawRecord.submittedAt ? new Date(item.rawRecord.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true }) + " on " + new Date(item.rawRecord.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                              </span>
                            )}
                          </div>
                        )}
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
            <div className="py-10 text-center text-sm font-semibold text-muted-foreground">
              No attendance records or scheduled classes found for this date.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AttendanceHistory() {
  return <AttendanceHistoryPage />
}
