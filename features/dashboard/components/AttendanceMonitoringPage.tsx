"use client"

import React, { useState, useMemo, useEffect } from "react"
import { 
  ClipboardCheck, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Slash, 
  Eye, 
  X, 
  Check, 
  UserMinus, 
  Clock,
  UserCheck, 
  Bell 
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import { useAcademicStore, useStudentStore, useAttendanceStore, useTimetableStore } from "@/store"
import type { Student, AttendanceRecord } from "@/types"

export function AttendanceMonitoringPage() {
  const { batches, sections, getSectionRoster } = useAcademicStore()
  const { classStudents } = useStudentStore()
  const { attendanceRecords, submitAttendance } = useAttendanceStore()
  const { timetable } = useTimetableStore()

  // 1. Filter States
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])

  // Modal State for viewing student list
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")

  // Auto-initialize Batch selection
  useEffect(() => {
    const active = batches.find(b => b.status === "ACTIVE")
    if (active) {
      setSelectedBatchId(active.id)
    } else if (batches.length > 0) {
      setSelectedBatchId(batches[0].id)
    }
  }, [batches])

  // Filter sections belonging to selected batch
  const filteredSections = useMemo(() => {
    if (!selectedBatchId) return []
    return sections.filter(s => s.batchId === selectedBatchId)
  }, [sections, selectedBatchId])

  // Auto-initialize Section selection
  useEffect(() => {
    if (filteredSections.length > 0) {
      // Find one that matches state or select first
      const exists = filteredSections.find(s => s.id === selectedSectionId)
      if (!exists) {
        setSelectedSectionId(filteredSections[0].id)
      }
    } else {
      setSelectedSectionId("")
    }
  }, [filteredSections, selectedSectionId])

  const selectedSectionObj = useMemo(() => {
    return sections.find(s => s.id === selectedSectionId) || null
  }, [sections, selectedSectionId])

  // Map today name (e.g. Monday)
  const selectedDayName = useMemo(() => {
    const dayIndex = new Date(selectedDate).getDay()
    return dayIndex >= 1 && dayIndex <= 6 
      ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIndex - 1] 
      : "Sunday"
  }, [selectedDate])

  // 2. Fetch CR/LR Attendance logs for this Section and Date
  const monitoringLogs = useMemo(() => {
    if (!selectedSectionObj) return []

    // Filter timetable cells for this section on this day
    const sectionTimetableCells = timetable.filter(
      (c) => (c.sectionId === selectedSectionId || c.sectionName === selectedSectionObj.name) && c.day === selectedDayName
    ).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))

    // For each time slot, find if there is an attendance record in store
    return sectionTimetableCells.map((cell) => {
      // Look for a real record matching date, class, and slot
      const realRecord = attendanceRecords.find(
        (r) => (r.sectionId === selectedSectionId || r.className === selectedSectionObj.name) && 
               r.date === selectedDate && 
               r.timeSlot === cell.timeSlot
      )

      if (realRecord) {
        // Calculate counts
        let present = 0
        let absent = 0
        let permission = 0

        realRecord.students.forEach((s) => {
          if (s.status === "present") present++
          else if (s.status === "absent") absent++
          else if (s.status === "permission") permission++
        })

        return {
          id: realRecord.id,
          timeSlot: cell.timeSlot,
          subject: cell.subjectName,
          faculty: cell.facultyName || "Assigned Faculty",
          status: "submitted" as const,
          submittedBy: realRecord.submittedBy || selectedSectionObj.crName || "CR Representative",
          presentCount: present,
          absentCount: absent,
          permissionCount: permission,
          rawRecord: realRecord,
          cell
        }
      }

      return {
        id: `pending-${cell.id}`,
        timeSlot: cell.timeSlot,
        subject: cell.subjectName,
        faculty: cell.facultyName || "Assigned Faculty",
        status: "pending" as const,
        submittedBy: "—",
        presentCount: 0,
        absentCount: 0,
        permissionCount: 0,
        rawRecord: null,
        cell
      }
    })
  }, [selectedSectionObj, selectedSectionId, selectedDate, selectedDayName, timetable, attendanceRecords])

  // Summary Metrics
  const stats = useMemo(() => {
    let submitted = 0
    let pending = 0

    monitoringLogs.forEach((log) => {
      if (log.status === "submitted") submitted++
      else pending++
    })

    return { submitted, pending }
  }, [monitoringLogs])

  const handleSendReminder = (facultyName: string) => {
    toast.success(`Reminder alert sent successfully to ${facultyName} and CR representative!`)
  }

  const handleSimulateMark = (cell: any) => {
    if (!selectedSectionObj) return

    // 1. Fetch active roster students
    const roster = getSectionRoster(selectedSectionId)
    if (roster.length === 0) {
      toast.error("Roster is empty. Add students before marking attendance.")
      return
    }

    // 2. Load draft/students state for this submit action
    const simulatedStudents = roster.map((s, idx) => ({
      ...s,
      status: (idx % 12 === 0 ? "absent" : idx % 20 === 0 ? "permission" : "present") as any
    }))

    useAttendanceStore.setState({
      students: simulatedStudents
    })

    // 3. Submit
    submitAttendance({
      ...cell,
      day: selectedDayName,
      sectionId: selectedSectionId,
      sectionName: selectedSectionObj.name
    })

    toast.success(`Simulated attendance submission for ${cell.subjectName}!`)
  }

  // Filter students inside details modal
  const filteredModalStudents = useMemo(() => {
    if (!viewingRecord) return []
    if (!studentSearchQuery.trim()) return viewingRecord.students
    const q = studentSearchQuery.toLowerCase()
    return viewingRecord.students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    )
  }, [viewingRecord, studentSearchQuery])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground text-gradient-primary">Attendance Monitoring</h1>
        <p className="text-xs font-semibold text-muted-foreground">
          Track hourly attendance records submitted by Class Representatives (CR) and Ladies Representatives (LR).
        </p>
      </div>

      {/* Filter Drill-Down Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-secondary/15 border border-border/85 p-4 rounded-2xl justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-primary">
            <Filter className="h-4.5 w-4.5" />
            <span className="uppercase tracking-widest text-[9px] font-black">Filters:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Batch:</span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="bg-card border text-[11px] font-bold rounded-lg h-8 px-2 focus:outline-none"
            >
              <option value="">-- Select Batch --</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Section:</span>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="bg-card border text-[11px] font-bold rounded-lg h-8 px-2 focus:outline-none"
              disabled={filteredSections.length === 0}
            >
              {filteredSections.length === 0 ? (
                <option value="">No active sections</option>
              ) : (
                filteredSections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Date:</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-card border text-[11px] font-bold rounded-lg h-8 px-2 w-36 focus:outline-none"
            />
          </div>
        </div>

        {selectedSectionObj && (
          <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/5 rounded-lg py-1 px-3 mt-2 sm:mt-0">
            Folder Active: {selectedSectionObj.name}
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2">
        <div className="stats-card-emerald p-4 rounded-2xl flex items-center justify-between shadow-sm bg-card/65">
          <div className="space-y-0.5">
            <p className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">Submitted slots</p>
            <p className="text-2xl font-black text-foreground">{stats.submitted}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm border border-border/40">
            <CheckCircle2 className="h-5 w-5 text-emerald-650 dark:text-emerald-400" />
          </div>
        </div>

        <div className="stats-card-rose p-4 rounded-2xl flex items-center justify-between shadow-sm bg-card/65">
          <div className="space-y-0.5">
            <p className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">Pending slots</p>
            <p className="text-2xl font-black text-foreground">{stats.pending}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm border border-border/40">
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Hourly Compliance Checklist Grid */}
      <Card className="border-border/50 bg-card/85 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            CR / LR Hourly Attendance Roster
          </CardTitle>
          <CardDescription className="text-xs font-semibold text-muted-foreground">
            Showing hourly attendance logs submitted by representatives for <strong className="text-foreground">{selectedSectionObj?.name || "N/A"}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-6">Time Slot</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Lecturer</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Present</th>
                  <th className="p-4 text-center">Absent</th>
                  <th className="p-4 text-center">Permission</th>
                  <th className="p-4">Submitted By</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-semibold">
                {monitoringLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground font-bold italic">
                      No schedule hours mapped for this day.
                    </td>
                  </tr>
                ) : (
                  monitoringLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-primary flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.timeSlot}
                      </td>
                      <td className="p-4 text-foreground font-bold">{item.subject}</td>
                      <td className="p-4 text-muted-foreground">{item.faculty}</td>
                      <td className="p-4 text-center">
                        <Badge className={cn(
                          "font-bold px-2.5 py-0.5 text-[9px] uppercase border",
                          item.status === "submitted" 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                        )}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {item.status === "submitted" ? item.presentCount : "—"}
                      </td>
                      <td className="p-4 text-center font-bold text-rose-500">
                        {item.status === "submitted" ? item.absentCount : "—"}
                      </td>
                      <td className="p-4 text-center font-bold text-amber-500">
                        {item.status === "submitted" ? item.permissionCount : "—"}
                      </td>
                      <td className="p-4 text-muted-foreground font-bold">
                        {item.status === "submitted" ? (
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {item.submittedBy}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        {item.status === "submitted" && item.rawRecord ? (
                          <Button
                            onClick={() => setViewingRecord(item.rawRecord)}
                            size="xs"
                            className="text-[10px] font-bold rounded-lg h-7 border-border/80"
                            variant="outline"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View Attendance
                          </Button>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button
                              onClick={() => handleSendReminder(item.faculty)}
                              size="xs"
                              className="text-[10px] font-black rounded-lg h-7 bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1"
                            >
                              <Bell className="h-3 w-3" />
                              Send Alert
                            </Button>
                            <Button
                              onClick={() => handleSimulateMark(item.cell)}
                              size="xs"
                              className="text-[10px] font-black rounded-lg h-7 bg-indigo-650 hover:bg-indigo-700 text-white flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Simulate Mark
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: View Roster Details Sheet */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingRecord(null)} />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                  Attendance Sheet Details
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Slot: <strong className="text-foreground">{viewingRecord.timeSlot}</strong> | Subject: <strong className="text-foreground">{viewingRecord.subject}</strong>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingRecord(null)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <Input
                placeholder="Search students by name or roll number..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="h-9 text-xs font-semibold rounded-xl bg-input/40"
              />
            </div>

            <div className="overflow-y-auto max-h-[350px] border border-border/60 rounded-xl bg-secondary/5 divide-y divide-border/40">
              {filteredModalStudents.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-muted-foreground italic">
                  No students found matching your query.
                </div>
              ) : (
                filteredModalStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-xs font-semibold">
                    <div>
                      <p className="text-foreground font-black">{s.name}</p>
                      <p className="text-muted-foreground font-mono text-[10px] mt-0.5">{s.rollNumber}</p>
                    </div>
                    <div>
                      <Badge className={cn(
                        "font-bold uppercase text-[9px] px-2.5 py-0.5 border",
                        s.status === "present" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        s.status === "absent" && "bg-rose-500/10 text-rose-650 border border-rose-500/20",
                        s.status === "permission" && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50 mt-4">
              <Button onClick={() => setViewingRecord(null)} className="text-xs font-bold rounded-xl h-9">
                Close Sheet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
