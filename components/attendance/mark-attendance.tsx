"use client"

import { useState } from "react"
import { ArrowLeft, Save, Send } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { AttendanceSummary } from "./attendance-summary"
import { AttendanceBar } from "./attendance-bar"
import { StudentList } from "./student-list"
import { ShareAttendanceModal } from "./share-attendance-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function MarkAttendance() {
  const { selectedCell, setCurrentPage, submitAttendance, user } = useAppStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSaveDraft = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Draft Saved",
        description: "Attendance draft has been saved successfully.",
      })
    }, 500)
  }

  const handleSubmit = () => {
    if (!selectedCell) return
    submitAttendance(selectedCell)
    setShowShareModal(true)
  }

  const handleCloseModal = () => {
    setShowShareModal(false)
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
        </div>
      </div>

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
          <StudentList />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Draft"}
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="mr-2 h-4 w-4" />
          Submit Attendance
        </Button>
      </div>

      {/* Share Modal */}
      <ShareAttendanceModal open={showShareModal} onClose={handleCloseModal} />
    </div>
  )
}
