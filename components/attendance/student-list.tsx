"use client"

import { useAppStore, type AttendanceStatus } from "@/lib/store"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface StudentListProps {
  readOnly?: boolean
}

export function StudentList({ readOnly = false }: StudentListProps) {
  const { students, updateStudentStatus } = useAppStore()

  const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: "present", label: "Present", color: "text-green-600" },
    { value: "permission", label: "Permission", color: "text-warning" },
    { value: "absent", label: "Absent", color: "text-destructive" },
  ]

  return (
    <ScrollArea className="h-[400px] rounded-lg border border-border">
      <div className="divide-y divide-border">
        {/* Header */}
        <div className="sticky top-0 z-10 grid grid-cols-12 gap-4 bg-muted px-4 py-3">
          <div className="col-span-2 text-sm font-medium text-muted-foreground">Roll No.</div>
          <div className="col-span-4 text-sm font-medium text-muted-foreground">Student Name</div>
          <div className="col-span-6 text-sm font-medium text-muted-foreground">Attendance Status</div>
        </div>

        {/* Student Rows */}
        {students.map((student, index) => (
          <div
            key={student.id}
            className={cn(
              "grid grid-cols-12 items-center gap-4 px-4 py-3 transition-colors",
              index % 2 === 0 ? "bg-card" : "bg-muted/30"
            )}
          >
            <div className="col-span-2">
              <span className="font-mono text-sm text-foreground">{student.rollNumber}</span>
            </div>
            <div className="col-span-4">
              <span className="text-sm font-medium text-foreground">{student.name}</span>
            </div>
            <div className="col-span-6">
              <RadioGroup
                value={student.status}
                onValueChange={(value) => updateStudentStatus(student.id, value as AttendanceStatus)}
                className="flex gap-6"
                disabled={readOnly}
              >
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`${student.id}-${option.value}`}
                      className={cn(
                        "border-muted-foreground",
                        student.status === option.value && option.value === "present" && "border-green-600 text-green-600",
                        student.status === option.value && option.value === "permission" && "border-warning text-warning",
                        student.status === option.value && option.value === "absent" && "border-destructive text-destructive"
                      )}
                    />
                    <Label
                      htmlFor={`${student.id}-${option.value}`}
                      className={cn(
                        "cursor-pointer text-sm",
                        readOnly && "cursor-not-allowed opacity-80",
                        student.status === option.value ? option.color : "text-muted-foreground"
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
  )
}
