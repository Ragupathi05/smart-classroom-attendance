"use client"

import React, { useState, useMemo, useEffect } from "react"
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  BookOpen,
  Eye,
  Trash2,
  Sliders,
  UserCheck,
  Archive,
  RefreshCw,
  Crown,
  Star,
  Pencil,
  X,
} from "lucide-react"
import { useAcademicStore, useStudentStore, useTimetableStore, useAuthStore, useConfirmStore } from "@/store"
import type { FacultyMember } from "@/store/academicStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"

const formatSubjectName = (str: string) => {
  if (!str) return ""
  return str
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function HodPeoplePage() {
  const {
    batches,
    sections,
    facultyList,
    addFaculty,
    updateFaculty,
    deactivateFaculty,
    deleteFaculty,
    assignCRLR,
    crlrAssignmentHistory,
    getSectionRoster,
  } = useAcademicStore()
  const confirm = useConfirmStore((state) => state.confirm)

  const { classStudents } = useStudentStore()
  const timetables = useTimetableStore((state) => state.timetables)

  // Section students logic moved below after crlrSectionId declaration

  // Calculate dynamic weekly workload hours scheduled in all timetables
  const getFacultyWorkload = (facultyName: string, facultyCode: string) => {
    let hoursCount = 0
    const name = facultyName.trim().toLowerCase()
    const code = facultyCode.trim().toLowerCase()
    const activeSectionIds = new Set(useAcademicStore.getState().sections.map(s => s.id))

    for (const secId in timetables) {
      if (!activeSectionIds.has(secId)) continue

      const cells = timetables[secId] || []
      for (const cell of cells) {
        const cf = cell.facultyName?.trim().toLowerCase()
        if (cf && (cf.includes(code) || cf.includes(name) || name.includes(cf))) {
          hoursCount += 1
        }
      }
    }
    return hoursCount
  }

  // Workload limits input states
  const [facWorkloadLimit, setFacWorkloadLimit] = useState("16")
  const [editFacWorkloadLimit, setEditFacWorkloadLimit] = useState("16")

  const [activeTab, setActiveTab] = useState<"faculty" | "crlr">("faculty")
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyMember | null>(null)
  
  // Search queries
  const [searchFaculty, setSearchFaculty] = useState("")
  const [searchStudent, setSearchStudent] = useState("")

  // CR/LR active section
  const [crlrSectionId, setCrlrSectionId] = useState(sections[0]?.id || "")
// Filter student list dynamically for CR/LR assignments based on active section
  const sectionStudents = useMemo(() => {
    if (!crlrSectionId) return []
    return getSectionRoster(crlrSectionId)
  }, [crlrSectionId, getSectionRoster, sections])
  const [selectedBatchId, setSelectedBatchId] = useState("")

  // Auto-initialize Batch selection for CR/LR tab
  useEffect(() => {
    const active = batches.find(b => b.status === "ACTIVE")
    if (active) {
      setSelectedBatchId(active.id)
    } else if (batches.length > 0) {
      setSelectedBatchId(batches[0].id)
    }
  }, [batches])

  // Filter sections belonging to selected batch
  const filteredSectionsForCrlr = useMemo(() => {
    if (!selectedBatchId) return []
    return sections.filter((s) => s.batchId === selectedBatchId)
  }, [sections, selectedBatchId])

  // Keep active section in sync when batch changes
  useEffect(() => {
    if (filteredSectionsForCrlr.length > 0) {
      const exists = filteredSectionsForCrlr.some((s) => s.id === crlrSectionId)
      if (!exists) {
        setCrlrSectionId(filteredSectionsForCrlr[0].id)
      }
    }
  }, [filteredSectionsForCrlr, crlrSectionId])

  // Add Faculty Form
  const [showAddFaculty, setShowAddFaculty] = useState(false)
  const [facCode, setFacCode] = useState("")
  const [facName, setFacName] = useState("")
  const [facEmail, setFacEmail] = useState("")
  const [facPhone, setFacPhone] = useState("")
  const [facSubject, setFacSubject] = useState("")
  const [facSection, setFacSection] = useState("")

  // Edit Faculty Modal States
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null)
  const [editFacCode, setEditFacCode] = useState("")
  const [editFacName, setEditFacName] = useState("")
  const [editFacEmail, setEditFacEmail] = useState("")
  const [editFacPhone, setEditFacPhone] = useState("")

  // Mappings forms
  const [subjectInput, setSubjectInput] = useState("")
  const [sectionInput, setSectionInput] = useState("")

  const handleAddFacultySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!facCode.trim() || !facName.trim() || !facEmail.trim()) return

    addFaculty({
      code: facCode.trim().toUpperCase(),
      name: facName.trim(),
      department: "Computer Science & Engineering",
      email: facEmail.trim(),
      phone: facPhone.trim() || "N/A",
      subjects: facSubject ? [formatSubjectName(facSubject)] : [],
      sections: facSection ? [facSection.trim()] : [],
      weeklyLoad: 12,
      weeklyWorkloadLimit: Number(facWorkloadLimit) || 16,
      attendancePending: 0,
      status: "Active",
    })

    setFacCode("")
    setFacName("")
    setFacEmail("")
    setFacPhone("")
    setFacSubject("")
    setFacSection("")
    setShowAddFaculty(false)
    toast.success("Faculty member registered successfully!")
  }

  const filteredFaculty = useMemo(() => {
    return facultyList.filter((f) => {
      const q = searchFaculty.toLowerCase()
      return f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)
    })
  }, [facultyList, searchFaculty])

  const filteredStudents = useMemo(() => {
    return classStudents.filter((s) => {
      const q = searchStudent.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    })
  }, [classStudents, searchStudent])

  const crlrSection = useMemo(() => {
    return sections.find((s) => s.id === crlrSectionId) || null
  }, [sections, crlrSectionId])

  const assignedCrStudent = useMemo(() => {
    if (!crlrSection) return null
    return sectionStudents.find(s => s.name === crlrSection.crName)
  }, [sectionStudents, crlrSection?.crName])

  const assignedLrStudent = useMemo(() => {
    if (!crlrSection) return null
    return sectionStudents.find(s => s.name === crlrSection.lrName)
  }, [sectionStudents, crlrSection?.lrName])

  const handleAddSubjectToFaculty = () => {
    if (!selectedFaculty || !subjectInput.trim()) return
    const updatedSubjects = [...selectedFaculty.subjects, formatSubjectName(subjectInput)]
    updateFaculty(selectedFaculty.id, { subjects: updatedSubjects })
    setSelectedFaculty({ ...selectedFaculty, subjects: updatedSubjects })
    setSubjectInput("")
    toast.success("Subject mapped to faculty")
  }

  const handleRemoveSubjectFromFaculty = (sub: string) => {
    if (!selectedFaculty) return
    const updated = selectedFaculty.subjects.filter((s) => s !== sub)
    updateFaculty(selectedFaculty.id, { subjects: updated })
    setSelectedFaculty({ ...selectedFaculty, subjects: updated })
    toast.info("Subject unmapped")
  }

  const handleAddSectionToFaculty = () => {
    if (!selectedFaculty || !sectionInput.trim()) return
    const updated = [...selectedFaculty.sections, sectionInput.trim()]
    updateFaculty(selectedFaculty.id, { sections: updated })
    setSelectedFaculty({ ...selectedFaculty, sections: updated })
    setSectionInput("")
    toast.success("Section mapped to faculty")
  }

  const handleRemoveSectionFromFaculty = (sec: string) => {
    if (!selectedFaculty) return
    const updated = selectedFaculty.sections.filter((s) => s !== sec)
    updateFaculty(selectedFaculty.id, { sections: updated })
    setSelectedFaculty({ ...selectedFaculty, sections: updated })
    toast.info("Section unmapped")
  }

  const handleToggleFacultyStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active"
    updateFaculty(id, { status: nextStatus })
    if (selectedFaculty?.id === id) {
      setSelectedFaculty({ ...selectedFaculty, status: nextStatus })
    }
    toast.info(`Faculty profile set to ${nextStatus.toLowerCase()} successfully!`)
  }

  const handleDeleteFaculty = (id: string, name: string) => {
    confirm({
      title: "Delete Faculty Profile",
      message: `Are you sure you want to completely delete "${name}"? This action cannot be undone and will remove their workload profiles.`,
      confirmText: "Delete",
      onConfirm: () => {
        deleteFaculty(id)
        if (selectedFaculty?.id === id) {
          setSelectedFaculty(null)
        }
        toast.success("Faculty member deleted successfully!")
      }
    })
  }

  const handleStartEditFaculty = (fac: FacultyMember) => {
    setEditingFacultyId(fac.id)
    setEditFacCode(fac.code)
    setEditFacName(fac.name)
    setEditFacEmail(fac.email)
    setEditFacPhone(fac.phone)
    setEditFacWorkloadLimit(String(fac.weeklyWorkloadLimit || 16))
  }

  const handleSaveEditFaculty = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFacultyId) return
    updateFaculty(editingFacultyId, {
      code: editFacCode.trim().toUpperCase(),
      name: editFacName.trim(),
      email: editFacEmail.trim(),
      phone: editFacPhone.trim(),
      weeklyWorkloadLimit: Number(editFacWorkloadLimit) || 16,
    })
    
    // Update active details sidebar if currently viewed
    if (selectedFaculty?.id === editingFacultyId) {
      setSelectedFaculty(prev => prev ? {
        ...prev,
        code: editFacCode.trim().toUpperCase(),
        name: editFacName.trim(),
        email: editFacEmail.trim(),
        phone: editFacPhone.trim(),
        weeklyWorkloadLimit: Number(editFacWorkloadLimit) || 16,
      } : null)
    }
    setEditingFacultyId(null)
    toast.success("Faculty details updated successfully!")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-foreground text-gradient-primary">People Directory</h1>
          <p className="text-muted-foreground text-xs font-semibold">
            Manage teaching staff directory, configure workloads, and assign class representatives.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-card border border-border/80 p-1 shadow-sm w-fit shrink-0">
          {[
            { id: "faculty", label: "Faculty Directory", icon: Users },
            { id: "crlr", label: "CR/LR Assignments", icon: UserCheck },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setSelectedFaculty(null)
              }}
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

      {/* 1. Faculty Directory Tab */}
      {activeTab === "faculty" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center bg-secondary/15 border border-border/80 p-3.5 rounded-2xl">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search faculty by name/code..."
                  value={searchFaculty}
                  onChange={(e) => setSearchFaculty(e.target.value)}
                  className="pl-9 h-9 text-xs font-semibold rounded-xl bg-input/45 border-border/85 text-foreground"
                />
              </div>
              <Button onClick={() => setShowAddFaculty(!showAddFaculty)} size="sm" className="text-xs font-black rounded-xl h-9 bg-primary text-primary-foreground">
                <Plus className="mr-1 h-4 w-4" /> Add Faculty
              </Button>
            </div>

            {showAddFaculty && (
              <form onSubmit={handleAddFacultySubmit} className="bg-card border border-border/75 p-6 rounded-2xl space-y-4 shadow-sm animate-fade-in-up">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Register New Faculty</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-xs font-bold">
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Faculty Code</label>
                    <Input placeholder="e.g. CSE-F08" value={facCode} onChange={(e) => setFacCode(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
                  </div>
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Full Name</label>
                    <Input placeholder="e.g. Dr. Kumar" value={facName} onChange={(e) => setFacName(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
                  </div>
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Email Address</label>
                    <Input type="email" placeholder="e.g. kumar@mits.ac.in" value={facEmail} onChange={(e) => setFacEmail(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
                  </div>
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Phone Number</label>
                    <Input placeholder="e.g. 9876543210" value={facPhone} onChange={(e) => setFacPhone(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" />
                  </div>
                  <div>
                    <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Max Weekly Workload (Hours)</label>
                    <Input type="number" min="1" max="40" value={facWorkloadLimit} onChange={(e) => setFacWorkloadLimit(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <Button type="button" variant="outline" onClick={() => setShowAddFaculty(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                  <Button type="submit" className="text-xs font-bold rounded-xl h-9 bg-primary text-primary-foreground">Save Faculty</Button>
                </div>
              </form>
            )}

            <Card className="border-border/60 rounded-2xl shadow-sm overflow-hidden bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                        <th className="p-4 pl-6">Staff Code</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Mapped Subjects</th>
                        <th className="p-4">Workload</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs font-semibold">
                      {filteredFaculty.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 pl-6 font-mono font-black text-primary whitespace-nowrap">{f.code}</td>
                          <td className="p-4 text-foreground font-black text-sm whitespace-nowrap">{f.name}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {f.subjects.map((sub) => (
                                <Badge key={sub} className="text-[10px] font-black border border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          </td>
                           <td className="p-4 font-black text-foreground whitespace-nowrap">
                             {getFacultyWorkload(f.name, f.code)}h / {f.weeklyWorkloadLimit || 16}h max
                           </td>
                          <td className="p-4 text-center">
                            <Badge className={cn(
                              "border-none font-black px-2.5 py-0.5 text-[9px] uppercase rounded-md text-white shadow-sm",
                              f.status === "Active" ? "bg-emerald-600" : "bg-rose-600"
                            )}>
                              {f.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right pr-6 flex justify-end gap-1.5">
                            <Button onClick={() => setSelectedFaculty(f)} variant="secondary" size="xs" className="text-[10px] font-bold rounded-lg h-7">
                              <Eye className="mr-1 h-3.5 w-3.5" /> Workspace
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditFaculty(f)} className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary animate-hover-lift" title="Edit Details">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleToggleFacultyStatus(f.id, f.status)} className={cn("h-7 w-7 rounded-lg text-muted-foreground", f.status === "Active" ? "hover:bg-amber-500/10 hover:text-amber-600" : "hover:bg-emerald-500/10 hover:text-emerald-600")} title={f.status === "Active" ? "Archive/Deactivate" : "Activate"}>
                              {f.status === "Active" ? <Archive className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFaculty(f.id, f.name)} className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive animate-pulse-once" title="Delete Faculty">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Workload & Mappings</h2>
            {selectedFaculty ? (
              <Card className="border-border/60 rounded-2xl shadow-sm animate-fade-in-up bg-card p-2">
                <CardHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-lg font-black shadow-md shadow-primary/20">
                      {selectedFaculty.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base font-black text-foreground">{selectedFaculty.name}</CardTitle>
                      <CardDescription className="text-xs font-bold text-muted-foreground">{selectedFaculty.code} • {selectedFaculty.status}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 text-xs font-bold">
                  {(() => {
                    const selectedFacultyLoad = getFacultyWorkload(selectedFaculty.name, selectedFaculty.code)
                    const limit = selectedFaculty.weeklyWorkloadLimit || 16
                    const isOverloaded = selectedFacultyLoad > limit
                    return (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-foreground font-black text-xs">{selectedFaculty.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-foreground font-black text-xs">{selectedFaculty.phone}</span>
                          </div>
                        </div>

                        <div className="border-t border-border/50 pt-4 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                            <span>Weekly Workload Utilisation</span>
                            <span className={cn(
                              "font-black text-xs",
                              isOverloaded ? "text-rose-500 animate-pulse font-extrabold" : "text-emerald-500"
                            )}>
                              {selectedFacultyLoad}h / {limit}h max
                            </span>
                          </div>
                          <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden border border-border/10">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isOverloaded ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(100, (selectedFacultyLoad / limit) * 100)}%` }}
                            />
                          </div>
                          {isOverloaded && (
                            <span className="text-[9px] font-black text-rose-500 mt-1 block">
                              ⚠️ Overutilization: Exceeds max workload limit!
                            </span>
                          )}
                        </div>
                      </>
                    )
                  })()}

                  <div className="border-t border-border/50 pt-4 space-y-4">
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-black">Map New Subject</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. DL"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          className="h-9 text-xs font-semibold rounded-lg bg-input/40 border-border/80 text-foreground"
                        />
                        <Button onClick={handleAddSubjectToFaculty} size="sm" className="h-9 text-xs font-black rounded-lg bg-primary text-primary-foreground px-4">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedFaculty.subjects.map((sub) => (
                          <Badge key={sub} className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                            {sub}
                            <span onClick={() => handleRemoveSubjectFromFaculty(sub)} className="text-[11px] text-indigo-400 hover:text-rose-500 cursor-pointer pl-0.5 font-bold">×</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 font-black">Map Classroom Section</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. III CSE A"
                          value={sectionInput}
                          onChange={(e) => setSectionInput(e.target.value)}
                          className="h-9 text-xs font-semibold rounded-lg bg-input/40 border-border/80 text-foreground"
                        />
                        <Button onClick={handleAddSectionToFaculty} size="sm" className="h-9 text-xs font-black rounded-lg bg-primary text-primary-foreground px-4">Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedFaculty.sections.map((sec) => (
                          <Badge key={sec} className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                            {sec}
                            <span onClick={() => handleRemoveSectionFromFaculty(sec)} className="text-[11px] text-indigo-400 hover:text-rose-500 cursor-pointer pl-0.5 font-bold">×</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-4">
                    <Button
                      onClick={() => toast.success("Temporary password generated: MITS@1234")}
                      variant="outline"
                      className="w-full text-xs font-black rounded-xl h-10 border-border/80 bg-background/50 hover:bg-muted text-foreground"
                    >
                      <RefreshCw className="mr-1.5 h-4 w-4" /> Reset Portal Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground bg-secondary/5 shadow-inner">
                <Users className="h-8 w-8 text-muted-foreground/45 mb-2 animate-bounce" />
                <p className="text-xs font-black uppercase tracking-wider text-foreground/80">No Profile Loaded</p>
                <p className="text-[11px] font-semibold text-muted-foreground/75 max-w-[200px] mx-auto leading-relaxed mt-1">
                  Click the **Workspace** button next to a faculty member to manage workload mappings.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CR/LR Assignments Tab */}
      {activeTab === "crlr" && (
        <div className="space-y-6">
          <div className="space-y-4 bg-secondary/15 border border-border/80 p-5 rounded-2xl shadow-sm">
            
            {/* Batch Selector */}
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <span className="uppercase tracking-widest text-[9px] font-black text-foreground/80">Choose Student Batch:</span>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  const newBatchId = e.target.value
                  setSelectedBatchId(newBatchId)
                  // Auto-select first section under this batch
                  const firstSec = sections.find(s => s.batchId === newBatchId)
                  if (firstSec) setCrlrSectionId(firstSec.id)
                }}
                className="bg-card border text-[11px] font-black rounded-lg h-8 px-2 focus:outline-none"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            
            {/* Classroom Selector */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-border/50">
              <span className="uppercase tracking-widest text-[9px] font-black text-muted-foreground">Choose Active Classroom Folder:</span>
              <div className="flex flex-wrap gap-2 pt-1 pb-1">
                {filteredSectionsForCrlr.length === 0 ? (
                  <span className="text-[11px] font-semibold text-muted-foreground">No sections mapped under this batch.</span>
                ) : (
                  filteredSectionsForCrlr.map((sec) => {
                    const isSelected = crlrSectionId === sec.id
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setCrlrSectionId(sec.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 -translate-y-0.5"
                            : "bg-card hover:bg-muted text-muted-foreground border-border/80"
                        )}
                      >
                        {sec.name}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {crlrSection && (
              <div className="grid grid-cols-2 gap-4 pt-3 text-xs font-semibold">
                <div className="bg-card p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-black">Class Representative (CR)</span>
                      <span className="text-sm font-black text-foreground">{crlrSection.crName}</span>
                    </div>
                  </div>
                  {crlrSection.crName !== "To be assigned" && (
                    <Button
                      onClick={() => {
                        const roll = assignedCrStudent?.rollNumber
                        if (roll) {
                          useAuthStore.getState().resetUserPassword(roll, "cr")
                        }
                        toast.success(`Password for CR (${crlrSection.crName}) reset to default: MITS@CR123`)
                      }}
                      variant="outline"
                      size="xs"
                      className="text-[10px] font-black rounded-xl h-7 px-3 border border-indigo-500/30 text-indigo-650 dark:text-indigo-400 bg-transparent hover:bg-indigo-600 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 shrink-0 uppercase tracking-wider"
                    >
                      Reset Pwd
                    </Button>
                  )}
                </div>
                <div className="bg-card p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                      <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-black">Ladies Representative (LR)</span>
                      <span className="text-sm font-black text-foreground">{crlrSection.lrName}</span>
                    </div>
                  </div>
                  {crlrSection.lrName !== "To be assigned" && (
                    <Button
                      onClick={() => {
                        const roll = assignedLrStudent?.rollNumber
                        if (roll) {
                          useAuthStore.getState().resetUserPassword(roll, "lr")
                        }
                        toast.success(`Password for LR (${crlrSection.lrName}) reset to default: MITS@LR123`)
                      }}
                      variant="outline"
                      size="xs"
                      className="text-[10px] font-black rounded-xl h-7 px-3 border border-rose-500/30 text-rose-655 dark:text-rose-455 bg-transparent hover:bg-rose-600 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all duration-200 shrink-0 uppercase tracking-wider"
                    >
                      Reset Pwd
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <Card className="border-border/60 rounded-2xl shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-secondary/20 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      <th className="p-4 pl-6">Roll Number</th>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Gender</th>
                      <th className="p-4 text-right pr-6">Assign Representative Role</th>
                    </tr>
                  </thead>
                   <tbody className="divide-y divide-border/40 text-xs font-semibold">
                    {sectionStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground font-semibold">
                          Please select a batch and classroom folder with mapped sections to view and assign student representatives.
                        </td>
                      </tr>
                    ) : (
                      sectionStudents.map((s) => {
                        const isMale = (s.gender || "Male") === "Male"
                        const isActiveCR = crlrSection?.crName === s.name
                        const isActiveLR = crlrSection?.lrName === s.name

                        return (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 pl-6 font-mono font-black text-primary">{s.rollNumber}</td>
                          <td className="p-4 text-foreground font-black text-sm">{s.name}</td>
                          <td className="p-4 text-muted-foreground font-black">{s.gender || "Male"}</td>
                          <td className="p-4 text-right pr-6">
                            {isMale ? (
                              isActiveCR ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm border border-indigo-500/20">
                                  <Crown className="h-3.5 w-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                                  <span>CR Active</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    assignCRLR(crlrSectionId, s.name, crlrSection?.lrName || "")
                                    toast.success(`${s.name} is now assigned as CR!`)
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-indigo-500 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200"
                                >
                                  <Crown className="h-3.5 w-3.5" />
                                  <span>Set CR</span>
                                </button>
                              )
                            ) : (
                              isActiveLR ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-sm border border-rose-500/20">
                                  <Star className="h-3.5 w-3.5 text-amber-250 fill-amber-200 animate-pulse" />
                                  <span>LR Active</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    assignCRLR(crlrSectionId, crlrSection?.crName || "", s.name)
                                    toast.success(`${s.name} is now assigned as LR!`)
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-rose-500/20 active:scale-95 transition-all duration-200"
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  <span>Set LR</span>
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Faculty Config Modal */}
      {editingFacultyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingFacultyId(null)} />
          <form onSubmit={handleSaveEditFaculty} className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                Edit Faculty Details
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={() => setEditingFacultyId(null)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 text-xs font-bold">
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Faculty Code</label>
                <Input placeholder="e.g. CSE-F08" value={editFacCode} onChange={(e) => setEditFacCode(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Full Name</label>
                <Input placeholder="e.g. Dr. Kumar" value={editFacName} onChange={(e) => setEditFacName(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Email Address</label>
                <Input type="email" placeholder="e.g. kumar@mits.ac.in" value={editFacEmail} onChange={(e) => setEditFacEmail(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Phone Number</label>
                <Input placeholder="e.g. 9876543210" value={editFacPhone} onChange={(e) => setEditFacPhone(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" />
              </div>
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Max Weekly Workload (Hours)</label>
                <Input type="number" min="1" max="40" value={editFacWorkloadLimit} onChange={(e) => setEditFacWorkloadLimit(e.target.value)} className="h-9 text-xs font-semibold rounded-lg bg-input/40 text-foreground border-border/80" required />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setEditingFacultyId(null)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
              <Button type="submit" className="text-xs font-bold rounded-xl h-9 bg-primary text-primary-foreground">Save Changes</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
