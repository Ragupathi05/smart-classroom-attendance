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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-secondary rounded-xl shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-foreground">Attendance Detail</h1>
            <p className="text-xs font-bold text-muted-foreground truncate uppercase tracking-wider mt-0.5">
              {selectedRecord.subject} ({selectedRecord.subjectCode}) • {formatDate(selectedRecord.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={onShare} className="flex-1 md:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider">
            <Share2 className="mr-1.5 h-4 w-4" />
            Share Attendance
          </Button>
          {!isEditMode ? (
            <Button onClick={onEditToggle} disabled={!canEdit} className="flex-1 md:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider">
              <PencilLine className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <Button onClick={onSave} className="flex-1 md:flex-initial h-10 text-xs font-bold rounded-xl uppercase tracking-wider">
              <Save className="mr-1.5 h-4 w-4" />
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
            <p className="text-xs text-muted-foreground">
              {selectedRecord.isEdited ? "Last Modified" : "Submitted"}
            </p>
            <p className="font-semibold text-foreground text-sm">
              {formatDateTime(selectedRecord.editedAt || selectedRecord.submittedAt)}
            </p>
            <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
              by {(() => {
                const author = selectedRecord.isEdited ? selectedRecord.editedBy : selectedRecord.submittedBy
                if (!author) return selectedRecord.isEdited ? "HOD" : "CR"
                const lower = author.toLowerCase()
                if (lower.includes("cr")) return "CR"
                if (lower.includes("lr")) return "LR"
                if (lower.includes("hod")) return "HOD"
                if (lower.includes("faculty")) return "Faculty"
                return author
              })()}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Edit Window</p>
            <p className={cn("font-semibold", canEdit ? "text-green-600" : "text-red-600")}>
              {canEdit ? "Allowed" : "Expired"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 grid-cols-3 sm:gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{counts.present}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{counts.permission}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Permission</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{counts.absent}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Full Student Attendance List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-border scrollbar-thin">
            <div className="divide-y divide-border min-w-[480px] md:min-w-full">
              {/* Header */}
              <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 bg-muted px-4 py-3 items-center">
                <div className="col-span-3 md:col-span-2 text-xs md:text-sm font-semibold text-muted-foreground">Roll No.</div>
                <div className="col-span-5 md:col-span-4 text-xs md:text-sm font-semibold text-muted-foreground">Student Name</div>
                <div className="col-span-4 md:col-span-6 flex justify-end md:justify-start gap-4 md:gap-0 text-xs md:text-sm font-semibold text-muted-foreground">
                  <span className="md:hidden text-green-600 font-extrabold w-6 text-center">P</span>
                  <span className="md:hidden text-yellow-600 font-extrabold w-6 text-center">PR</span>
                  <span className="md:hidden text-red-500 font-extrabold w-6 text-center">A</span>
                  <span className="hidden md:inline">Attendance Status</span>
                </div>
              </div>

              {/* Student Rows */}
              {draftStudents.map((student, index) => (
                <div
                  key={student.id}
                  className={cn(
                    "grid grid-cols-12 gap-2 items-center px-4 py-2.5 transition duration-200 hover:bg-gray-50",
                    index % 2 === 0 ? "bg-card" : "bg-muted/30"
                  )}
                >
                  {/* Roll Number */}
                  <div className="col-span-3 md:col-span-2 font-mono text-xs md:text-sm text-foreground truncate">
                    {student.rollNumber}
                  </div>

                  {/* Student Name */}
                  <div className="col-span-5 md:col-span-4 text-xs md:text-sm font-bold text-foreground truncate pr-1">
                    {student.name}
                  </div>

                  {/* Radio Group */}
                  <div className="col-span-4 md:col-span-6">
                    <RadioGroup
                      value={student.status}
                      onValueChange={(value) => onStudentStatusChange(student.id, value as AttendanceStatus)}
                      className="flex justify-end md:justify-start gap-4 md:gap-6"
                      disabled={!isEditMode || !canEdit}
                    >
                      {statusOptions.map((option) => (
                        <div key={option.value} className="flex items-center gap-1.5">
                          <RadioGroupItem
                            value={option.value}
                            id={`${student.id}-${option.value}`}
                            className={cn(
                              "h-5 w-5 border-muted-foreground cursor-pointer shrink-0",
                              student.status === option.value && option.value === "present" && "border-green-600 text-green-600 bg-green-50 dark:bg-green-950/20",
                              student.status === option.value && option.value === "permission" && "border-warning text-warning bg-yellow-50 dark:bg-yellow-950/20",
                              student.status === option.value && option.value === "absent" && "border-destructive text-destructive bg-rose-50 dark:bg-rose-955/20"
                        )}
                          />
                          <Label
                            htmlFor={`${student.id}-${option.value}`}
                            className={cn(
                              "hidden md:inline cursor-pointer text-sm font-semibold select-none",
                              (!isEditMode || !canEdit) && "cursor-not-allowed opacity-80",
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
