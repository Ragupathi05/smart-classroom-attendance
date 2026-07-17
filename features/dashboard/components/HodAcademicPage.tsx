"use client"

import React, { useState, useMemo, useEffect } from "react"
import * as XLSX from "xlsx"
import {
  Calendar,
  Layers,
  Users,
  Eye,
  Plus,
  Trash2,
  Pencil,
  ArrowLeft,
  Search,
  Upload,
  UserPlus,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle,
  FolderOpen,
  Sparkles,
  GitBranch,
  BookOpen,
  Archive,
  Lock,
  X,
} from "lucide-react"
import { useAcademicStore, useStudentStore, useTimetableStore, useConfirmStore } from "@/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"

export function HodAcademicPage() {
  const {
    batches,
    programs,
    sections,
    facultyList,
    selectedSectionWorkspace,
    setSelectedSectionWorkspace,
    currentBatchId,
    viewingBatchId,
    setViewingBatchId,
    addBatch,
    updateBatch,
    deleteBatch,
    addSection,
    deleteSection,
    promoteBatch,
    currentSessionId,
    getSectionRoster,
    academicSessions,
    addAcademicSession,
    setSessionActive,
  } = useAcademicStore()

  const { classStudents, addClassStudent, updateClassStudent, deleteClassStudent, importClassStudents } = useStudentStore()
  const confirm = useConfirmStore((state) => state.confirm)
  const timetables = useTimetableStore((state) => state.timetables)

  // Auto-healing migration for mismatching sections (e.g. from old version bugs)
  useEffect(() => {
    let changed = false
    const updatedSections = sections.map((sec) => {
      const parentBatch = batches.find((b) => b.id === sec.batchId)
      if (!parentBatch && batches.length > 0) {
        // Section has no parent batch or its parent batch was deleted/empty.
        // Let's re-map its batchId to the first batch matching its year level, or the first batch in the list.
        const matchingBatch = batches.find((b) => b.currentYearLevel === sec.year) || batches[0]
        if (matchingBatch) {
          changed = true
          return { ...sec, batchId: matchingBatch.id }
        }
      } else if (parentBatch && parentBatch.currentYearLevel !== sec.year) {
        // Mismatch found (e.g. 1st Year section in a 3rd Year batch folder).
        // Let's re-map its batchId to a batch whose year level matches this section's year level.
        const matchingBatch = batches.find((b) => b.currentYearLevel === sec.year)
        if (matchingBatch) {
          changed = true
          return { ...sec, batchId: matchingBatch.id }
        }
      }
      return sec
    })

    if (changed) {
      useAcademicStore.setState({ sections: updatedSections })
      toast.success("Database self-healed: misaligned classroom sections re-mapped to correct batch folders!")
    }
  }, [sections, batches])

  // Auto-initialize batch selection if empty but batches exist
  useEffect(() => {
    if (batches.length > 0 && !viewingBatchId) {
      setViewingBatchId(batches[0].id)
    }
  }, [batches, viewingBatchId, setViewingBatchId])

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"batches" | "programs" | "sections" | "sessions">("batches")
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "students" | "faculty" | "timetable">("overview")

  // Sessions settings
  const [newSessionName, setNewSessionName] = useState("")

  const handleCreateSessionClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSessionName.trim()) return
    if (!/^\d{4}-\d{4}$/.test(newSessionName.trim())) {
      toast.error("Session name must be in the format YYYY-YYYY (e.g. 2026-2027)")
      return
    }
    addAcademicSession(newSessionName.trim())
    setNewSessionName("")
    toast.success("Academic Session created successfully!")
  }

  const handleSetSessionActive = (id: string) => {
    setSessionActive(id)
    toast.success("Active Academic Session updated!")
  }

  // Modals / forms states
  const [showAddBatch, setShowAddBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState("")
  const [newBatchStart, setNewBatchStart] = useState(2023)
  const [newBatchEnd, setNewBatchEnd] = useState(2027)
  const [newBatchYear, setNewBatchYear] = useState("3rd Year")
  const [newBatchSem, setNewBatchSem] = useState<"Odd" | "Even">("Odd")

  // Edit Batch States
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [editBatchName, setEditBatchName] = useState("")
  const [editBatchStart, setEditBatchStart] = useState(2023)
  const [editBatchEnd, setEditBatchEnd] = useState(2027)
  const [editBatchYear, setEditBatchYear] = useState("3rd Year")
  const [editBatchSem, setEditBatchSem] = useState<"Odd" | "Even">("Odd")
  const [editBatchStatus, setEditBatchStatus] = useState<"ACTIVE" | "INACTIVE" | "GRADUATED">("ACTIVE")

  const handleStartEditBatch = (batch: any) => {
    setEditingBatchId(batch.id)
    setEditBatchName(batch.name)
    setEditBatchStart(batch.startYear)
    setEditBatchEnd(batch.endYear)
    setEditBatchYear(batch.currentYearLevel)
    setEditBatchSem(batch.currentSemester)
    setEditBatchStatus(batch.status)
  }

  const handleSaveEditBatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBatchId) return
    updateBatch(editingBatchId, {
      name: editBatchName,
      startYear: Number(editBatchStart),
      endYear: Number(editBatchEnd),
      currentYearLevel: editBatchYear,
      currentSemester: editBatchSem,
      status: editBatchStatus
    })
    setEditingBatchId(null)
    toast.success("Batch configuration updated successfully!")
  }

  const handleDeleteBatchClick = (id: string, name: string) => {
    confirm({
      title: "Delete Cohort Batch",
      message: `Are you absolutely sure you want to delete the batch "${name}"? This will delete all mapped classroom sections and cannot be undone.`,
      confirmText: "Delete",
      onConfirm: () => {
        deleteBatch(id)
        toast.success("Batch and all mapped sections deleted successfully.")
      }
    })
  }

  const [showAddSection, setShowAddSection] = useState(false)
  const [secName, setSecName] = useState("CSE")
  const [secYear, setSecYear] = useState("3rd Year")
  const [secSem, setSecSem] = useState("Odd")
  const [secNameLetter, setSecNameLetter] = useState("A")

  // Student Manager variables
  const [searchStudentQuery, setSearchStudentQuery] = useState("")
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentRoll, setNewStudentRoll] = useState("")
  const [newStudentGender, setNewStudentGender] = useState<"Male" | "Female">("Male")
  const [newStudentMobile, setNewStudentMobile] = useState("")
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [isEditingRoster, setIsEditingRoster] = useState(false)
  const [editedRosterValues, setEditedRosterValues] = useState<Record<string, { rollNumber: string; name: string; gender: "Male" | "Female"; mobileNumber: string }>>({})

  const updateEditedRosterField = (studentId: string, field: "name" | "rollNumber" | "gender" | "mobileNumber", value: string) => {
    setEditedRosterValues((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const handleSaveRosterEdits = () => {
    Object.entries(editedRosterValues).forEach(([id, values]) => {
      updateClassStudent(id, values)
    })
    setIsEditingRoster(false)
    setEditedRosterValues({})
    toast.success("Roster changes saved successfully!")
  }

  // Promotion Wizard state
  const [showPromotionWizard, setShowPromotionWizard] = useState(false)
  const [promotionStep, setPromotionStep] = useState(1)
  
  // Selection of source batch
  const [promotionSourceBatchId, setPromotionSourceBatchId] = useState("")
  const [targetSemester, setTargetSemester] = useState<"Odd" | "Even">("Even")
  const [retainFaculty, setRetainFaculty] = useState(true)
  const [retainTimetable, setRetainTimetable] = useState(true)
  const [promotionProgress, setPromotionProgress] = useState(0)

  // Excel File upload simulation
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelPreview, setExcelPreview] = useState<Array<{ rollNumber: string; name: string }> | null>(null)

  const activeViewingBatch = useMemo(() => {
    return batches.find(b => b.id === viewingBatchId) || batches[0]
  }, [batches, viewingBatchId])

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionWorkspace) || null
  }, [sections, selectedSectionWorkspace])

  // Is viewing a completely graduated/archived batch?
  const isBatchArchived = useMemo(() => {
    return activeViewingBatch?.status === "GRADUATED"
  }, [activeViewingBatch])

  // Filter sections belonging to viewingBatchId and currentSessionId
  const filteredSections = useMemo(() => {
    return sections.filter((s) => s.batchId === viewingBatchId && (s.academicSessionId === currentSessionId || !s.academicSessionId))
  }, [sections, viewingBatchId, currentSessionId])

  // Batches Actions
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBatchName.trim()) return
    addBatch({
      name: newBatchName,
      startYear: Number(newBatchStart),
      endYear: Number(newBatchEnd),
      currentYearLevel: newBatchYear,
      currentSemester: newBatchSem,
      status: "ACTIVE",
    })
    setNewBatchName("")
    setShowAddBatch(false)
    toast.success("Student cohort batch configured successfully!")
  }

  // Convert year level to Roman numeral for consistent prefix naming
  const getRomanYear = (year: string) => {
    if (year.includes("1st")) return "I"
    if (year.includes("2nd")) return "II"
    if (year.includes("3rd")) return "III"
    if (year.includes("4th")) return "IV"
    return year
  }

  // Section Actions
  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!secName.trim()) return

    if (!viewingBatchId) {
      toast.error("Please configure and select a cohort batch (Academic Year) first!")
      return
    }

    if (!currentSessionId) {
      toast.error("Please configure and select an active Academic Session first!")
      return
    }

    const romanYear = getRomanYear(secYear)
    const proposedName = `${romanYear} ${secName} ${secNameLetter}`

    // Prevent duplicate section creation in the same batch
    const exists = sections.some(
      (s) => s.batchId === viewingBatchId && s.name.toLowerCase() === proposedName.toLowerCase()
    )
    if (exists) {
      toast.error(`A section named "${proposedName}" already exists in this batch!`)
      return
    }

    addSection({
      name: proposedName,
      year: secYear,
      semester: secSem,
      sectionName: secNameLetter,
      studentCount: 70,
      crName: "To be assigned",
      lrName: "To be assigned",
      facultyCount: 5,
      status: "Active",
      batchId: viewingBatchId,
      academicSessionId: currentSessionId
    })
    setSecName("CSE")
    setShowAddSection(false)
    toast.success("Section created successfully!")
  }

  // Student Actions
  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isBatchArchived) return
    if (!newStudentName.trim() || !newStudentRoll.trim()) return
    
    if (editingStudentId) {
      const res = updateClassStudent(editingStudentId, { 
        rollNumber: newStudentRoll, 
        name: newStudentName, 
        gender: newStudentGender,
        mobileNumber: newStudentMobile
      })
      if (res.success) {
        toast.success(res.message)
        setNewStudentName("")
        setNewStudentRoll("")
        setNewStudentGender("Male")
        setNewStudentMobile("")
        setEditingStudentId(null)
        setShowAddStudent(false)
      } else {
        toast.error(res.message)
      }
    } else {
      const res = addClassStudent({ 
        rollNumber: newStudentRoll, 
        name: newStudentName, 
        gender: newStudentGender,
        mobileNumber: newStudentMobile
      })
      if (res.success) {
        toast.success(res.message)
        setNewStudentName("")
        setNewStudentRoll("")
        setNewStudentGender("Male")
        setNewStudentMobile("")
        setShowAddStudent(false)
      } else {
        toast.error(res.message)
      }
    }
  }

  // Excel upload parser
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setExcelFile(file)
      try {
        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })
            const firstSheetName = workbook.SheetNames[0]
            if (!firstSheetName) {
              toast.error("Excel sheet is empty")
              return
            }
            const sheet = workbook.Sheets[firstSheetName]
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
            if (rows.length === 0) {
              toast.error("Excel sheet is empty")
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

            const parsed: any[] = []
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
                parsed.push({
                  rollNumber,
                  name,
                  gender,
                  mobileNumber
                })
              }
            }

            setExcelPreview(parsed)
            toast.success(`Excel parsed successfully! Found ${parsed.length} students.`)
          } catch (err) {
            console.error(err)
            toast.error("Unable to parse Excel file.")
          }
        }
        reader.readAsArrayBuffer(file)
      } catch (err) {
        console.error(err)
        toast.error("Unable to read file.")
      }
    }
  }

  const handleImportExcelSubmit = () => {
    if (!excelPreview || isBatchArchived) return
    const academicState = useAcademicStore.getState()
    if (selectedSectionWorkspace) {
      academicState.clearSectionEnrollments(selectedSectionWorkspace)
    }
    const res = importClassStudents(excelPreview)
    if (res.addedStudentIds && res.addedStudentIds.length > 0 && selectedSectionWorkspace) {
      res.addedStudentIds.forEach(id => {
        academicState.addEnrollment(id, selectedSectionWorkspace)
      })
    }
    toast.success(`Import completed successfully: Roster overridden with ${res.addedStudentIds.length} students.`)
    setExcelFile(null)
    setExcelPreview(null)
  }

  // Filter students based on active section and search query
  const filteredStudents = useMemo(() => {
    const roster = selectedSectionWorkspace ? getSectionRoster(selectedSectionWorkspace) : []
    if (!searchStudentQuery.trim()) return roster
    const q = searchStudentQuery.toLowerCase()
    return roster.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q))
  }, [getSectionRoster, selectedSectionWorkspace, searchStudentQuery, sections])

  // Filter faculty assigned to the active section based on the section's timetable
  const assignedFaculty = useMemo(() => {
    if (!selectedSectionWorkspace) return []
    const cells = timetables[selectedSectionWorkspace] || []
    const assignedNames = Array.from(new Set(cells.map(c => c.facultyName?.trim().toLowerCase()).filter(Boolean)))
    return facultyList.filter((f) => {
      const fName = f.name?.trim().toLowerCase()
      const fCode = f.code?.trim().toLowerCase()
      return assignedNames.some(name => name.includes(fCode) || name.includes(fName) || fName.includes(name))
    })
  }, [facultyList, selectedSectionWorkspace, timetables])

  // Promotion Executor
  const handleExecuteBatchPromotion = () => {
    if (!promotionSourceBatchId) {
      toast.error("Please select a batch to promote")
      return
    }

    setPromotionStep(4)
    let prog = 0
    const interval = setInterval(() => {
      prog += 25
      setPromotionProgress(prog)
      if (prog >= 100) {
        clearInterval(interval)
        promoteBatch(promotionSourceBatchId, { targetSemester, retainFaculty, retainTimetable })
        setPromotionStep(5)
      }
    }, 500)
  }

  const handleLaunchWizard = () => {
    const firstActive = batches.find(b => b.status === "ACTIVE")
    if (firstActive) {
      setPromotionSourceBatchId(firstActive.id)
      setTargetSemester(firstActive.currentSemester === "Odd" ? "Even" : "Odd")
    }
    setPromotionStep(1)
    setShowPromotionWizard(true)
  }

  const selectedSourceBatch = useMemo(() => {
    return batches.find(b => b.id === promotionSourceBatchId) || null
  }, [batches, promotionSourceBatchId])

  const promotionSourceSections = useMemo(() => {
    if (!promotionSourceBatchId) return []
    return sections.filter((s) => s.batchId === promotionSourceBatchId && (s.academicSessionId === currentSessionId || !s.academicSessionId))
  }, [sections, promotionSourceBatchId, currentSessionId])

  // --- Sub-View: Section Workspace ---
  if (activeSection) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSectionWorkspace(null)} className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <span>Section Workspace</span>
                <span>•</span>
                <span className="text-primary font-black">{activeSection.year}</span>
              </div>
              <h1 className="text-2xl font-black text-foreground mt-0.5">{activeSection.name}</h1>
            </div>
          </div>

          {isBatchArchived && (
            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-none font-bold uppercase py-1 px-3 flex items-center gap-1.5 rounded-lg shrink-0">
              <Lock className="h-3.5 w-3.5" /> Read-Only (Graduated Batch)
            </Badge>
          )}
        </div>

        {/* Overview Stats Row */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Total Students", value: selectedSectionWorkspace ? getSectionRoster(selectedSectionWorkspace).length : 0, icon: Users, cardClass: "stats-card-indigo", iconColor: "text-indigo-650 dark:text-indigo-400" },
            { label: "Assigned Faculty", value: assignedFaculty.length, icon: Layers, cardClass: "stats-card-indigo", iconColor: "text-indigo-650 dark:text-indigo-400" },
            { label: "Subjects taught", value: assignedFaculty.length > 0 ? Array.from(new Set(assignedFaculty.flatMap(f => f.subjects))).length : 0, icon: BookOpen, cardClass: "stats-card-amber", iconColor: "text-amber-600 dark:text-amber-400" },
            { label: "Overall Attendance", value: "92%", icon: TrendingUp, cardClass: "stats-card-emerald", iconColor: "text-emerald-650 dark:text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className={cn("rounded-2xl p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] shadow-sm bg-card/65", stat.cardClass)}>
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase font-black tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/90 shadow-sm border border-border/40">
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
            </div>
          ))}
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-border gap-2">
          {[
            { id: "overview", label: "Overview" },
            { id: "students", label: "Student Management" },
            { id: "faculty", label: "Faculty Directory" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setWorkspaceTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-150 -mb-[2px]",
                workspaceTab === tab.id
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {workspaceTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Class Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="bg-secondary/25 p-3 rounded-xl border">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Class Representative (CR)</p>
                    <p className="text-foreground text-sm font-bold mt-1">{activeSection.crName}</p>
                  </div>
                  <div className="bg-secondary/25 p-3 rounded-xl border">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Ladies Representative (LR)</p>
                    <p className="text-foreground text-sm font-bold mt-1">{activeSection.lrName}</p>
                  </div>
                  <div className="bg-secondary/25 p-3 rounded-xl border">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Academic Semester</p>
                    <p className="text-foreground text-sm font-bold mt-1">{activeSection.semester} Sem</p>
                  </div>
                  <div className="bg-secondary/25 p-3 rounded-xl border">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Roster Status</p>
                    <p className="text-foreground text-sm font-bold mt-1">Verified (Ready)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Admin Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => setWorkspaceTab("students")} className="text-xs font-bold rounded-xl w-full" size="sm">
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Browse Student Roster
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {workspaceTab === "students" && (
          <Card className="border-border/60 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-border/50 flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or roll..."
                  value={searchStudentQuery}
                  onChange={(e) => setSearchStudentQuery(e.target.value)}
                  className="pl-9 h-10 text-xs font-semibold rounded-xl bg-input/40"
                />
              </div>
              {!isBatchArchived && (
                <div className="flex gap-2.5">
                  {isEditingRoster ? (
                    <>
                      <Button
                        onClick={handleSaveRosterEdits}
                        className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                        size="sm"
                      >
                        <CheckCircle className="mr-1.5 h-4 w-4" /> Save Changes
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingRoster(false)
                          setEditedRosterValues({})
                        }}
                        variant="outline"
                        className="text-xs font-bold rounded-xl"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          const initial: Record<string, { rollNumber: string; name: string; gender: "Male" | "Female"; mobileNumber: string }> = {}
                          filteredStudents.forEach((student) => {
                            initial[student.id] = {
                              rollNumber: student.rollNumber,
                              name: student.name,
                              gender: student.gender || "Male",
                              mobileNumber: student.mobileNumber || ""
                            }
                          })
                          setEditedRosterValues(initial)
                          setIsEditingRoster(true)
                          setShowAddStudent(false)
                        }}
                        variant="outline"
                        className="text-xs font-bold rounded-xl border-border/80"
                        size="sm"
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Roster
                      </Button>
                      <Button onClick={() => setShowAddStudent(!showAddStudent)} className="text-xs font-bold rounded-xl" size="sm">
                        <Plus className="mr-1.5 h-4 w-4" /> Add Student
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {showAddStudent && !isBatchArchived && (
                <form onSubmit={handleAddStudentSubmit} className="p-4 border-b border-border/50 bg-secondary/15 flex flex-wrap items-end gap-3.5 animate-fade-in-up">
                  <div className="min-w-[150px] flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      {editingStudentId ? "Edit Student Name" : "Student Name"}
                    </label>
                    <Input
                      placeholder="e.g. Ramesh Babu"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="h-9 text-xs font-semibold rounded-lg"
                    />
                  </div>
                  <div className="min-w-[120px] flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      {editingStudentId ? "Edit Roll No" : "Roll / Register No"}
                    </label>
                    <Input
                      placeholder="e.g. 2361A0540"
                      value={newStudentRoll}
                      onChange={(e) => setNewStudentRoll(e.target.value)}
                      className="h-9 text-xs font-semibold rounded-lg"
                    />
                  </div>
                  <div className="min-w-[100px] flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Gender</label>
                    <select
                      value={newStudentGender}
                      onChange={(e) => setNewStudentGender(e.target.value as "Male" | "Female")}
                      className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="min-w-[120px] flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Mobile Number</label>
                    <Input
                      placeholder="e.g. 9848012345"
                      value={newStudentMobile}
                      onChange={(e) => setNewStudentMobile(e.target.value)}
                      className="h-9 text-xs font-semibold rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="text-xs font-bold rounded-lg h-9">
                      {editingStudentId ? "Update Student" : "Save Student"}
                    </Button>
                    {editingStudentId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStudentId(null)
                          setNewStudentName("")
                          setNewStudentRoll("")
                          setNewStudentGender("Male")
                          setNewStudentMobile("")
                          setShowAddStudent(false)
                        }}
                        className="text-xs font-bold rounded-lg h-9"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              )}

              {!isBatchArchived && (
                <div className="p-4 border-b border-border/50 bg-secondary/10 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Import class roster database via Excel sheet</p>
                      <p className="text-[11px] text-muted-foreground font-semibold">Upload your sheet to bulk-add students. Format guidelines are shown below.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative flex items-center justify-center border border-dashed border-border/80 hover:bg-secondary/40 px-4 py-2 rounded-xl cursor-pointer text-xs font-bold text-muted-foreground">
                        <Upload className="mr-1.5 h-4 w-4 text-primary" />
                        Upload Excel
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                      </label>
                      {excelPreview && (
                        <Button onClick={handleImportExcelSubmit} size="sm" className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                          Confirm Import ({excelPreview.length} students)
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-secondary/20 border rounded-xl p-3.5 space-y-2 text-xs font-semibold text-muted-foreground leading-relaxed">
                    <p className="text-foreground font-black text-[10px] uppercase tracking-wider">Required Excel Format Template:</p>
                    <p className="text-[11px] font-medium">Your Excel sheet MUST contain columns with the exact names: <strong className="text-foreground">Roll Number</strong> (or Roll No) and <strong className="text-foreground">Student Name</strong>. Optionally includes <strong className="text-foreground">Gender</strong> (Male or Female) and <strong className="text-foreground">Mobile Number</strong>.</p>
                    <pre className="bg-background border p-2 rounded-lg text-[10px] font-mono font-bold text-primary w-fit mt-1.5">
                      Roll Number | Student Name | Gender | Mobile Number{"\n"}
                      23691A3301  | Abilash S    | Male   | 9848012345{"\n"}
                      23691A3302  | Akhila K.    | Female | 9848054321
                    </pre>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 pl-6">Roll No</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Gender</th>
                      <th className="p-4">Mobile Number</th>
                      {isEditingRoster && !isBatchArchived && <th className="p-4 text-right pr-6">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs font-semibold">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={isEditingRoster && !isBatchArchived ? 5 : 4} className="p-8 text-center text-muted-foreground font-semibold">
                          No students enrolled in this classroom section yet. Upload an Excel sheet to bulk-import students or click "Add Student" above.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const isEditingThisRow = isEditingRoster && editedRosterValues[student.id]

                        return (
                          <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 pl-6 font-mono font-bold text-primary">
                              {isEditingThisRow ? (
                                <Input
                                  value={editedRosterValues[student.id]?.rollNumber || ""}
                                  onChange={(e) => updateEditedRosterField(student.id, "rollNumber", e.target.value)}
                                  className="h-8 text-xs font-bold rounded-lg font-mono text-primary bg-background w-32 border-border/80"
                                />
                              ) : (
                                student.rollNumber
                              )}
                            </td>
                            <td className="p-3 text-foreground font-bold">
                              {isEditingThisRow ? (
                                <Input
                                  value={editedRosterValues[student.id]?.name || ""}
                                  onChange={(e) => updateEditedRosterField(student.id, "name", e.target.value)}
                                  className="h-8 text-xs font-semibold rounded-lg text-foreground bg-background w-48 border-border/80"
                                />
                              ) : (
                                student.name
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {isEditingThisRow ? (
                                <select
                                  value={editedRosterValues[student.id]?.gender || "Male"}
                                  onChange={(e) => updateEditedRosterField(student.id, "gender", e.target.value as "Male" | "Female")}
                                  className="bg-background border text-xs font-semibold rounded-lg h-8 px-2 focus:outline-none"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
                              ) : (
                                student.gender || "Male"
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground font-mono">
                              {isEditingThisRow ? (
                                <Input
                                  value={editedRosterValues[student.id]?.mobileNumber || ""}
                                  onChange={(e) => updateEditedRosterField(student.id, "mobileNumber", e.target.value)}
                                  className="h-8 text-xs font-semibold rounded-lg text-foreground bg-background w-36 border-border/80"
                                />
                              ) : (
                                student.mobileNumber || "9848012345"
                              )}
                            </td>
                            {isEditingRoster && !isBatchArchived && (
                              <td className="p-3 text-right pr-6">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    deleteClassStudent(student.id)
                                    const updated = { ...editedRosterValues }
                                    delete updated[student.id]
                                    setEditedRosterValues(updated)
                                  }}
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                  title="Remove Student"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {workspaceTab === "faculty" && (
          <Card className="border-border/60 rounded-xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Assigned Faculty Staff</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 pl-6">Faculty Code</th>
                      <th className="p-4">Staff Name</th>
                      <th className="p-4">Assigned Subjects</th>
                      <th className="p-4">Weekly Load</th>
                      <th className="p-4 text-center pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs font-semibold">
                    {assignedFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold">
                          No faculty assigned to this classroom section yet. Publish a timetable to assign teaching staff.
                        </td>
                      </tr>
                    ) : (
                      assignedFaculty.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-primary">{f.code}</td>
                        <td className="p-4 text-foreground font-bold">{f.name}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {f.subjects.map((sub) => (
                              <Badge key={sub} variant="outline" className="text-[10px] font-bold border-border/70">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-foreground">{f.weeklyLoad} Hours</td>
                        <td className="p-4 text-center pr-6">
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold px-2 py-0 text-[10px] uppercase">
                            Active
                          </Badge>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // --- Sub-View: Main HOD Academic Dashboard ---
  return (
    <div className="space-y-6 animate-fade-in-up">
      {isBatchArchived && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-450 leading-relaxed shadow-sm">
          <Lock className="h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-extrabold text-foreground">Browsing Graduated Batch (Read-Only Mode)</p>
            <p className="text-[11px] text-muted-foreground/80 font-bold mt-0.5">
              You are currently viewing data from the graduated academic cohort: <strong>{activeViewingBatch?.name}</strong>. All sections and rosters under it are locked.
            </p>
          </div>
        </div>
      )}

      {/* Header and Switcher tabs */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">Academic Batches</h1>
          <p className="text-xs text-muted-foreground font-semibold">Manage student entry cohorts, semesters, program courses, and progression wizard</p>
        </div>

        <div className="flex rounded-xl bg-card border border-border/80 p-1 shadow-sm w-fit shrink-0">
          {[
            { id: "batches", label: "Batches Hub", icon: Calendar },
            { id: "sections", label: "Section Folders", icon: Users },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={cn(
                "rounded-lg text-xs font-bold px-4 py-1.5 h-auto transition-all duration-150 uppercase tracking-wider",
                activeTab === tab.id && "shadow-sm bg-primary text-primary-foreground font-black"
              )}
              type="button"
            >
              <tab.icon className="mr-1.5 h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "batches" && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Department Cohorts</h2>
            <div className="flex gap-2">
              <Button onClick={handleLaunchWizard} className="text-xs font-black rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-1.5 h-9">
                <GitBranch className="h-4 w-4" /> Progression Wizard
              </Button>
              <Button onClick={() => setShowAddBatch(!showAddBatch)} size="sm" variant="outline" className="text-xs font-bold rounded-xl h-9 border-border/80">
                <Plus className="mr-1 h-4 w-4" /> Create Batch
              </Button>
            </div>
          </div>

          {showAddBatch && (
            <form onSubmit={handleCreateBatch} className="bg-card border border-border/75 p-6 rounded-2xl space-y-4 shadow-sm animate-fade-in-up">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Configure New Batch</h3>
              <div className="grid gap-4 sm:grid-cols-5 text-xs font-bold">
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Batch Cohort Name</label>
                  <Input placeholder="e.g. 2023-2027 Batch" value={newBatchName} onChange={(e) => setNewBatchName(e.target.value)} className="h-9 text-xs font-semibold rounded-lg" required />
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Start Year</label>
                  <Input type="number" value={newBatchStart} onChange={(e) => setNewBatchStart(Number(e.target.value))} className="h-9 text-xs font-semibold rounded-lg" required />
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Graduation Year</label>
                  <Input type="number" value={newBatchEnd} onChange={(e) => setNewBatchEnd(Number(e.target.value))} className="h-9 text-xs font-semibold rounded-lg" required />
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Current Year Level</label>
                  <select value={newBatchYear} onChange={(e) => setNewBatchYear(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Semester Cycle</label>
                  <select value={newBatchSem} onChange={(e) => setNewBatchSem(e.target.value as any)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="Odd">Odd Semester</option>
                    <option value="Even">Even Semester</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddBatch(false)} className="text-xs font-bold rounded-lg h-9">Cancel</Button>
                <Button type="submit" className="text-xs font-bold rounded-lg h-9">Save Batch</Button>
              </div>
            </form>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {batches.map((b) => {
              const isActive = b.id === currentBatchId
              const isViewing = b.id === viewingBatchId

              return (
                <Card key={b.id} className={cn("border-border/60 shadow-sm rounded-2xl transition-all duration-200 hover:shadow-md", isActive ? "border-primary/40 ring-1 ring-primary/10 bg-gradient-to-br from-card to-primary/5" : "")}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-black text-foreground">{b.name}</CardTitle>
                      <Badge className={cn(
                        "font-bold px-2 py-0.5 text-[9px] uppercase border rounded-md",
                        b.status === "ACTIVE" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                        b.status === "INACTIVE" && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                        b.status === "GRADUATED" && "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      )}>
                        {b.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-semibold text-muted-foreground">Current Stage: {b.currentYearLevel} - {b.currentSemester} Sem</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-muted-foreground">
                      <div>
                        <p className="uppercase text-[9px] tracking-wider text-muted-foreground/80">Batch Span</p>
                        <p className="text-foreground mt-0.5">{b.startYear} – {b.endYear}</p>
                      </div>
                      <div>
                        <p className="uppercase text-[9px] tracking-wider text-muted-foreground/80">Roster Mappings</p>
                        <p className="text-foreground mt-0.5">Active</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => setViewingBatchId(b.id)} variant={isViewing ? "default" : "secondary"} size="sm" className="flex-1 text-xs font-bold rounded-xl h-8">
                        {isViewing ? "Viewing Data" : "Browse Batch"}
                      </Button>
                      <Button onClick={() => handleStartEditBatch(b)} variant="outline" size="sm" className="text-xs font-bold rounded-xl h-8 px-2.5">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => handleDeleteBatchClick(b.id, b.name)} variant="ghost" size="sm" className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0 px-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}


      {activeTab === "sections" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center bg-secondary/15 border border-border/80 p-3.5 rounded-2xl justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-primary">
                <FolderOpen className="h-4.5 w-4.5" />
                <span className="uppercase tracking-widest text-[10px] font-black">Active Folder Scope:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Choose Student Batch:</span>
                <select
                  value={viewingBatchId}
                  onChange={(e) => setViewingBatchId(e.target.value)}
                  className="bg-card border text-[11px] font-bold rounded-lg h-8 px-2.5 focus:outline-none"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.currentYearLevel} - {b.currentSemester} Sem)</option>
                  ))}
                </select>
              </div>
            </div>

            {viewingBatchId && !isBatchArchived && (
              <Button onClick={() => setShowAddSection(!showAddSection)} size="sm" className="text-xs font-bold rounded-xl h-8">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Create Section
              </Button>
            )}
          </div>

          {showAddSection && viewingBatchId && !isBatchArchived && (
            <form onSubmit={handleCreateSection} className="bg-card border border-border/75 p-6 rounded-2xl space-y-4 shadow-sm animate-fade-in-up">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Create New Section</h3>
              <div className="grid gap-4 sm:grid-cols-4 text-xs font-bold">
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Academic Year</label>
                  <select value={secYear} onChange={(e) => setSecYear(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Semester</label>
                  <select value={secSem} onChange={(e) => setSecSem(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="Odd">Odd Semester</option>
                    <option value="Even">Even Semester</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Program</label>
                  <Input placeholder="e.g. CSE" value={secName} onChange={(e) => setSecName(e.target.value)} className="h-9 text-xs font-semibold rounded-lg" />
                </div>
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Section Letter</label>
                  <Input placeholder="e.g. A" value={secNameLetter} onChange={(e) => setSecNameLetter(e.target.value)} className="h-9 text-xs font-semibold rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddSection(false)} className="text-xs font-bold rounded-lg h-9">Cancel</Button>
                <Button type="submit" className="text-xs font-bold rounded-lg h-9">Create Section</Button>
              </div>
            </form>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSections.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-14 text-center">
                <div className="rounded-full bg-secondary/40 p-4 mb-3">
                  <FolderOpen className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">No Classroom Sections Found</h3>
                <p className="text-[11px] font-bold text-muted-foreground mt-1 max-w-[280px]">
                  There are no classroom sections mapped under this student batch.
                </p>
              </div>
            ) : (
              filteredSections.map((sec) => (
                <Card key={sec.id} className="border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-black text-foreground">{sec.name}</CardTitle>
                      <Badge className={cn("border-none font-bold text-[9px] uppercase px-2 py-0.5", isBatchArchived ? "bg-rose-500/10 text-rose-700 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
                        {isBatchArchived ? "Graduated" : sec.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {sec.year} • {sec.semester} Semester
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground">
                      <div>
                        <span className="text-[9px] font-bold block uppercase tracking-wider">Roster Size</span>
                        <span className="text-sm font-extrabold text-foreground">{getSectionRoster(sec.id).length} Students</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold block uppercase tracking-wider">Lecturers</span>
                        <span className="text-sm font-extrabold text-foreground">{(timetables[sec.id] || []).map(c => c.facultyName).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).length} Assigned</span>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-border/50 text-[11px] leading-snug">
                        <p><span className="font-bold text-foreground">CR:</span> {sec.crName}</p>
                        <p className="mt-0.5"><span className="font-bold text-foreground">LR:</span> {sec.lrName}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => setSelectedSectionWorkspace(sec.id)}
                        className="flex-1 text-xs font-bold rounded-xl h-8 bg-secondary hover:bg-secondary/85 text-foreground"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Open Workspace
                      </Button>
                      {!isBatchArchived && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSection(sec.id)}
                          className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}



      {/* Global Academic Session Promotion Wizard Modal */}
      {showPromotionWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            if (promotionStep < 4) setShowPromotionWizard(false)
          }} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <GitBranch className="h-5 w-5 text-primary" />
                Academic Progression Wizard
              </h3>
              {promotionStep < 4 && (
                <Button variant="ghost" size="icon" onClick={() => setShowPromotionWizard(false)} className="h-8 w-8 rounded-lg">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Stepper progress indicator */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <span className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                    promotionStep >= step
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}>
                    {step}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                    {step === 1 ? "Cohort" : step === 2 ? "Preview" : step === 3 ? "Options" : step === 4 ? "Prog" : "Done"}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Cohort Selection */}
            {promotionStep === 1 && (
              <div className="space-y-4 text-xs font-bold animate-fade-in-up">
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Select the student batch cohort to progress. Timelines and semesters are scoped independently per batch.
                </p>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Select Student Batch to Progress</label>
                    <select
                      value={promotionSourceBatchId}
                      onChange={(e) => {
                        const bid = e.target.value
                        setPromotionSourceBatchId(bid)
                        const b = batches.find(x => x.id === bid)
                        if (b) {
                          setTargetSemester(b.currentSemester === "Odd" ? "Even" : "Odd")
                        }
                      }}
                      className="bg-input/40 border border-border text-xs font-bold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Choose active batch --</option>
                      {batches
                        .filter(b => b.status === "ACTIVE")
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.currentYearLevel} - {b.currentSemester} Sem)</option>
                        ))}
                    </select>
                  </div>

                  {selectedSourceBatch && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Target Semester</label>
                          <select
                            value={targetSemester}
                            onChange={(e) => setTargetSemester(e.target.value as "Odd" | "Even")}
                            className="bg-input/40 border border-border text-xs font-bold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="Odd">Odd Semester</option>
                            <option value="Even">Even Semester</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Target Stage Preview</label>
                          <Input
                            value={
                              targetSemester === "Even"
                                ? `${selectedSourceBatch.currentYearLevel} - Even Semester`
                                : `${selectedSourceBatch.currentYearLevel === "1st Year" ? "2nd Year" : selectedSourceBatch.currentYearLevel === "2nd Year" ? "3rd Year" : selectedSourceBatch.currentYearLevel === "3rd Year" ? "4th Year" : "Graduated"} - Odd Semester`
                            }
                            disabled
                            className="bg-secondary/40 text-xs font-bold h-9 rounded-lg"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  onClick={() => setPromotionStep(2)}
                  className="w-full text-xs font-bold rounded-xl mt-4 h-9"
                  disabled={!promotionSourceBatchId}
                >
                  Continue to Preview
                </Button>
              </div>
            )}

            {/* Step 2: Preview */}
            {promotionStep === 2 && selectedSourceBatch && (
              <div className="space-y-4 text-xs font-bold animate-fade-in-up">
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Progression Preview ({selectedSourceBatch.name})</h3>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  Sections under <strong>{selectedSourceBatch.name}</strong> will progress as follows:
                </p>
                <div className="border rounded-xl p-3 bg-secondary/15 space-y-2.5 max-h-[160px] overflow-y-auto">
                  {promotionSourceSections.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground font-bold text-center py-4">No active sections mapped in this cohort.</p>
                  ) : (
                    promotionSourceSections.map((sec) => {
                      const yearMapping: Record<string, string> = {
                        "1st Year": "2nd Year",
                        "2nd Year": "3rd Year",
                        "3rd Year": "4th Year",
                        "4th Year": "Graduated",
                      }
                      const nextYear = targetSemester === "Odd" ? (yearMapping[sec.year] || "Graduated") : sec.year
                      let nextName = sec.name
                      if (targetSemester === "Odd") {
                        if (sec.year === "1st Year") nextName = sec.name.replace(/^I\s/, "II ")
                        else if (sec.year === "2nd Year") nextName = sec.name.replace(/^II\s/, "III ")
                        else if (sec.year === "3rd Year") nextName = sec.name.replace(/^III\s/, "IV ")
                        else if (sec.year === "4th Year") nextName = `${sec.name} (Graduated)`
                      }
                      return (
                        <div key={sec.id} className="flex items-center justify-between text-[11px] font-bold">
                          <span>{sec.name} ({sec.year})</span>
                          <span className="text-muted-foreground mx-2">➔</span>
                          <span className={cn(nextYear === "Graduated" ? "text-rose-700 font-extrabold" : "text-primary")}>
                            {nextName} ({nextYear})
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPromotionStep(1)} className="flex-1 text-xs font-bold rounded-xl">Back</Button>
                  <Button onClick={() => setPromotionStep(3)} className="flex-1 text-xs font-bold rounded-xl" disabled={promotionSourceSections.length === 0}>Looks Good, Next</Button>
                </div>
              </div>
            )}

            {/* Step 3: Configurations */}
            {promotionStep === 3 && selectedSourceBatch && (
              <div className="space-y-4 text-xs font-bold animate-fade-in-up">
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Wizard Settings</h3>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="promoteRoster" checked disabled className="h-4 w-4 rounded text-primary" />
                    <label htmlFor="promoteRoster" className="text-xs font-bold select-none">Promote Student Rosters (Verified)</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="retainFacultyCheck"
                      checked={retainFaculty}
                      onChange={(e) => setRetainFaculty(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="retainFacultyCheck" className="text-xs font-bold select-none cursor-pointer">Retain Faculty Subject Assignments</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="retainTimetableCheck"
                      checked={retainTimetable}
                      onChange={(e) => setRetainTimetable(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="retainTimetableCheck" className="text-xs font-bold select-none cursor-pointer">Retain Timetable Templates</label>
                  </div>

                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                    <span className="text-amber-500 text-sm">⚠️</span>
                    <p>
                      Office positions (CR/LR) will be reset to unassigned. Historical attendance records under this cohort's previous stage will be locked.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPromotionStep(2)} className="flex-1 text-xs font-bold rounded-xl">Back</Button>
                  <Button onClick={handleExecuteBatchPromotion} className="flex-1 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                    Execute Progression
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Progress Indicator */}
            {promotionStep === 4 && (
              <div className="space-y-6 py-6 text-center animate-fade-in-up text-xs font-bold">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Progression in Progress...</h3>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${promotionProgress}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground font-semibold">
                  {promotionProgress < 50 ? "Migrating student cohort records..." : promotionProgress < 90 ? "Duplicating timetable mapping nodes..." : "Locking historical session archives..."}
                </p>
              </div>
            )}

            {/* Step 5: Final Summary */}
            {promotionStep === 5 && selectedSourceBatch && (
              <div className="space-y-4 text-center animate-fade-in-up text-xs font-bold">
                <div className="mx-auto rounded-full bg-emerald-500/10 p-3 w-fit text-emerald-650 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Promotion Completed!</h3>
                <p className="text-[11px] text-muted-foreground font-semibold max-w-[340px] mx-auto leading-relaxed">
                  The cohort <strong>{selectedSourceBatch.name}</strong> has successfully transitioned to: 
                  <br />
                  <strong>
                    {targetSemester === "Even"
                      ? `${selectedSourceBatch.currentYearLevel} - Even Semester`
                      : `${selectedSourceBatch.currentYearLevel === "1st Year" ? "2nd Year" : selectedSourceBatch.currentYearLevel === "2nd Year" ? "3rd Year" : selectedSourceBatch.currentYearLevel === "3rd Year" ? "4th Year" : "Graduated"} - Odd Semester`}
                  </strong>.
                </p>
                <div className="border rounded-xl p-3 bg-secondary/15 text-left text-[11px] font-bold text-muted-foreground space-y-1 mt-2">
                  <p><span className="text-foreground">Student Cohort:</span> {selectedSourceBatch.name}</p>
                  <p><span className="text-foreground">Timetables Copied:</span> {retainTimetable ? "Yes" : "No"}</p>
                  <p><span className="text-foreground">CR/LR Mappings:</span> Reset to Empty</p>
                  <p><span className="text-foreground">Cohort Status:</span> Active</p>
                </div>
                <Button
                  onClick={() => {
                    setShowPromotionWizard(false)
                    setPromotionStep(1)
                    setPromotionSourceBatchId("")
                  }}
                  className="w-full text-xs font-bold rounded-xl mt-4"
                >
                  Finish & Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Batch Config Modal */}
      {editingBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingBatchId(null)} />
          <form onSubmit={handleSaveEditBatch} className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Edit Batch Configuration
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingBatchId(null)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold">
              <div className="sm:col-span-2">
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Batch Cohort Name</label>
                <Input placeholder="e.g. 2023-2027 Batch" value={editBatchName} onChange={(e) => setEditBatchName(e.target.value)} className="h-9 text-xs font-semibold rounded-lg" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Start Year</label>
                <Input type="number" value={editBatchStart} onChange={(e) => setEditBatchStart(Number(e.target.value))} className="h-9 text-xs font-semibold rounded-lg" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Graduation Year</label>
                <Input type="number" value={editBatchEnd} onChange={(e) => setEditBatchEnd(Number(e.target.value))} className="h-9 text-xs font-semibold rounded-lg" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Current Year Level</label>
                <select value={editBatchYear} onChange={(e) => setEditBatchYear(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Semester Cycle</label>
                <select value={editBatchSem} onChange={(e) => setEditBatchSem(e.target.value as any)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="Odd">Odd Semester</option>
                  <option value="Even">Even Semester</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Status</label>
                <select value={editBatchStatus} onChange={(e) => setEditBatchStatus(e.target.value as any)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="ACTIVE">ACTIVE (Active Cohort)</option>
                  <option value="INACTIVE">INACTIVE (Deactivated)</option>
                  <option value="GRADUATED">GRADUATED (Alumni/Completed)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setEditingBatchId(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button type="submit" className="text-xs font-bold rounded-xl h-9 bg-primary text-primary-foreground">Save Changes</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
