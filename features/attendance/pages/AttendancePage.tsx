"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Save, Send, PencilLine, Copy, ChevronDown } from "lucide-react"
import { useAuthStore, useSharedStore, useTimetableStore, useAttendanceStore, useSettingsStore, useSessionStore, useConfirmStore } from "@/store"
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
  const isCRLR = user?.role === "cr" || user?.role === "lr"
  const { setCurrentPage } = useSharedStore()
  const { selectedCell } = useTimetableStore()
  const { appSettings } = useSettingsStore()
  const confirm = useConfirmStore((state) => state.confirm)
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

    const processSubmit = () => {
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

    if (appSettings.requireConfirmation) {
      confirm({
        title: isViewingSubmittedAttendance && isEditMode ? "Update Attendance" : "Submit Attendance",
        message: isViewingSubmittedAttendance && isEditMode
          ? "Are you sure you want to update this attendance record? This will modify the history logs."
          : "Are you sure you want to submit attendance for this class period?",
        confirmText: "Submit",
        onConfirm: processSubmit
      })
    } else {
      processSubmit()
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
    <div className="space-y-6 animate-fade-in-up">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column: Student list roster & summaries */}
        <div className={cn("space-y-6", isCRLR ? "lg:col-span-4" : "lg:col-span-3")}>
          {isNoAttendanceRequired ? (
            <Card className="border-border/50 bg-secondary/15 rounded-2xl shadow-sm">
              <CardContent className="p-8 space-y-5 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-2 animate-bounce">
                  {currentSessionType === "holiday" ? "⚫" :
                   currentSessionType === "seminar" ? "🟣" :
                   currentSessionType === "workshop" ? "🟠" :
                   currentSessionType === "cancelled" ? "🔴" : "⚪"}
                </span>
                <h3 className="text-base font-extrabold text-foreground capitalize">
                  {currentSessionType === "cancelled" ? "Cancelled Class" : `${currentSessionType.replace("_", " ")} Session`}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-bold max-w-sm">
                  Attendance is not required for this session due to the active override ({currentSessionType.replace("_", " ")}).
                </p>

                {sessionRecord?.notes && (
                  <div className="mt-4 p-4 border border-border/50 bg-card rounded-xl text-left text-xs font-semibold max-w-md w-full">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Session notes / Reason</p>
                    <p className="text-foreground">{sessionRecord.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
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
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {isViewingSubmittedAttendance && !isEditMode ? (
                    <Button onClick={startEditingSubmittedAttendance} type="button" className="flex-1 sm:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider">
                      <PencilLine className="mr-1.5 h-4 w-4" />
                      Edit Attendance
                    </Button>
                  ) : null}

                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleUsePreviousHour}
                    disabled={isViewingSubmittedAttendance && !isEditMode}
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    Use Previous Hour
                  </Button>

                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving || (isViewingSubmittedAttendance && !isEditMode)}
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider"
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isViewingSubmittedAttendance && !isEditMode}
                    className="flex-1 sm:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider"
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    {isViewingSubmittedAttendance && isEditMode ? "Update Attendance" : "Submit Attendance"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Period Status settings sidebar panel */}
        {!isCRLR && (
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/60 bg-card rounded-2xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Period Status Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Session Type:</p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { type: "regular", label: "Regular Class", color: "hover:border-primary hover:bg-primary/5" },
                      { type: "lab", label: "Lab Session", color: "hover:border-primary hover:bg-primary/5" },
                      { type: "extra_class", label: "Extra Class", color: "hover:border-emerald-500 hover:bg-emerald-500/5" },
                      { type: "seminar", label: "Seminar Session", color: "hover:border-purple-500 hover:bg-purple-500/5" },
                      { type: "workshop", label: "Workshop Training", color: "hover:border-orange-500 hover:bg-orange-500/5" },
                      { type: "guest_lecture", label: "Guest Lecture", color: "hover:border-blue-500 hover:bg-blue-500/5" },
                      { type: "industrial_visit", label: "Industrial Visit", color: "hover:border-teal-500 hover:bg-teal-500/5" },
                      { type: "examination", label: "Examination Exam", color: "hover:border-amber-500 hover:bg-amber-500/5" },
                      { type: "free_hour", label: "Free Hour", color: "hover:border-slate-500 hover:bg-slate-500/5" },
                      { type: "holiday", label: "Holiday declared", color: "hover:border-red-500 hover:bg-red-500/5" },
                      { type: "cancelled", label: "Cancelled period", color: "hover:border-rose-500 hover:bg-rose-500/5" },
                    ].map((item) => {
                      const active = currentSessionType === item.type
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleSelectSessionType(item.type as SessionType)}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-black transition-all duration-150",
                            active
                              ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10"
                              : cn("bg-card border-border/80 text-muted-foreground", item.color)
                          )}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Attendance optional choice */}
                {!isNoAttendanceRequired && (currentSessionType === "guest_lecture" || currentSessionType === "industrial_visit" || currentSessionType === "examination") && (
                  <div className="p-3 bg-secondary/30 border border-border/50 rounded-xl space-y-2 text-[11px] font-bold">
                    <p className="text-foreground capitalize">{currentSessionType.replace("_", " ")} Optional</p>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        onClick={handleTakeAttendance}
                        variant={sessionRecord?.attendanceStatus !== "skipped" ? "default" : "outline"}
                        className="w-full text-[10px]"
                      >
                        Take
                      </Button>
                      <Button
                        size="xs"
                        onClick={handleSkipAttendance}
                        variant={sessionRecord?.attendanceStatus === "skipped" ? "default" : "outline"}
                        className="w-full text-[10px]"
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5 pt-3 border-t border-border/50">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" htmlFor="sidebar-notes">
                    Session Notes:
                  </label>
                  <textarea
                    id="sidebar-notes"
                    value={sessionRecord?.notes || ""}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Topics covered, or override reasons..."
                    className="w-full min-h-[80px] bg-input/40 border text-xs font-semibold rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {sessionRecord && (
                  <Button
                    onClick={handleResetSession}
                    variant="outline"
                    size="xs"
                    type="button"
                    className="w-full text-[10px] font-black uppercase tracking-wider h-8 rounded-lg"
                  >
                    Reset Defaults
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareAttendanceModal open={showShareModal} onClose={handleCloseModal} data={shareData} />
    </div>
  )
}
