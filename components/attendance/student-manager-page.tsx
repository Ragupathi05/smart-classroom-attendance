"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Upload, UserRoundPlus, Pencil, Trash2, Hand } from "lucide-react"
import { toast } from "react-toastify"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const LONG_PRESS_MS = 500

export function StudentManagerPage() {
  const {
    classStudents,
    attendanceRecords,
    addClassStudent,
    updateClassStudent,
    deleteClassStudent,
    importClassStudents,
  } = useAppStore()

  const [actionStudentId, setActionStudentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ rollNumber: "", name: "" })
  const [formError, setFormError] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!tableWrapperRef.current) return
      const target = event.target as Node | null
      if (!target) return
      if (!tableWrapperRef.current.contains(target)) {
        setActionStudentId(null)
      }
    }

    document.addEventListener("mousedown", handleOutsidePress)
    document.addEventListener("touchstart", handleOutsidePress)

    return () => {
      document.removeEventListener("mousedown", handleOutsidePress)
      document.removeEventListener("touchstart", handleOutsidePress)
    }
  }, [])

  const resetForm = () => {
    setForm({ rollNumber: "", name: "" })
    setFormError("")
  }

  const openAddModal = () => {
    setEditingId(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (studentId: string) => {
    const student = classStudents.find((item) => item.id === studentId)
    if (!student) return

    setEditingId(student.id)
    setForm({ rollNumber: student.rollNumber, name: student.name })
    setFormError("")
    setActionStudentId(null)
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const rollNumber = form.rollNumber.trim()
    const name = form.name.trim()

    if (!rollNumber || !name) {
      setFormError("Roll number and student name are required.")
      return
    }

    const result = editingId
      ? updateClassStudent(editingId, { rollNumber, name })
      : addClassStudent({ rollNumber, name })

    if (!result.success) {
      setFormError(result.message)
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    setIsModalOpen(false)
  }

  const handleDeleteStudent = (studentId: string) => {
    const student = classStudents.find((item) => item.id === studentId)
    if (!student) return

    const confirmed = window.confirm(
      `Delete ${student.name} (${student.rollNumber}) from class list?`
    )

    if (!confirmed) return

    deleteClassStudent(student.id)
    setActionStudentId(null)
    toast.success("Student deleted successfully.")
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const parseCsvRows = (content: string): Array<{ rollNumber: string; name: string }> => {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [rollNumber = "", ...nameParts] = line.split(",")
        return {
          rollNumber: rollNumber.trim(),
          name: nameParts.join(",").trim(),
        }
      })
      .filter((row) => {
        const roll = row.rollNumber.toLowerCase()
        const name = row.name.toLowerCase()
        const isHeader =
          (roll === "roll_no" || roll === "rollnumber" || roll === "roll_number") &&
          (name === "name" || name === "student_name")
        return !isHeader
      })
  }

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    try {
      const content = await file.text()
      const parsedRows = parseCsvRows(content)
      if (parsedRows.length === 0) {
        toast.error("CSV has no valid rows. Use format: roll_no,name")
        return
      }

      const { added, skipped } = importClassStudents(parsedRows)
      toast.success(`Import completed: ${added} added, ${skipped} skipped.`)
    } catch {
      toast.error("Unable to read CSV file.")
    }
  }

  const startLongPress = (studentId: string) => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
    }

    longPressTimer.current = window.setTimeout(() => {
      setActionStudentId(studentId)
    }, LONG_PRESS_MS)
  }

  const clearLongPress = () => {
    if (!longPressTimer.current) return
    window.clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const attendanceStatsByStudent = useMemo(() => {
    const stats = new Map<string, { total: number; attended: number }>()

    for (const record of attendanceRecords) {
      for (const student of record.students) {
        const current = stats.get(student.id) || { total: 0, attended: 0 }
        current.total += 1
        if (student.status !== "absent") {
          current.attended += 1
        }
        stats.set(student.id, current)
      }
    }

    return stats
  }, [attendanceRecords])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Student Manager</h1>
        <p className="text-muted-foreground">Manage class student list used in attendance marking.</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Students</CardTitle>
              <CardDescription className="text-muted-foreground">Manage class student details and imports</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={openAddModal}
                className="bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                <UserRoundPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
              <Button type="button" variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
        </CardHeader>

        <CardContent>
          <div className="mb-3 flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Hand className="h-3.5 w-3.5" />
            <span>Long press a row to show Edit and Delete</span>
          </div>
          <div ref={tableWrapperRef} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Roll Number</th>
                  <th className="px-3 py-2 font-medium">Student Name</th>
                  <th className="px-3 py-2 text-center font-medium">Conducted</th>
                  <th className="px-3 py-2 text-center font-medium">Attended</th>
                  <th className="px-3 py-2 text-center font-medium">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student) => {
                  const showActions = actionStudentId === student.id
                  const stats = attendanceStatsByStudent.get(student.id) || { total: 0, attended: 0 }
                  const attendancePercent = stats.total > 0
                    ? Math.round((stats.attended / stats.total) * 100)
                    : 0
                  const percentageColorClass =
                    attendancePercent >= 85
                      ? "text-green-600"
                      : attendancePercent >= 75
                      ? "text-amber-600"
                      : "text-red-600"

                  return (
                    <tr
                      key={student.id}
                      onMouseDown={() => startLongPress(student.id)}
                      onMouseUp={clearLongPress}
                      onMouseLeave={clearLongPress}
                      onTouchStart={() => startLongPress(student.id)}
                      onTouchEnd={clearLongPress}
                      className={cn(
                        "cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50",
                        showActions && "bg-primary/10"
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-foreground">{student.rollNumber}</td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        <div className="flex items-center justify-between gap-3">
                          <span>{student.name}</span>
                          {showActions ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openEditModal(student.id)
                                }}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDeleteStudent(student.id)
                                }}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-foreground">{stats.total}</td>
                      <td className="px-3 py-2 text-center font-medium text-foreground">{stats.attended}</td>
                      <td className={cn("px-3 py-2 text-center font-semibold", percentageColorClass)}>
                        {attendancePercent}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {classStudents.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              No students found. Add students manually or import CSV.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>Enter roll number and student name.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Roll Number</label>
              <input
                value={form.rollNumber}
                onChange={(e) => {
                  setFormError("")
                  setForm((prev) => ({ ...prev, rollNumber: e.target.value }))
                }}
                placeholder="Enter roll number"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Student Name</label>
              <input
                value={form.name}
                onChange={(e) => {
                  setFormError("")
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }}
                placeholder="Enter student name"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {formError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
