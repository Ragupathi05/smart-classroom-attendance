"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeft, Search, PencilLine, Save, Share2, Trash2, Hand } from "lucide-react"
import { useAppStore, type AttendanceRecord, type AttendanceStatus, type Student } from "@/lib/store"
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
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { copyTextRobust, tryOpenWindow } from "@/lib/share-utils"

const ALLOWED_EDIT_WINDOW_MS = 60 * 60 * 1000
const LONG_PRESS_MS = 600

const statusOptions: { value: AttendanceStatus; label: string; colorClass: string }[] = [
  { value: "present", label: "Present", colorClass: "text-green-600" },
  { value: "permission", label: "Permission", colorClass: "text-yellow-600" },
  { value: "absent", label: "Absent", colorClass: "text-red-600" },
]

function getCounts(students: Student[]) {
  const present = students.filter((student) => student.status === "present").length
  const permission = students.filter((student) => student.status === "permission").length
  const absent = students.filter((student) => student.status === "absent").length
  return { present, permission, absent }
}

function isWithinAllowedWindow(record: AttendanceRecord) {
  if (!record.submittedAt) return false
  const submittedTime = new Date(record.submittedAt).getTime()
  return Date.now() - submittedTime <= ALLOWED_EDIT_WINDOW_MS
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AttendanceHistoryPage() {
  const {
    attendanceRecords,
    updateAttendanceRecordFromHistory,
    deleteAttendanceRecord,
    user,
  } = useAppStore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)
  const [draftStudents, setDraftStudents] = useState<Student[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [longPressedRecordId, setLongPressedRecordId] = useState<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const filteredRecords = useMemo(
    () =>
      attendanceRecords.filter(
        (record) =>
          record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.date.includes(searchTerm)
      ),
    [attendanceRecords, searchTerm]
  )

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

    return `ATTENDANCE REPORT
================
Subject: ${record.subject} (${record.subjectCode})
Date: ${formatDate(record.date)}
Time: ${record.timeSlot}
Class: ${record.className}

SUMMARY
-------
Present: ${counts.present}
Permission: ${counts.permission}
Absent: ${counts.absent}
Total: ${students.length}

${absentStudents.length > 0 ? `ABSENT STUDENTS\n---------------\n${absentStudents
      .map((student) => `${student.rollNumber} - ${student.name}`)
      .join("\n")}` : "All students present!"}

Last Modified: ${formatDateTime(record.editedAt || record.submittedAt)}
`
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRecord(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Attendance Detail</h1>
              <p className="text-muted-foreground">
                {selectedRecord.subject} ({selectedRecord.subjectCode}) - {formatDate(selectedRecord.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleShareAttendance}>
              <Share2 className="mr-2 h-4 w-4" />
              Share Attendance
            </Button>
            {!isEditMode ? (
              <Button onClick={() => setIsEditMode(true)} disabled={!canEdit}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Button onClick={saveEdit}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-semibold text-foreground">{selectedRecord.subject}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold text-foreground">{formatDate(selectedRecord.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Modified</p>
              <p className="font-semibold text-foreground">
                {formatDateTime(selectedRecord.editedAt || selectedRecord.submittedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Edit Window</p>
              <p className={cn("font-semibold", canEdit ? "text-green-600" : "text-red-600")}>
                {canEdit ? "Allowed" : "Expired"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{counts.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{counts.permission}</p>
              <p className="text-xs text-muted-foreground">Permission</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{counts.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Full Student Attendance List</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px] rounded-lg border border-border">
              <div className="divide-y divide-border">
                <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 bg-muted px-4 py-3">
                  <div className="col-span-2 text-sm font-medium text-muted-foreground">Roll No.</div>
                  <div className="col-span-4 text-sm font-medium text-muted-foreground">Student Name</div>
                  <div className="col-span-6 text-sm font-medium text-muted-foreground">Attendance Status</div>
                </div>

                {draftStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className={cn(
                      "grid grid-cols-12 items-center gap-4 px-4 py-3",
                      index % 2 === 0 ? "bg-card" : "bg-muted/30"
                    )}
                  >
                    <div className="col-span-2 font-mono text-sm text-foreground">{student.rollNumber}</div>
                    <div className="col-span-4 text-sm font-medium text-foreground">{student.name}</div>
                    <div className="col-span-6">
                      <RadioGroup
                        value={student.status}
                        onValueChange={(value) => updateStudentInDraft(student.id, value as AttendanceStatus)}
                        className="flex flex-wrap gap-4"
                        disabled={!isEditMode || !canEdit}
                      >
                        {statusOptions.map((option) => (
                          <div key={option.value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={option.value}
                              id={`${student.id}-${option.value}`}
                              className={cn(
                                "border-muted-foreground",
                                student.status === option.value && option.value === "present" && "border-green-600 text-green-600",
                                student.status === option.value && option.value === "permission" && "border-yellow-600 text-yellow-600",
                                student.status === option.value && option.value === "absent" && "border-red-600 text-red-600"
                              )}
                            />
                            <Label
                              htmlFor={`${student.id}-${option.value}`}
                              className={cn(
                                "text-sm",
                                !isEditMode || !canEdit ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                                student.status === option.value ? option.colorClass : "text-muted-foreground"
                              )}
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AttendanceHistoryPage</h1>
        <p className="text-muted-foreground">Previously recorded attendance entries.</p>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by subject code, subject or date"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="bg-input pl-9"
        />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg font-semibold text-foreground">Attendance Records ({filteredRecords.length})</CardTitle>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              <Hand className="h-3.5 w-3.5" />
              <span>Long press row to remove</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center">Permission</TableHead>
                <TableHead className="text-center">Absent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const counts = getCounts(record.students)
                return (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer border-border transition-colors hover:bg-muted/40"
                    onClick={() => handleRowClick(record)}
                    onPointerDown={() => startLongPress(record.id)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onPointerCancel={endLongPress}
                  >
                    <TableCell className="font-medium text-foreground">{formatDate(record.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                          {record.subjectCode}
                        </span>
                        <span className="text-foreground">{record.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-green-600">{counts.present}</TableCell>
                    <TableCell className="text-center text-yellow-600">{counts.permission}</TableCell>
                    <TableCell className="text-center text-red-600">{counts.absent}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={record.isEdited ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                          {record.isEdited ? "Edited" : "Submitted"}
                        </Badge>
                        {longPressedRecordId === record.id ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRemoveRecord(record)
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
