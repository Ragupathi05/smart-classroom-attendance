"use client"

import { ArrowLeft, PencilLine, Save, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { AttendanceRecord, AttendanceStatus, Student } from "@/types"

interface AttendanceHistoryDetailProps {
  selectedRecord: AttendanceRecord
  draftStudents: Student[]
  isEditMode: boolean
  canEdit: boolean
  counts: { present: number; permission: number; absent: number }
  statusOptions: { value: AttendanceStatus; label: string; colorClass: string }[]
  onBack: () => void
  onShare: () => void
  onEditToggle: () => void
  onSave: () => void
  onStudentStatusChange: (studentId: string, status: AttendanceStatus) => void
  formatDate: (dateStr: string) => string
  formatDateTime: (dateStr?: string) => string
}

export function AttendanceHistoryDetail({
  selectedRecord,
  draftStudents,
  isEditMode,
  canEdit,
  counts,
  statusOptions,
  onBack,
  onShare,
  onEditToggle,
  onSave,
  onStudentStatusChange,
  formatDate,
  formatDateTime,
}: AttendanceHistoryDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
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
          <Button variant="outline" onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Attendance
          </Button>
          {!isEditMode ? (
            <Button onClick={onEditToggle} disabled={!canEdit}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <Button onClick={onSave}>
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
                      onValueChange={(value) => onStudentStatusChange(student.id, value as AttendanceStatus)}
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
