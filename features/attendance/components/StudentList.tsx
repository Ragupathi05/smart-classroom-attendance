"use client"

import { useState } from "react"
import { useAttendanceStore } from "@/store"
import type { AttendanceStatus } from "@/types"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface StudentListProps {
  readOnly?: boolean
}

export function StudentList({ readOnly = false }: StudentListProps) {
  const { students, updateStudentStatus } = useAttendanceStore()
  const [filter, setFilter] = useState<"all" | "absent" | "permission">("all")

  const totalStudents = students.length
  const absentCount = students.filter((student) => student.status === "absent").length
  const permissionCount = students.filter((student) => student.status === "permission").length

  const filteredStudents = students.filter((student) => {
    if (filter === "all") return true
    return student.status === filter
  })

  const sortedStudents = [...filteredStudents].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))

  const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
    { value: "present", label: "Present", color: "text-green-600" },
    { value: "permission", label: "Permission", color: "text-warning" },
    { value: "absent", label: "Absent", color: "text-destructive" },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition",
            filter === "all"
              ? "bg-gray-400 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          )}
        >
          All ({totalStudents})
        </button>
        <button
          type="button"
          onClick={() => setFilter("absent")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition",
            filter === "absent"
              ? "bg-red-500 text-white"
              : "bg-red-100 text-red-700 hover:bg-red-200"
          )}
        >
          Absent ({absentCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("permission")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium transition",
            filter === "permission"
              ? "bg-yellow-500 text-white"
              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          )}
        >
          Permission ({permissionCount})
        </button>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-lg border border-border scrollbar-thin">
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
          {sortedStudents.map((student, index) => (
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
                  onValueChange={(value) => updateStudentStatus(student.id, value as AttendanceStatus)}
                  className="flex justify-end md:justify-start gap-4 md:gap-6"
                  disabled={readOnly}
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

          {filteredStudents.length === 0 ? (
            <div className="py-6 text-center text-gray-500">
              No students found for this filter.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
