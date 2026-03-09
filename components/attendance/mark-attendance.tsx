"use client"

import { useState } from "react"
import { ArrowLeft, Save, Send, PencilLine } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { AttendanceSummary } from "./attendance-summary"
import { AttendanceBar } from "./attendance-bar"
import { StudentList } from "./student-list"
import { ShareAttendanceModal, type ShareAttendanceData } from "./share-attendance-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "react-toastify"

export function MarkAttendance() {
  const {
    selectedCell,
    setCurrentPage,
    submitAttendance,
    user,
    isViewingSubmittedAttendance,
    isEditMode,
    startEditingSubmittedAttendance,
    attendanceRecords,
    activeRecordId,
    students,
    appSettings,
  } = useAppStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareData, setShareData] = useState<ShareAttendanceData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const classFacultyName = selectedCell?.facultyName || "Faculty Assigned"
  const activeRecord = attendanceRecords.find((record) => record.id === activeRecordId)
  const getActorLabel = (value?: string) => value?.split(" - ")[0] || "N/A"

  const handleSaveDraft = () => {
    setIsSaving(true)
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
        date: new Date().toISOString().split("T")[0],
        presentCount,
        permissionCount,
        absentCount: absentStudents.length,
        absentStudents,
      }

      submitAttendance(selectedCell)

      if (isViewingSubmittedAttendance && isEditMode) {
        toast.success("Attendance updated successfully")
        return
      }

      toast.success("Attendance submitted successfully!")
      setShareData(reportData)
      setShowShareModal(true)
    } catch {
      toast.error("Failed to submit attendance")
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage("dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
            <p className="text-muted-foreground">
              {selectedCell.subjectName} ({selectedCell.subjectCode}) - {selectedCell.timeSlot}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Class</p>
            <p className="font-medium text-foreground">{user?.className}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium text-foreground">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2">
            <p className="text-xs text-muted-foreground">Faculty</p>
            <p className="font-medium text-foreground">{classFacultyName}</p>
          </div>
        </div>
      </div>

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
      <div className="flex justify-end gap-4">
        {isViewingSubmittedAttendance && !isEditMode ? (
          <Button onClick={startEditingSubmittedAttendance}>
            <PencilLine className="mr-2 h-4 w-4" />
            Edit Attendance
          </Button>
        ) : null}

        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving || (isViewingSubmittedAttendance && !isEditMode)}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Draft"}
        </Button>

        <Button onClick={handleSubmit} disabled={isViewingSubmittedAttendance && !isEditMode}>
          <Send className="mr-2 h-4 w-4" />
          {isViewingSubmittedAttendance && isEditMode ? "Update Attendance" : "Submit Attendance"}
        </Button>
      </div>

      {/* Share Modal */}
      <ShareAttendanceModal open={showShareModal} onClose={handleCloseModal} data={shareData} />
    </div>
  )
}
