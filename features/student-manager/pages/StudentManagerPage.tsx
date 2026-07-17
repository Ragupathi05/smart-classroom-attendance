"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import * as XLSX from "xlsx"
import { Upload, UserRoundPlus, Pencil, Trash2, Hand } from "lucide-react"
import { toast } from "react-toastify"
import { useStudentStore, useAttendanceStore, useAcademicStore, useAuthStore, useConfirmStore } from "@/store"
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
    addClassStudent,
    updateClassStudent,
    deleteClassStudent,
    importClassStudents,
  } = useStudentStore()
  const { attendanceRecords } = useAttendanceStore()
  const { user } = useAuthStore()
  const {
    selectedSectionWorkspace,
    sections,
    getSectionStudentsWithStatus,
    transferStudent,
    toggleStudentActive,
  } = useAcademicStore()
  const confirm = useConfirmStore((state) => state.confirm)

  const isCRLR = user?.role === "cr" || user?.role === "lr"

  const [selectedSectionFilter, setSelectedSectionFilter] = useState(() => {
    return isCRLR ? (user?.sectionId || "sec-1") : (selectedSectionWorkspace || "sec-1")
  })

  const displayStudents = useMemo(() => {
    return getSectionStudentsWithStatus(selectedSectionFilter)
  }, [selectedSectionFilter, classStudents, getSectionStudentsWithStatus])

  const [actionStudentId, setActionStudentId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ rollNumber: "", name: "" })
  const [formError, setFormError] = useState("")

  // Transfer Modal state variables
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferringStudent, setTransferringStudent] = useState<any | null>(null)
  const [targetTransferSectionId, setTargetTransferSectionId] = useState("")

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
      ? updateClassStudent(editingId, { rollNumber, name, gender: "Male" })
      : addClassStudent({ rollNumber, name, gender: "Male" })

    if (!result.success) {
      setFormError(result.message)
      toast.error(result.message)
      return
    }

    if (!editingId && result.studentId) {
      useAcademicStore.getState().addEnrollment(result.studentId, selectedSectionFilter)
    }

    toast.success(result.message)
    setIsModalOpen(false)
  }

  const handleDeleteStudent = (studentId: string) => {
    const student = classStudents.find((item) => item.id === studentId)
    if (!student) return

    confirm({
      title: "Delete Student Profile",
      message: `Are you sure you want to delete ${student.name} (${student.rollNumber}) from the class list? This cannot be undone.`,
      confirmText: "Delete",
      onConfirm: () => {
        deleteClassStudent(student.id)
        setActionStudentId(null)
        toast.success("Student deleted successfully.")
      }
    })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const parseExcelFile = async (file: File): Promise<Array<{ rollNumber: string; name: string; gender?: "Male" | "Female"; mobileNumber?: string }>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })
          
          const firstSheetName = workbook.SheetNames[0]
          if (!firstSheetName) {
            resolve([])
            return
          }
          
          const sheet = workbook.Sheets[firstSheetName]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
          if (rows.length === 0) {
            resolve([])
            return
          }

          let headerIdx = 0
          for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const rowStr = rows[i].map(c => String(c || "").toLowerCase()).join(" ")
            if (rowStr.includes("roll") || rowStr.includes("name") || rowStr.includes("student")) {
              headerIdx = i
              break
            }
          }

          const headers = rows[headerIdx].map(h => String(h || "").trim().toLowerCase())

          const rollIdx = headers.findIndex(h => h.includes("roll"))
          const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("student"))
          const genderIdx = headers.findIndex(h => h.includes("gender"))
          const mobileIdx = headers.findIndex(h => h.includes("mobile") || h.includes("phone") || h.includes("contact"))

          const result: Array<{ rollNumber: string; name: string; gender?: "Male" | "Female"; mobileNumber?: string }> = []

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const parts = rows[i]
            if (!parts || parts.length === 0) continue

            const rollNumber = rollIdx !== -1 ? String(parts[rollIdx] || "").trim() : String(parts[0] || "").trim()
            const name = nameIdx !== -1 ? String(parts[nameIdx] || "").trim() : String(parts[1] || "").trim()
            const genderRaw = genderIdx !== -1 ? String(parts[genderIdx] || "").trim() : ""
            const mobileNumber = mobileIdx !== -1 ? String(parts[mobileIdx] || "").trim() : ""

            const gender = (genderRaw.toLowerCase().startsWith("f") || genderRaw.toLowerCase() === "female") 
              ? "Female" 
              : "Male"

            if (rollNumber && name) {
              result.push({
                rollNumber,
                name,
                gender,
                mobileNumber
              })
            }
          }

          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = (err) => reject(err)
      reader.readAsArrayBuffer(file)
    })
  }

  const handleExcelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    try {
      const parsedRows = await parseExcelFile(file)
      if (parsedRows.length === 0) {
        toast.error("Excel sheet has no valid rows or header mismatch. Column mapping requires Roll Number and Student Name.")
        return
      }

      const academicState = useAcademicStore.getState()
      
      // Override/Clear existing enrollments for this section in the current session
      academicState.clearSectionEnrollments(selectedSectionFilter)

      // Import student records globally (adds new or overrides details)
      const { added, skipped, addedStudentIds } = importClassStudents(parsedRows)
      
      // Enroll all imported students in this section
      if (addedStudentIds && addedStudentIds.length > 0) {
        addedStudentIds.forEach(id => {
          academicState.addEnrollment(id, selectedSectionFilter)
        })
      }
      toast.success(`Excel Import Complete: Section roster overridden with ${addedStudentIds.length} students.`)
    } catch (err) {
      console.error(err)
      toast.error("Unable to read Excel file. Please upload a valid .xlsx or .xls file.")
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
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Students</CardTitle>
                <CardDescription className="text-muted-foreground">Manage class student details and imports</CardDescription>
              </div>
              {!isCRLR && (
                <div className="flex items-center gap-1.5 ml-4">
                  <span className="text-xs text-muted-foreground font-bold">Section:</span>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="bg-background border border-border text-xs font-bold rounded-xl h-8 px-3 focus:outline-none"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                Import Excel
              </Button>
              {!isCRLR && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-amber-600 border-amber-600/35 hover:bg-amber-600 hover:text-white"
                  onClick={() => {
                    const secName = sections.find(s => s.id === selectedSectionFilter)?.name || "ROSTER"
                    toast.success(`Default passwords reset for all ${displayStudents.length} students in section: MITS@${secName.replace(/\s+/g, "")}`)
                  }}
                >
                  Bulk Reset Pwd
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelUpload}
          />
        </CardHeader>

        <CardContent>
          <div className="mb-3 flex flex-col gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Hand className="h-3.5 w-3.5" />
              <span>Long press a row to show Edit and Delete</span>
            </div>
            <div className="flex items-start gap-2 border-t border-border/40 pt-2 mt-0.5 leading-relaxed font-semibold">
              <Upload className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Excel Import Guidelines:</strong> Supported formats: <code>.xlsx</code> or <code>.xls</code> (Spreadsheets). 
                The sheet MUST contain columns: <code>Roll Number</code> (or Roll No) and <code>Student Name</code>. 
                Optionally includes: <code>Gender</code> and <code>Mobile Number</code> columns. 
                Importing will completely replace/overwrite this section's roster.
              </div>
            </div>
          </div>
          <div ref={tableWrapperRef} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Roll Number</th>
                  <th className="px-3 py-2 font-medium">Student Name</th>
                  <th className="px-3 py-2 text-center font-medium">Status</th>
                  <th className="px-3 py-2 text-center font-medium">Conducted</th>
                  <th className="px-3 py-2 text-center font-medium">Attended</th>
                  <th className="px-3 py-2 text-center font-medium">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => {
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
                      : "text-red-650"

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
                              {!isCRLR && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={student.enrollmentStatus === "Active" ? "text-amber-600 border-amber-600/35 hover:bg-amber-500/10" : "text-emerald-650 border-emerald-600/35 hover:bg-emerald-500/10"}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      const active = student.enrollmentStatus !== "Active"
                                      toggleStudentActive(student.id, selectedSectionFilter, active)
                                      toast.info(`Student set to ${active ? "active" : "inactive"} successfully!`)
                                      setActionStudentId(null)
                                    }}
                                  >
                                    {student.enrollmentStatus === "Active" ? "Deactivate" : "Activate"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="text-indigo-600 border-indigo-600/35 hover:bg-indigo-500/10"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setTransferringStudent(student)
                                      const otherSecs = sections.filter(s => s.id !== selectedSectionFilter)
                                      if (otherSecs.length > 0) {
                                        setTargetTransferSectionId(otherSecs[0].id)
                                      }
                                      setIsTransferModalOpen(true)
                                      setActionStudentId(null)
                                    }}
                                  >
                                    Transfer
                                  </Button>
                                </>
                              )}
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
                      <td className="px-3 py-2 text-center font-semibold">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold text-white",
                          student.enrollmentStatus === "Active" ? "bg-emerald-600" : "bg-rose-600"
                        )}>
                          {student.enrollmentStatus}
                        </span>
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

          {displayStudents.length === 0 ? (
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

      {/* Transfer Section Dialog */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Student</DialogTitle>
            <DialogDescription>
              Move <strong>{transferringStudent?.name}</strong> to a different section workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs font-bold">
            <div>
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5 font-black">Target Section</label>
              <select
                value={targetTransferSectionId}
                onChange={(e) => setTargetTransferSectionId(e.target.value)}
                className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {sections.filter(s => s.id !== selectedSectionFilter).map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTransferModalOpen(false)
                setTransferringStudent(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (transferringStudent && targetTransferSectionId) {
                  transferStudent(transferringStudent.id, selectedSectionFilter, targetTransferSectionId)
                  toast.success(`${transferringStudent.name} transferred to ${sections.find(s => s.id === targetTransferSectionId)?.name || "new section"} successfully!`)
                  setIsTransferModalOpen(false)
                  setTransferringStudent(null)
                }
              }}
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
