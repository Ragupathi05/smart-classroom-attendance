"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Save, Send, PencilLine, Copy, ChevronDown } from "lucide-react"
import { useAuthStore, useSharedStore, useTimetableStore, useAttendanceStore, useSettingsStore, useSessionStore } from "@/store"
import type { SessionType, SessionRecord } from "@/types"
import { SUBJECT_ROOMS } from "@/constants"
import { formatDate } from "@/utils/date-helpers"
import { cn } from "@/lib/utils"
import { AttendanceSummary } from "../components/AttendanceSummary"
import { AttendanceBar } from "../components/AttendanceBar"
import { StudentList } from "../components/StudentList"
import { ShareAttendanceModal } from "../components/ShareAttendanceModal"
import type { ShareAttendanceData } from "../components/ShareAttendanceModal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"

export function MarkAttendance() {
  const { user } = useAuthStore()
  const { setCurrentPage } = useSharedStore()
  const { selectedCell } = useTimetableStore()
  const { appSettings } = useSettingsStore()
  const {
    submitAttendance,
    copyPreviousPeriodAttendance,
    isViewingSubmittedAttendance,
    isEditMode,
    startEditingSubmittedAttendance,
    attendanceRecords,
    activeRecordId,
    students,
    attendanceDrafts,
  } = useAttendanceStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareData, setShareData] = useState<ShareAttendanceData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const classFacultyName = selectedCell?.facultyName || "Faculty Assigned"
  const activeRecord = attendanceRecords.find((record) => record.id === activeRecordId)
  const getActorLabel = (value?: string) => value?.split(" - ")[0] || "N/A"

  const currentDraft = selectedCell ? attendanceDrafts?.[selectedCell.id] : null

  // Today's Session store variables
  const todayDateStr = useMemo(() => {
    return new Date().toISOString().split("T")[0]
  }, [])

  const sessionKey = selectedCell ? `${todayDateStr}_${selectedCell.id}` : ""
  const { sessionRecords, saveSession, resetSession } = useSessionStore()
  const sessionRecord = sessionKey ? sessionRecords[sessionKey] : null

  const defaultSessionType = (selectedCell?.type as SessionType) || "regular"
  const currentSessionType = sessionRecord?.currentSessionType || defaultSessionType

  const handleSelectSessionType = (type: SessionType) => {
    if (!selectedCell) return

    let attendanceRequired: "Required" | "Optional" | "Not Required" = "Required"
    if (type === "seminar" || type === "workshop" || type === "holiday" || type === "cancelled" || type === "free_hour") {
      attendanceRequired = "Not Required"
    } else if (type === "guest_lecture" || type === "industrial_visit" || type === "examination") {
      attendanceRequired = "Optional"
    }

    const newRecord: SessionRecord = {
      id: sessionKey,
      date: todayDateStr,
      day: selectedCell.day,
      period: selectedCell.timeSlot,
      subjectCode: selectedCell.subjectCode,
      subjectName: selectedCell.subjectName,
      facultyName: classFacultyName,
      roomName: selectedCell.roomName || SUBJECT_ROOMS[selectedCell.subjectCode] || "Room 402",
      originalSessionType: selectedCell.type || "regular",
      currentSessionType: type,
      attendanceRequired,
      attendanceStatus: sessionRecord?.attendanceStatus || "not_submitted",
      modifiedBy: `${user?.role.toUpperCase() || "CR"} - ${user?.name || "User"}`,
      modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      notes: sessionRecord?.notes || "",
    }

    saveSession(sessionKey, newRecord)
    toast.success(`Session updated to ${type.replace("_", " ")}`)
  }

  const handleNotesChange = (text: string) => {
    if (!selectedCell || !sessionRecord) return
    const updated = {
      ...sessionRecord,
      notes: text,
      modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }
    saveSession(sessionKey, updated)
  }

  const handleSaveSession = () => {
    toast.success("Session saved successfully!")
  }

  const handleResetSession = () => {
    if (!selectedCell) return
    resetSession(sessionKey)
    toast.success("Reset session to weekly timetable defaults")
  }

  const handleSkipAttendance = () => {
    if (!selectedCell) return

    const baseRecord = sessionRecord || {
      id: sessionKey,
      date: todayDateStr,
      day: selectedCell.day,
      period: selectedCell.timeSlot,
      subjectCode: selectedCell.subjectCode,
      subjectName: selectedCell.subjectName,
      facultyName: classFacultyName,
      roomName: selectedCell.roomName || SUBJECT_ROOMS[selectedCell.subjectCode] || "Room 402",
      originalSessionType: selectedCell.type || "regular",
      currentSessionType: currentSessionType,
      notes: "",
    }

    const updated: SessionRecord = {
      ...baseRecord,
      currentSessionType: currentSessionType,
      attendanceStatus: "skipped",
      attendanceRequired: "Not Required",
      modifiedBy: `${user?.role.toUpperCase() || "CR"} - ${user?.name || "User"}`,
      modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }
    saveSession(sessionKey, updated)
    toast.info("Attendance skipped for this session.")
  }

  const handleTakeAttendance = () => {
    if (!selectedCell) return

    const baseRecord = sessionRecord || {
      id: sessionKey,
      date: todayDateStr,
      day: selectedCell.day,
      period: selectedCell.timeSlot,
      subjectCode: selectedCell.subjectCode,
      subjectName: selectedCell.subjectName,
      facultyName: classFacultyName,
      roomName: selectedCell.roomName || SUBJECT_ROOMS[selectedCell.subjectCode] || "Room 402",
      originalSessionType: selectedCell.type || "regular",
      currentSessionType: currentSessionType,
      notes: "",
    }

    const updated: SessionRecord = {
      ...baseRecord,
      currentSessionType: currentSessionType,
      attendanceStatus: "not_submitted",
      attendanceRequired: "Required",
      modifiedBy: `${user?.role.toUpperCase() || "CR"} - ${user?.name || "User"}`,
      modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    }
    saveSession(sessionKey, updated)
  }

  const handleSaveDraft = () => {
    if (!selectedCell) return
    setIsSaving(true)

    // Explicitly update draft timestamp
    useAttendanceStore.setState((state) => {
      const drafts = { ...(state.attendanceDrafts || {}) }
      drafts[selectedCell.id] = {
        cellId: selectedCell.id,
        students: state.students.map((s) => ({ ...s })),
        lastUpdated: new Date().toISOString()
      }
      return { attendanceDrafts: drafts }
    })

    setTimeout(() => {
      setIsSaving(false)
      toast.success("Attendance draft saved successfully")
    }, 500)
  }

  const handleSubmit = () => {
    if (!selectedCell) return

    if (appSettings.requireConfirmation) {
      const shouldContinue = window.confirm(
        isViewingSubmittedAttendance && isEditMode
          ? "Are you sure you want to update this attendance record?"
          : "Are you sure you want to submit attendance for this class?"
      )

      if (!shouldContinue) return
    }

    try {
      const snapshotStudents = students.map((student) => ({ ...student }))
      const absentStudents = snapshotStudents.filter((student) => student.status === "absent")
      const presentCount = snapshotStudents.filter((student) => student.status === "present").length
      const permissionCount = snapshotStudents.filter((student) => student.status === "permission").length

      const reportData: ShareAttendanceData = {
        subject: `${selectedCell.subjectName} (${selectedCell.subjectCode})`,
        date: todayDateStr,
        presentCount,
        permissionCount,
        absentCount: absentStudents.length,
        absentStudents,
      }

      const result = submitAttendance(selectedCell)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      // Save session status as submitted
      const baseRecord = sessionRecord || {
        id: sessionKey,
        date: todayDateStr,
        day: selectedCell.day,
        period: selectedCell.timeSlot,
        subjectCode: selectedCell.subjectCode,
        subjectName: selectedCell.subjectName,
        facultyName: classFacultyName,
        roomName: selectedCell.roomName || SUBJECT_ROOMS[selectedCell.subjectCode] || "Room 402",
        originalSessionType: selectedCell.type || "regular",
        notes: "",
      }

      saveSession(sessionKey, {
        ...baseRecord,
        currentSessionType: currentSessionType,
        attendanceRequired: "Required",
        attendanceStatus: "submitted",
        modifiedBy: `${user?.role.toUpperCase() || "CR"} - ${user?.name || "User"}`,
        modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      })

      if (result.mode === "updated") {
        toast.success(result.message)
        return
      }

      if (result.mode === "request-created") {
        toast.success(result.message)
        return
      }

      if (result.mode === "no-change") {
        toast.info(result.message)
        return
      }

      toast.success("Attendance submitted successfully!")
      setShareData(reportData)
      setShowShareModal(true)
    } catch {
      toast.error("Failed to submit attendance")
    }
  }

  const handleUsePreviousHour = () => {
    if (!selectedCell) return

    const result = copyPreviousPeriodAttendance(selectedCell)
    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
  }

  const handleCloseModal = () => {
    setShowShareModal(false)
    setShareData(null)
    setCurrentPage("dashboard")
  }

  // If no cell selected, show selection prompt
  if (!selectedCell) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">No Class Selected</h2>
          <p className="mt-2 text-muted-foreground">
            Please select a class from the timetable to mark attendance
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCurrentPage("dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const isNoAttendanceRequired =
    currentSessionType === "seminar" ||
    currentSessionType === "workshop" ||
    currentSessionType === "holiday" ||
    currentSessionType === "cancelled" ||
    currentSessionType === "free_hour" ||
    (sessionRecord?.attendanceStatus === "skipped")

  const room = SUBJECT_ROOMS[selectedCell.subjectCode] || "NPN-202"

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage("dashboard")}
            className="hover:bg-secondary/60 rounded-xl"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span>Mark Attendance</span>
              <span>•</span>
              <span className="text-primary font-black">{selectedCell.day}</span>
            </div>
            <h1 className="text-2xl font-black text-foreground mt-0.5">
              {selectedCell.subjectName} ({selectedCell.subjectCode})
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1.5 bg-secondary/40 px-2.5 py-1 rounded-md border border-border/30">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {selectedCell.timeSlot.replace(/-/g, " – ")}
              </span>
              <span className="flex items-center gap-1">
                Faculty: <strong className="text-foreground font-bold">{classFacultyName}</strong>
              </span>
              <span className="flex items-center gap-1">
                Room: <strong className="text-foreground font-bold">{room}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Session Dropdown Select */}
        <div className="flex items-center gap-2 bg-card border border-border/75 px-3.5 py-2 rounded-xl shadow-sm max-w-sm self-start md:self-auto">
          <label htmlFor="session-type-select" className="text-xs font-black text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Session:
          </label>
          <div className="relative flex items-center">
            <select
              id="session-type-select"
              value={currentSessionType}
              onChange={(e) => handleSelectSessionType(e.target.value as SessionType)}
              className="bg-transparent text-foreground text-xs font-bold leading-tight focus:outline-none pr-6 cursor-pointer appearance-none min-w-[150px]"
            >
              <option value="regular" className="bg-card text-foreground">Regular Class</option>
              <option value="lab" className="bg-card text-foreground">Lab</option>
              <option value="seminar" className="bg-card text-foreground">Seminar</option>
              <option value="workshop" className="bg-card text-foreground">Workshop</option>
              <option value="guest_lecture" className="bg-card text-foreground">Guest Lecture</option>
              <option value="industrial_visit" className="bg-card text-foreground">Industrial Visit</option>
              <option value="examination" className="bg-card text-foreground">Examination</option>
              <option value="extra_class" className="bg-card text-foreground">Extra Class</option>
              <option value="free_hour" className="bg-card text-foreground">Free Hour</option>
              <option value="holiday" className="bg-card text-foreground">Holiday</option>
              <option value="cancelled" className="bg-card text-foreground">Cancelled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* TODAY'S SESSION Control Panel */}
      <Card className="border-border/50 bg-card/85 backdrop-blur-sm shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-bold">
            <div>
              <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Session Status</p>
              <Badge className={cn(
                "mt-1 px-3 py-1 font-extrabold text-[10px] uppercase tracking-wider",
                sessionRecord?.attendanceRequired === "Required" || (!sessionRecord && (currentSessionType === "regular" || currentSessionType === "lab" || currentSessionType === "extra_class"))
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100"
                  : sessionRecord?.attendanceRequired === "Optional"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-100"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-400 hover:bg-slate-100"
              )}>
                {sessionRecord ? `Attendance ${sessionRecord.attendanceRequired}` : "Attendance Required"}
              </Badge>
            </div>

            {sessionRecord && (
              <div>
                <p className="text-muted-foreground uppercase tracking-widest text-[10px]">Last Modified</p>
                <p className="text-xs font-extrabold text-foreground mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  {sessionRecord.modifiedBy} at {sessionRecord.modifiedTime}
                </p>
              </div>
            )}
          </div>

          {/* Action Choice for Attendance Optional types */}
          {!isNoAttendanceRequired && (currentSessionType === "guest_lecture" || currentSessionType === "industrial_visit" || currentSessionType === "examination") && (
            <div className="flex flex-col gap-3.5 border-t border-border/40 pt-4 bg-secondary/25 p-4 rounded-xl border border-border/40">
              <div>
                <p className="text-xs font-black text-foreground capitalize flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {currentSessionType.replace("_", " ")} Override Active
                </p>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                  This session has optional attendance. Choose whether to mark student attendance.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  type="button"
                  onClick={handleTakeAttendance}
                  variant={sessionRecord?.attendanceStatus !== "skipped" ? "default" : "outline"}
                  className="font-bold text-xs"
                >
                  Take Attendance
                </Button>
                <Button
                  size="sm"
                  type="button"
                  onClick={handleSkipAttendance}
                  variant={sessionRecord?.attendanceStatus === "skipped" ? "default" : "outline"}
                  className="font-bold text-xs"
                >
                  Skip Attendance
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditional Layout Panels */}
      {isNoAttendanceRequired ? (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/70 rounded-xl bg-secondary/10">
              <span className="text-4xl mb-2 animate-bounce">
                {currentSessionType === "holiday" ? "⚫" :
                 currentSessionType === "seminar" ? "🟣" :
                 currentSessionType === "workshop" ? "🟠" :
                 currentSessionType === "cancelled" ? "🔴" : "⚪"}
              </span>
              <h3 className="text-base font-extrabold text-foreground capitalize">
                {currentSessionType === "cancelled" ? "Cancelled Class" : `${currentSessionType.replace("_", " ")} Session`}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                {currentSessionType === "holiday" || currentSessionType === "free_hour"
                  ? "No attendance is required."
                  : "Attendance is not required for this period."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold border-b border-border/30 pb-4">
              <div>
                <p className="text-muted-foreground">Faculty</p>
                <p className="font-extrabold text-foreground mt-0.5">{classFacultyName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Venue</p>
                <p className="font-extrabold text-foreground mt-0.5">{room}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time</p>
                <p className="font-extrabold text-foreground mt-0.5">{selectedCell.timeSlot}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-extrabold text-foreground mt-0.5">{formatDate(todayDateStr)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground" htmlFor="session-notes">
                {currentSessionType === "holiday" ? "Reason / Notes" : "Optional Notes"}
              </label>
              <textarea
                id="session-notes"
                value={sessionRecord?.notes || ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder={
                  currentSessionType === "holiday"
                    ? "Enter holiday reason (e.g. Independence Day Celebration)..."
                    : "Add any session details, topics covered, or notes..."
                }
                className="w-full min-h-[90px] rounded-lg border border-border/80 bg-input p-3 text-xs text-foreground font-semibold placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleResetSession} className="font-bold text-xs">
                Reset to Timetable
              </Button>
              {sessionRecord?.attendanceStatus === "skipped" && (
                <Button type="button" onClick={handleTakeAttendance} className="font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white">
                  Take Attendance
                </Button>
              )}
              <Button type="button" onClick={handleSaveSession} className="font-bold text-xs">
                Save Session
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Normal Attendance Mark Elements */}
          {isViewingSubmittedAttendance && !isEditMode && (
            <Card className="border-border bg-card">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  Last modified by {getActorLabel(activeRecord?.isEdited ? activeRecord?.editedBy : activeRecord?.submittedBy)}
                  {activeRecord?.isEdited
                    ? activeRecord?.editedAt
                      ? ` on ${new Date(activeRecord.editedAt).toLocaleString()}`
                      : ""
                    : activeRecord?.submittedAt
                    ? ` on ${new Date(activeRecord.submittedAt).toLocaleString()}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <AttendanceSummary />

          {/* Attendance Bar */}
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <AttendanceBar />
            </CardContent>
          </Card>

          {/* Student List */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Student List</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentList readOnly={isViewingSubmittedAttendance && !isEditMode} />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {currentDraft && !isViewingSubmittedAttendance && (
                <p className="text-xs text-muted-foreground italic bg-secondary/35 border border-border/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Draft Autosaved at {new Date(currentDraft.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              {isViewingSubmittedAttendance && !isEditMode ? (
                <Button onClick={startEditingSubmittedAttendance} type="button">
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit Attendance
                </Button>
              ) : null}

              <Button
                variant="secondary"
                type="button"
                onClick={handleUsePreviousHour}
                disabled={isViewingSubmittedAttendance && !isEditMode}
                className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                <Copy className="mr-2 h-4 w-4" />
                Use Previous Hour
              </Button>

              <Button
                variant="outline"
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving || (isViewingSubmittedAttendance && !isEditMode)}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isViewingSubmittedAttendance && !isEditMode}
              >
                <Send className="mr-2 h-4 w-4" />
                {isViewingSubmittedAttendance && isEditMode ? "Update Attendance" : "Submit Attendance"}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Reset Session button for normal required classes if customized */}
      {sessionRecord && !isNoAttendanceRequired && (
        <div className="flex justify-end pt-2 border-t border-border/30">
          <Button type="button" variant="outline" onClick={handleResetSession} className="font-bold text-xs">
            Reset to Timetable
          </Button>
        </div>
      )}

      {/* Share Modal */}
      <ShareAttendanceModal open={showShareModal} onClose={handleCloseModal} data={shareData} />
    </div>
  )
}
