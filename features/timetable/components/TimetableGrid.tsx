"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useTimetableStore, useAttendanceStore, useSharedStore, useAuthStore, useSessionStore, useAcademicStore, useConfirmStore } from "@/store"
import type { TimetableCell as TimetableCellType, SessionType, SessionRecord } from "@/types"
import { useClock } from "@/hooks/useClock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "react-toastify"
import {
  Calendar,
  Check,
  AlertTriangle,
  Presentation,
  Settings as SettingsIcon,
  CalendarX,
  Slash,
  PlusCircle,
  UserCheck,
  Compass,
  GraduationCap,
  Coffee,
  X,
  Sliders,
  Edit2,
  FolderOpen,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { SUBJECT_ROOMS, SUBJECTS, SUBJECT_FACULTY } from "@/constants"
import { getLocalDateStringForDay } from "@/utils/date-helpers"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const displayTime = (slot: string) => slot.replace(/-/g, "–")

type CalculatedStatus =
  | "current"
  | "submitted"
  | "missed"
  | "upcoming"
  | "holiday"
  | "seminar"
  | "workshop"
  | "exam"
  | "cancelled"
  | "free-period"
  | "guest-lecture"
  | "industrial-visit"
  | "extra-class"

const stateStyles: Record<CalculatedStatus, string> = {
  current:
    "border-blue-400 dark:border-blue-600 bg-blue-500/10 dark:bg-blue-950/20 text-blue-900 dark:text-blue-400 shadow-[0_0_0_2.5px_rgba(59,130,246,0.6),0_0_24px_rgba(59,130,246,0.5)] font-extrabold scale-[1.01] animate-pulse hover:bg-blue-500/25 hover:border-blue-500 transition-all duration-200",
  submitted:
    "border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/15 text-emerald-900 dark:text-emerald-400 dark:border-emerald-800/60 hover:bg-emerald-100/50 hover:border-emerald-400 dark:hover:bg-emerald-950/30 transition-all duration-200",
  missed:
    "border-rose-300 bg-rose-50/70 dark:bg-rose-950/15 text-rose-900 dark:text-rose-400 dark:border-rose-800/60 hover:bg-rose-100/50 hover:border-rose-400 dark:hover:bg-rose-950/30 transition-all duration-200",
  upcoming:
    "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200",
  holiday:
    "border-slate-300 bg-slate-800/10 text-slate-500 dark:border-slate-855 dark:bg-slate-955/20 dark:text-slate-500 opacity-85 hover:bg-slate-800/15 transition-all duration-200",
  seminar:
    "border-purple-300 bg-purple-500/10 text-purple-900 dark:border-purple-800/60 dark:bg-purple-950/15 dark:text-purple-400 font-semibold hover:bg-purple-500/20 hover:border-purple-400 dark:hover:bg-purple-950/30 transition-all duration-200",
  workshop:
    "border-orange-300 bg-orange-500/10 text-orange-900 dark:border-orange-850/60 dark:bg-orange-950/15 dark:text-orange-400 font-semibold hover:bg-orange-500/20 hover:border-orange-400 dark:hover:bg-orange-950/30 transition-all duration-200",
  exam:
    "border-yellow-355 bg-yellow-500/10 text-yellow-905 dark:border-yellow-800/60 dark:bg-yellow-950/15 dark:text-yellow-405 font-semibold hover:bg-yellow-500/20 hover:border-yellow-400 dark:hover:bg-yellow-950/30 transition-all duration-200",
  cancelled:
    "border-slate-200 bg-slate-100/20 text-slate-450 dark:border-slate-800 dark:bg-slate-955/5 dark:text-slate-500 line-through opacity-60 hover:bg-slate-100/30 hover:border-slate-300 transition-all duration-200",
  "free-period":
    "border-slate-200 bg-slate-50/40 text-slate-450 dark:border-slate-800 dark:bg-slate-955/5 dark:text-slate-500 opacity-75 hover:bg-slate-100/40 hover:border-slate-300 transition-all duration-200",
  "guest-lecture":
    "border-blue-300 bg-blue-500/10 text-blue-900 dark:border-blue-800/60 dark:bg-blue-950/15 dark:text-blue-400 font-semibold hover:bg-blue-500/20 hover:border-blue-400 dark:hover:bg-blue-950/30 transition-all duration-200",
  "industrial-visit":
    "border-teal-350 bg-teal-500/10 text-teal-900 dark:border-teal-800/60 dark:bg-teal-955/15 dark:text-teal-400 font-semibold hover:bg-teal-500/20 hover:border-teal-400 dark:hover:bg-teal-955/30 transition-all duration-200",
  "extra-class":
    "border-emerald-300 bg-emerald-550/10 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-955/15 dark:text-emerald-400 font-semibold hover:bg-emerald-500/20 hover:border-emerald-400 dark:hover:bg-emerald-955/30 transition-all duration-200",
}

const stateLabel: Record<CalculatedStatus, string> = {
  current: "Current class",
  submitted: "Attendance completed",
  missed: "Attendance missing",
  upcoming: "Upcoming class",
  holiday: "Holiday (Not Required)",
  seminar: "Seminar (Not Required)",
  workshop: "Workshop (Not Required)",
  exam: "Examination (Optional)",
  cancelled: "Cancelled period",
  "free-period": "Free Hour",
  "guest-lecture": "Guest Lecture (Optional)",
  "industrial-visit": "Industrial Visit (Optional)",
  "extra-class": "Extra Class (Required)",
}

type MergedCell = {
  cell: Omit<TimetableCellType, "status"> & { status: CalculatedStatus }
  startSlot: string
  span: number
}

const dayToIndex: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const slotStartToMinutes = (slot: string): number => {
  const [time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

const slotEndToMinutes = (slot: string): number => {
  const [, time] = slot.split("-")
  const [hour, minute] = time.split(":").map(Number)
  return hour * 60 + minute
}

const getStatusIcon = (status: CalculatedStatus) => {
  switch (status) {
    case "submitted":
      return <Check className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
    case "missed":
      return <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
    case "seminar":
      return <Presentation className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
    case "workshop":
      return <SettingsIcon className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
    case "holiday":
      return <CalendarX className="h-4.5 w-4.5 text-slate-500" />
    case "cancelled":
      return <Slash className="h-4.5 w-4.5 text-slate-400" />
    case "extra-class":
      return <PlusCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
    case "guest-lecture":
      return <UserCheck className="h-4.5 w-4.5 text-blue-650 dark:text-blue-400" />
    case "industrial-visit":
      return <Compass className="h-4.5 w-4.5 text-teal-650 dark:text-teal-400" />
    case "exam":
      return <GraduationCap className="h-4.5 w-4.5 text-yellow-650 dark:text-yellow-400" />
    case "free-period":
      return <Coffee className="h-4.5 w-4.5 text-slate-450" />
    default:
      return null
  }
}

interface TimetableGridProps {
  readOnly?: boolean
  hideStatusColors?: boolean
}

export function TimetableGrid({ readOnly = false, hideStatusColors = false }: TimetableGridProps = {}) {
  const {
    timetable,
    timetables,
    currentSectionFilter,
    setSelectedCell,
    specialDays,
    updateTimetableEntry,
    addTimetableEntry,
    deleteTimetableEntry,
    loadTimetableForSection,
    timeSlots,
    updateTimeSlots,
    clearTimetable
  } = useTimetableStore()

  const slotToDataRow = useMemo(() => {
    const mapping: Record<string, number> = {}
    timeSlots.forEach((slot, index) => {
      mapping[slot] = index + 1
    })
    return mapping
  }, [timeSlots])

  const classSlots = useMemo(() => {
    return timeSlots.filter(s => !s.toLowerCase().includes("break"))
  }, [timeSlots])

  const { attendanceRecords } = useAttendanceStore()
  const { setCurrentPage } = useSharedStore()
  const { user } = useAuthStore()
  const confirm = useConfirmStore((state) => state.confirm)
  const { sections, batches, facultyList } = useAcademicStore()
  const { sessionRecords, saveSession, resetSession } = useSessionStore()
  const now = useClock(15000)

  // Auto-initialize currentSectionFilter and heal orphaned timetables
  useEffect(() => {
    if (sections.length > 0) {
      // 1. Check if the current filter is valid
      const isValid = sections.some(s => s.id === currentSectionFilter)
      let activeFilter = currentSectionFilter
      if (!isValid) {
        activeFilter = sections[0].id
        loadTimetableForSection(sections[0].id)
      }

      // 2. Auto-heal orphaned "sec-1" timetable if needed
      const hasSec1 = sections.some(s => s.id === "sec-1")
      if (!hasSec1) {
        const sec1Timetable = timetables["sec-1"] || []
        if (sec1Timetable.length > 0) {
          // Find first active section
          const targetSection = sections[0]
          const targetTimetable = timetables[targetSection.id] || []
          if (targetTimetable.length === 0) {
            const migrated = sec1Timetable.map(cell => ({
              ...cell,
              sectionId: targetSection.id,
              className: targetSection.name
            }))
            // Save and clear sec-1
            useTimetableStore.setState({
              timetables: {
                ...timetables,
                [targetSection.id]: migrated,
                "sec-1": []
              },
              timetable: activeFilter === targetSection.id ? migrated : timetable
            })
            toast.success(`Recovered timetable from deleted workspace to active section: ${targetSection.name}`)
          }
        }
      }
    }
  }, [sections, currentSectionFilter, timetables, loadTimetableForSection, timetable])

  // Interactive dialog states
  const [selectedCellForActions, setSelectedCellForActions] = useState<TimetableCellType | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<"regular" | "override">("regular")
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all")
  const [isTimeSlotsModalOpen, setIsTimeSlotsModalOpen] = useState(false)
  const [tempTimeSlots, setTempTimeSlots] = useState<string[]>([])

  // Form states
  const [formSubjectName, setFormSubjectName] = useState("")
  const [customSubjectName, setCustomSubjectName] = useState("")
  const [formSubjectCode, setFormSubjectCode] = useState("")
  const [formFacultyName, setFormFacultyName] = useState("")
  const [formRoom, setFormRoom] = useState("")
  const [customFacultyName, setCustomFacultyName] = useState("")
  const [overrideConflict, setOverrideConflict] = useState(false)
  const [overrideType, setOverrideType] = useState<SessionType>("regular")
  const [overrideNotes, setOverrideNotes] = useState("")
  const [formAttendanceRequired, setFormAttendanceRequired] = useState<"Required" | "Optional" | "Not Required">("Required")
  
  const selectedFacultyObj = null

  const availableSubjects = useMemo(() => {
    return Object.entries(SUBJECTS).map(([code, name]) => ({
      code,
      name: `${name} (${code})`
    }))
  }, [])
  
  // Custom scope states for overrides
  const [overrideScope, setOverrideScope] = useState<"single" | "batch" | "all" | "custom">("single")
  const [selectedOverrideSections, setSelectedOverrideSections] = useState<string[]>([])
  const [applyToEntireDay, setApplyToEntireDay] = useState(false)

  // Real-time conflict warning state
  const conflictDetails = useMemo(() => {
    if (editorMode !== "regular") return null
    const resolvedFaculty = formFacultyName === "other" ? customFacultyName.trim() : formFacultyName.trim()
    if (!selectedCellForActions || !resolvedFaculty || resolvedFaculty === "Assigned" || resolvedFaculty === "-" || resolvedFaculty.toLowerCase() === "free period") return null

    const day = selectedCellForActions.day
    const slot = selectedCellForActions.timeSlot
    const activeSection = currentSectionFilter

    for (const [secName, cells] of Object.entries(timetables || {})) {
      if (secName === activeSection) continue
      const overlap = cells.find(
        (c) => c.day === day && c.timeSlot === slot && c.facultyName.toLowerCase() === resolvedFaculty.toLowerCase()
      )
      if (overlap) {
        return { sectionName: secName, subject: overlap.subjectCode }
      }
    }
    return null
  }, [selectedCellForActions, formFacultyName, customFacultyName, timetables, currentSectionFilter, editorMode])

  const submittedCellIds = useMemo(() => {
    return new Set(attendanceRecords.flatMap((record) => record.cellIds || []))
  }, [attendanceRecords])

  const nowDay = now.getDay()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayName = days[nowDay - 1]

  const getDisplayStatus = (cell: TimetableCellType): CalculatedStatus => {
    if (hideStatusColors) {
      return "upcoming"
    }

    const cellDateStr = getLocalDateStringForDay(cell.day)
    const sessionKey = `${cellDateStr}_${cell.id}`
    const sessionRecord = sessionRecords?.[sessionKey]

    // Check if attendance was submitted for this class section, date, and cell/timeslot in the active records
    const hasRecordSubmitted = attendanceRecords.some(r => 
      r.date === cellDateStr && 
      (r.cellIds?.includes(cell.id) || (r.className === currentSectionFilter && r.timeSlot === cell.timeSlot))
    )

    if (cell.status === "submitted" || hasRecordSubmitted || sessionRecord?.attendanceStatus === "submitted") {
      return "submitted"
    }

    if (sessionRecord) {
      const type = sessionRecord.currentSessionType
      if (type === "seminar") return "seminar"
      if (type === "workshop") return "workshop"
      if (type === "holiday") return "holiday"
      if (type === "cancelled") return "cancelled"
      if (type === "free_hour") return "free-period"
      if (type === "guest_lecture") return "guest-lecture"
      if (type === "industrial_visit") return "industrial-visit"
      if (type === "examination") return "exam"
      if (type === "extra_class") return "extra-class"
    }

    const specialDay = specialDays?.[cellDateStr]
    let isSpecialDayActive = false
    const activeSection = sections.find(s => s.id === currentSectionFilter)

    if (specialDay) {
      // Scope (section/batch/all) check
      let scopeMatch = false
      if (!specialDay.scopeType || specialDay.scopeType === "all") {
        scopeMatch = true
      } else if (specialDay.scopeType === "batch") {
        if (activeSection && specialDay.scopeTargetIds?.includes(activeSection.batchId)) {
          scopeMatch = true
        }
      } else if (specialDay.scopeType === "section") {
        if (specialDay.scopeTargetIds?.includes(currentSectionFilter)) {
          scopeMatch = true
        }
      }

      // Period check: if periods is undefined/empty → applies to all periods
      const periodMatch = !specialDay.periods || specialDay.periods.length === 0
        || specialDay.periods.includes(cell.timeSlot)

      isSpecialDayActive = scopeMatch && periodMatch
    }

    if (isSpecialDayActive && specialDay) {
      if (specialDay.type === "holiday") return "holiday"
      if (specialDay.type === "examination") return "exam"
      if (specialDay.type === "event") return "seminar"
    }

    if (cell.type === "holiday") return "holiday"
    if (cell.type === "seminar") return "seminar"
    if (cell.type === "workshop") return "workshop"
    if (cell.type === "cancelled") return "cancelled"
    if (cell.type === "free-period") return "free-period"
    if (cell.type === "exam") return "exam"

    const cellDayIndex = dayToIndex[cell.day] ?? -1
    if (cellDayIndex < nowDay) {
      return "missed"
    }
    if (cellDayIndex > nowDay) {
      return "upcoming"
    }

    const start = slotStartToMinutes(cell.timeSlot)
    const end = slotEndToMinutes(cell.timeSlot)

    if (nowMinutes >= start && nowMinutes < end) {
      return "current"
    }
    if (nowMinutes >= end) {
      return "missed"
    }

    return "upcoming"
  }

  const timetableWithStatus = useMemo(
    () => timetable.map((cell) => ({ ...cell, status: getDisplayStatus(cell) })),
    [timetable, nowDay, nowMinutes, submittedCellIds, specialDays, sessionRecords]
  )

  const hasCurrentClassToday = useMemo(() => {
    if (!todayName) return false
    return timetableWithStatus.some((cell) => cell.day === todayName && cell.status === "current")
  }, [timetableWithStatus, todayName])

  const handleBlankClick = (day: string, slot: string) => {
    if (readOnly) return
    if (user?.role !== "hod") return

    const mockCell: TimetableCellType = {
      id: `temp-blank-${Date.now()}`,
      day,
      timeSlot: slot,
      subjectCode: "",
      subjectName: "",
      facultyName: "",
      status: "upcoming"
    }

    setSelectedCellForActions(mockCell)
    setFormSubjectName("")
    setCustomSubjectName("")
    setFormSubjectCode("")
    setFormFacultyName("")
    setCustomFacultyName("")
    setFormRoom("")
    setOverrideConflict(false)
    setEditorMode("regular")
    setOverrideType("regular")
    setOverrideNotes("")
    setOverrideScope("single")
    setSelectedOverrideSections([currentSectionFilter])
    setApplyToEntireDay(false)
    setFormAttendanceRequired("Required")
    setIsEditModalOpen(true)
  }

  const handleCellClick = (cell: TimetableCellType) => {
    if (readOnly) return

    if (user?.role === "hod") {
      setSelectedCellForActions(cell)
      setFormRoom(cell.roomName || SUBJECT_ROOMS[cell.subjectCode] || "Room 402")
      setFormAttendanceRequired(cell.attendanceRequired || "Required")

      setFormFacultyName(cell.facultyName || "")
      setCustomFacultyName("")

      const stdName = cell.subjectName || SUBJECTS[cell.subjectCode] || ""
      setFormSubjectName(stdName)
      setCustomSubjectName("")
      setFormSubjectCode(cell.subjectCode || "")
      
      const cellDateStr = getLocalDateStringForDay(cell.day)
      const sessionKey = `${cellDateStr}_${cell.id}`
      const sessionRecord = sessionRecords?.[sessionKey]
      
      if (sessionRecord) {
        setEditorMode("override")
        setOverrideType((sessionRecord?.currentSessionType || "regular") as SessionType)
        setOverrideNotes(sessionRecord?.notes || "")
      } else {
        setEditorMode("regular")
        setOverrideType("regular")
        setOverrideNotes("")
      }

      setOverrideScope("single")
      setSelectedOverrideSections([currentSectionFilter])
      setApplyToEntireDay(false)
      setIsEditModalOpen(true)
    } else {
      setSelectedCell(cell)
      setCurrentPage("mark-attendance")
    }
  }

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCellForActions) return

    if (editorMode === "regular") {
      if (!formSubjectCode.trim()) return
      const isNew = selectedCellForActions.id.startsWith("temp-blank-")
      
      const resolvedFacultyName = formFacultyName === "other"
        ? (customFacultyName.trim() || "-")
        : (formFacultyName.trim() || "Assigned")

      const resolvedSubjectName = formSubjectName === "other"
        ? (customSubjectName.trim() || "Free Period")
        : (formSubjectName.trim() || "Free Period")

      const resolvedSubjectCode = formSubjectCode.trim().toUpperCase() || "FREE"

      if (isNew) {
        addTimetableEntry({
          day: selectedCellForActions.day,
          timeSlot: selectedCellForActions.timeSlot,
          subjectCode: resolvedSubjectCode,
          subjectName: resolvedSubjectName,
          facultyName: resolvedFacultyName,
          roomName: formRoom,
          type: "regular",
          attendanceRequired: formAttendanceRequired
        })
        toast.success("Timetable entry added successfully!")
      } else {
        updateTimetableEntry(selectedCellForActions.id, {
          day: selectedCellForActions.day,
          timeSlot: selectedCellForActions.timeSlot,
          subjectCode: resolvedSubjectCode,
          subjectName: resolvedSubjectName,
          facultyName: resolvedFacultyName,
          roomName: formRoom,
          attendanceRequired: formAttendanceRequired
        })
        toast.success("Weekly timetable template updated successfully!")
      }
    } else {
      const cellDateStr = getLocalDateStringForDay(selectedCellForActions.day)
      let targetSectionIds: string[] = []
      const activeSection = sections.find(s => s.id === currentSectionFilter)

      if (overrideScope === "single") {
        targetSectionIds = [currentSectionFilter]
      } else if (overrideScope === "batch") {
        targetSectionIds = sections.filter(s => s.batchId === activeSection?.batchId).map(s => s.id)
      } else if (overrideScope === "all") {
        targetSectionIds = sections.map(s => s.id)
      } else if (overrideScope === "custom") {
        targetSectionIds = selectedOverrideSections
      }

      let count = 0
      targetSectionIds.forEach(secId => {
        const secCells = timetables[secId] || []
        const matchingCells = secCells.filter(c => {
          if (applyToEntireDay) {
            return c.day === selectedCellForActions.day
          }
          return c.day === selectedCellForActions.day && c.timeSlot === selectedCellForActions.timeSlot
        })

        matchingCells.forEach(targetCell => {
          const sessionKey = `${cellDateStr}_${targetCell.id}`

          let attendanceRequired: "Required" | "Optional" | "Not Required" = "Required"
          if (overrideType === "seminar" || overrideType === "workshop" || overrideType === "holiday" || overrideType === "cancelled" || overrideType === "free_hour") {
            attendanceRequired = "Not Required"
          } else if (overrideType === "guest_lecture" || overrideType === "industrial_visit" || overrideType === "examination") {
            attendanceRequired = "Optional"
          }

          const newRecord: SessionRecord = {
            id: sessionKey,
            date: cellDateStr,
            day: targetCell.day,
            period: targetCell.timeSlot,
            subjectCode: targetCell.subjectCode || "Special",
            subjectName: targetCell.subjectName || "Special Activity",
            facultyName: targetCell.facultyName || "HOD",
            roomName: targetCell.roomName || SUBJECT_ROOMS[targetCell.subjectCode] || "Room 402",
            originalSessionType: targetCell.type || "regular",
            currentSessionType: overrideType,
            attendanceRequired,
            attendanceStatus: overrideType === "holiday" || overrideType === "cancelled" ? "skipped" : "not_submitted",
            modifiedBy: `HOD - ${user?.name || "Dr. Ramesh"}`,
            modifiedTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            notes: overrideNotes,
          }

          saveSession(sessionKey, newRecord)
          count++
        })
      })

      toast.success(`Override declared: ${overrideType} applied to ${count} class period slots.`)
    }

    setIsEditModalOpen(false)
    setSelectedCellForActions(null)
  }

  const handleResetOverride = () => {
    if (!selectedCellForActions) return
    const cellDateStr = getLocalDateStringForDay(selectedCellForActions.day)
    const sessionKey = `${cellDateStr}_${selectedCellForActions.id}`
    
    resetSession(sessionKey)
    setIsEditModalOpen(false)
    setSelectedCellForActions(null)
    toast.info("Session override cleared")
  }

  const getCellForSlot = (day: string, timeSlot: string): TimetableCellType | null => {
    const cell = timetableWithStatus.find((cell) => cell.day === day && cell.timeSlot === timeSlot) || null
    if (cell && readOnly && cell.isPublished === false) {
      return null
    }
    return cell
  }

  const getMergedCellsForDay = (day: string): MergedCell[] => {
    const merged: MergedCell[] = []

    for (let i = 0; i < classSlots.length; i += 1) {
      const slot = classSlots[i]
      const current = getCellForSlot(day, slot)
      if (!current) continue

      let span = 1
      while (i + span < classSlots.length) {
        const nextSlot = classSlots[i + span]
        const nextCell = getCellForSlot(day, nextSlot)
        if (!nextCell || nextCell.subjectCode !== current.subjectCode || nextCell.status !== current.status) break
        span += 1
      }

      merged.push({ cell: current, startSlot: slot, span })
      i += span - 1
    }

    return merged
  }

  const occupiedRowsByDay: Record<string, Set<number>> = Object.fromEntries(days.map((day) => [day, new Set<number>()]))
  const mergedByDay: Record<string, MergedCell[]> = {}

  for (const day of days) {
    const merged = getMergedCellsForDay(day)
    mergedByDay[day] = merged

    for (const item of merged) {
      const startRow = slotToDataRow[item.startSlot]
      for (let row = startRow; row < startRow + item.span; row += 1) {
        occupiedRowsByDay[day].add(row)
      }
    }
  }

  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null)
  const todayIndex = nowDay - 1
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string>(
    todayIndex >= 0 && todayIndex <= 5 ? days[todayIndex] : "Monday"
  )

  return (
    <>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm relative animate-fade-in-up">
        <CardHeader className="pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Timetable
          </CardTitle>

          {!readOnly && (user?.role === "hod" || user?.role === "faculty") && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold shrink-0">
              <FolderOpen className="h-4.5 w-4.5 text-primary" />
              <span className="text-muted-foreground uppercase tracking-widest text-[9px]">Filter Timetable:</span>
              
              {/* Batch Select */}
              <select
                value={selectedBatchFilter}
                onChange={(e) => {
                  const batchId = e.target.value
                  setSelectedBatchFilter(batchId)
                  const batchSecs = batchId === "all" ? sections : sections.filter(s => s.batchId === batchId)
                  if (batchSecs.length > 0 && !batchSecs.some(s => s.id === currentSectionFilter)) {
                    loadTimetableForSection(batchSecs[0].id)
                  }
                }}
                className="bg-card border border-border text-xs font-bold rounded-xl h-8 px-2.5 focus:outline-none"
              >
                <option value="all">All Cohort Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Section Select */}
              <select
                value={currentSectionFilter}
                onChange={(e) => loadTimetableForSection(e.target.value)}
                className="bg-card border border-border text-xs font-bold rounded-xl h-8 px-2.5 focus:outline-none"
              >
                {(selectedBatchFilter === "all" ? sections : sections.filter(s => s.batchId === selectedBatchFilter)).map((sec) => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>

              {/* Edit Time Slots & Clear Timetable Buttons */}
              {user?.role === "hod" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTempTimeSlots([...timeSlots])
                      setIsTimeSlotsModalOpen(true)
                    }}
                    className="bg-card border border-border text-xs font-bold rounded-xl h-8 px-3.5 hover:bg-muted"
                  >
                    <Sliders className="h-3.5 w-3.5 mr-1 text-primary" />
                    Edit Time Slots
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const sectionName = sections.find(s => s.id === currentSectionFilter)?.name || "this section"
                      confirm({
                        title: "Clear Timetable",
                        message: `Are you sure you want to clear all weekly timetable slots for ${sectionName}? This will reset it to an empty template.`,
                        confirmText: "Clear All",
                        onConfirm: () => {
                          clearTimetable()
                          toast.success("Timetable slots cleared successfully.")
                        }
                      })
                    }}
                    className="bg-card border border-rose-500/20 text-rose-500 text-xs font-bold rounded-xl h-8 px-3.5 hover:bg-rose-50/50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear Timetable
                  </Button>
                </>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-6">
          {/* Mobile Tabbed Timetable View */}
          <div className="flex lg:hidden items-center justify-between border-b border-border/50 pb-2.5 mb-4 overflow-x-auto gap-2 scrollbar-none">
            {days.map((day) => {
              const isActive = mobileSelectedDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setMobileSelectedDay(day)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/15"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              )
            })}
          </div>

          <div className="flex lg:hidden flex-col gap-3">
            {timeSlots.map((slot) => {
              const isLunch = slot.toLowerCase().includes("break")
              if (isLunch) {
                return (
                  <div
                    key={slot}
                    className="flex items-center justify-center rounded-2xl border border-amber-300 bg-amber-500/10 py-4 text-xs font-black text-amber-850 dark:text-amber-400 uppercase tracking-widest shadow-sm"
                  >
                    ☕ {slot}
                  </div>
                )
              }

              // Check if there's a merged cell starting at this slot
              const item = mergedByDay[mobileSelectedDay]?.find(x => x.startSlot === slot)
              
              // Check if this slot is covered under a span starting at an earlier slot
              const isCovered = mergedByDay[mobileSelectedDay]?.some(x => {
                if (x.startSlot === slot) return false
                const startIndex = timeSlots.indexOf(x.startSlot)
                const currentIndex = timeSlots.indexOf(slot)
                return currentIndex > startIndex && currentIndex < startIndex + x.span
              })

              if (isCovered) return null // Don't render anything for covered slots

              if (item) {
                const { cell, span } = item
                const isMentorMentee = cell.subjectCode === "MM"
                const room = cell.roomName || SUBJECT_ROOMS[cell.subjectCode] || "Room 402"
                
                return (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={() => handleCellClick(cell)}
                    className={cn(
                      "relative group rounded-2xl border p-4 text-left transition-all duration-200 shadow-sm flex flex-col gap-2",
                      isMentorMentee
                        ? "border-purple-300 bg-purple-500/10 text-purple-900 dark:border-purple-800/60 dark:bg-purple-950/15 dark:text-purple-400"
                        : stateStyles[cell.status],
                      !readOnly && "cursor-pointer active:scale-98"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-75">
                          {slot} {span > 1 && `(${span} Hours)`}
                        </span>
                        <span className={cn(
                          "text-base font-extrabold tracking-tight text-foreground line-clamp-1",
                          cell.status === "cancelled" && "line-through opacity-65 text-muted-foreground"
                        )}>
                          {cell.subjectName || cell.subjectCode}
                        </span>
                      </div>
                      
                      {cell.status === "current" ? (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-655 dark:text-blue-400 animate-pulse border border-blue-500/35 flex items-center gap-1 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                          LIVE
                        </span>
                      ) : (
                        !isMentorMentee && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border",
                            cell.status === "submitted" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                            cell.status === "missed" && "bg-rose-500/10 text-rose-655 border-rose-500/30",
                            cell.status === "upcoming" && "bg-slate-500/10 text-slate-655 border-slate-500/30",
                            cell.status === "cancelled" && "bg-slate-500/15 text-slate-500 border-slate-500/20"
                          )}>
                            {cell.status}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground/80 font-bold border-t border-border/30 pt-2 mt-1">
                      <span>Room {room}</span>
                      <span>{cell.facultyName}</span>
                    </div>
                  </button>
                )
              }

              // Otherwise, it's a Free Hour!
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between rounded-2xl border border-dashed border-border/80 bg-secondary/10 px-4 py-3.5 text-xs text-muted-foreground/80 font-semibold"
                >
                  <span className="font-bold">{slot}</span>
                  <span className="font-black uppercase tracking-wider text-[10px]">Free Hour</span>
                </div>
              )
            })}
          </div>

          {/* Desktop Timetable View */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="min-w-[940px]">
              <div 
                className="grid grid-cols-[120px_repeat(6,minmax(120px,1fr))] gap-2 rounded-2xl border border-border/60 bg-muted/5 dark:bg-slate-900/10 p-2.5"
                style={{ gridTemplateRows: `48px repeat(${timeSlots.length}, 74px)` }}
              >
                <div className="flex items-center justify-center rounded-xl border border-border/70 bg-muted/65 px-2 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground shadow-sm">
                  Time
                </div>

                {days.map((day, index) => (
                  <div
                    key={day}
                    style={{ gridColumn: index + 2, gridRow: 1 }}
                    className={cn(
                      "relative z-0 flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-200",
                      todayIndex === index
                        ? "border-primary/50 bg-primary text-primary-foreground shadow-md shadow-primary/10"
                        : "border-border/65 bg-muted/40 text-muted-foreground/90 hover:bg-muted/60"
                    )}
                  >
                    {day}
                    {todayIndex === index && hasCurrentClassToday ? (
                      <span className="mt-0.5 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                        Current
                      </span>
                    ) : null}
                  </div>
                ))}

                {timeSlots.map((slot, index) => {
                  const isLunch = slot === "Lunch Break"
                  return (
                    <div
                      key={slot}
                      style={{ gridColumn: 1, gridRow: index + 2 }}
                      className={cn(
                        "relative z-0 flex items-center justify-center rounded-xl border px-2 py-3 text-[11px] font-extrabold shadow-sm transition-all duration-200",
                        isLunch
                          ? "border-amber-300 bg-amber-500/10 text-amber-850 dark:text-amber-400"
                          : "border-border/60 bg-muted/20 text-muted-foreground/80"
                      )}
                    >
                      {isLunch ? "Lunch" : displayTime(slot)}
                    </div>
                  )
                })}

                {timeSlots.map((slot, index) => {
                  if (!slot.toLowerCase().includes("break")) return null
                  return (
                    <div
                      key={`span-${slot}`}
                      style={{ gridColumn: "2 / span 6", gridRow: index + 2 }}
                      className="relative z-0 flex items-center justify-center rounded-xl border border-amber-300 bg-amber-500/10 px-2 py-4 text-xs font-black text-amber-850 dark:text-amber-400 uppercase tracking-widest shadow-sm"
                    >
                      {slot}
                    </div>
                  )
                })}

                {days.flatMap((day, dayIndex) =>
                  mergedByDay[day].map(({ cell, startSlot, span }) => {
                    const startRow = slotToDataRow[startSlot] + 1
                    const isMentorMentee = cell.subjectCode === "MM"
                    const isDisabled = false
                    const room = cell.roomName || SUBJECT_ROOMS[cell.subjectCode] || "Room 402"
                    const isHovered = hoveredCellId === cell.id
                    const isNearTop = startRow <= 4

                    return (
                      <button
                        key={cell.id}
                        type="button"
                        onClick={() => handleCellClick(cell)}
                        onMouseEnter={() => setHoveredCellId(cell.id)}
                        onMouseLeave={() => setHoveredCellId(null)}
                        disabled={isDisabled}
                        style={{
                          gridColumn: dayIndex + 2,
                          gridRow: `${startRow} / span ${span}`,
                          zIndex: isHovered ? 40 : 10,
                        }}
                        className={cn(
                          "relative group rounded-lg border px-3 py-3 text-left transition-all duration-200",
                          isMentorMentee
                            ? "border-purple-300 bg-purple-500/10 text-purple-900 dark:border-purple-800/60 dark:bg-purple-950/15 dark:text-purple-400"
                            : stateStyles[cell.status],
                          !readOnly && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                          readOnly && "cursor-default"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <span className={cn(
                            "text-[13px] font-extrabold tracking-wide truncate",
                            cell.status === "cancelled" && "line-through opacity-65 text-muted-foreground"
                          )}>
                            {cell.subjectName || cell.subjectCode}
                          </span>
                          {cell.status === "current" ? (
                            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-655 dark:text-blue-400 animate-pulse border border-blue-500/35 flex items-center gap-1 shrink-0">
                              <span className="h-1 w-1 rounded-full bg-blue-500 animate-ping" />
                              LIVE
                            </span>
                          ) : (
                            !isMentorMentee && getStatusIcon(cell.status)
                          )}
                        </div>


                        <div
                          style={isNearTop ? { top: "calc(100% + 8px)" } : { bottom: "calc(100% + 8px)" }}
                          className={cn(
                            "pointer-events-none absolute left-1/2 z-50 w-52 -translate-x-1/2 scale-95 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-900 dark:text-slate-100 opacity-0 shadow-xl transition-all duration-200 group-hover:scale-100 group-hover:opacity-100",
                            isNearTop ? "origin-top" : "origin-bottom"
                          )}
                        >
                          <div className="space-y-1.5 whitespace-normal">
                            <p className="font-extrabold text-[12px] text-foreground leading-snug">
                              {cell.subjectName}
                            </p>
                            <p className="font-bold text-primary">{cell.subjectCode}</p>
                            <div className="h-px bg-border/50 my-1" />
                            <p className="text-[11px]"><span className="text-muted-foreground">Faculty:</span> <span className="font-semibold text-foreground">{cell.facultyName}</span></p>
                            <p className="text-[11px]"><span className="text-muted-foreground">Room:</span> <span className="font-semibold text-foreground">{room}</span></p>
                            <p className="text-[11px]"><span className="text-muted-foreground">Time:</span> <span className="font-semibold text-foreground">{cell.timeSlot}</span></p>
                          </div>
                          <div className={cn(
                            "absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white dark:bg-slate-900",
                            isNearTop
                              ? "bottom-full left-1/2 translate-y-1/2 border-t border-l border-slate-200 dark:border-slate-800"
                              : "top-full left-1/2 -translate-y-1/2 border-b border-r border-slate-200 dark:border-slate-800"
                          )} />
                        </div>
                      </button>
                    )
                  })
                )}

                {days.flatMap((day, dayIndex) =>
                  classSlots
                    .filter((slot) => !occupiedRowsByDay[day].has(slotToDataRow[slot]))
                    .map((slot) => {
                      const isClickable = !readOnly && user?.role === "hod"
                      const Tag = isClickable ? "button" : "div"
                      return (
                        <Tag
                          key={`${day}-${slot}-blank`}
                          onClick={isClickable ? () => handleBlankClick(day, slot) : undefined}
                          type={isClickable ? "button" : undefined}
                          style={{ gridColumn: dayIndex + 2, gridRow: slotToDataRow[slot] + 1 }}
                          className={cn(
                            "flex items-center justify-center rounded-xl border border-border/30 bg-muted/5 transition-all duration-150",
                            isClickable ? "cursor-pointer hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm text-slate-400 hover:text-primary font-black" : "text-slate-400"
                          )}
                          title={isClickable ? `Click to schedule class on ${day} ${slot}` : `${day} ${slot} - Free Hour`}
                        >
                          <span className="text-xs font-bold">{isClickable ? "+" : "-"}</span>
                        </Tag>
                      )
                    })
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 rounded-xl border border-border/50 bg-secondary/10 p-4 text-xs font-bold text-muted-foreground">
            <span className="text-foreground">Timetable Legend:</span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Completed
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
              Current Class
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              Upcoming Class
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-border" />
              Free Hour
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Missed Class
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unified HOD Timetable Cell Editor Modal */}
      {isEditModalOpen && selectedCellForActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setIsEditModalOpen(false)
          }} />
          <form onSubmit={handleSaveSubmit} className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up space-y-4 text-xs font-bold">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Timetable Editor</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  {selectedCellForActions.day} • Slot {selectedCellForActions.timeSlot}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Conflict Warning Banner (weekly template mode) */}
            {conflictDetails && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl text-[11.5px] text-rose-700 dark:text-rose-455 leading-relaxed font-semibold">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <p>
                    <strong>Conflict:</strong> {formFacultyName} is already scheduled in <strong>{conflictDetails.sectionName}</strong> for {conflictDetails.subject} during this slot!
                  </p>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="overrideConflictCheck"
                    checked={overrideConflict}
                    onChange={(e) => setOverrideConflict(e.target.checked)}
                    className="rounded border-border text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  <label htmlFor="overrideConflictCheck" className="text-xs font-bold text-rose-500 select-none cursor-pointer">
                    I confirm and want to override this schedule conflict.
                  </label>
                </div>
              </div>
            )}

            {/* Unified Mode Selection Dropdown at the Top */}
            <div>
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Schedule Mode</label>
              <select
                value={editorMode}
                onChange={(e) => setEditorMode(e.target.value as "regular" | "override")}
                className="bg-input/40 border border-border text-xs font-bold rounded-lg h-9 w-full px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="regular">Weekly Template (Regular Class)</option>
                <option value="override">Daily Override (Temporary Change)</option>
              </select>
            </div>

            <div className="h-px bg-border/50 my-1" />

            {/* Mode 1: Regular Weekly Template Form */}
            {editorMode === "regular" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5 font-black">Faculty Name</label>
                  <Input
                    placeholder="e.g. Mr. Sivaraman"
                    value={formFacultyName}
                    onChange={(e) => setFormFacultyName(e.target.value)}
                    className="bg-input/40 text-xs font-semibold h-9 rounded-lg border border-border w-full focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5 font-black">Subject Name</label>
                  <Input
                    placeholder="e.g. Data Structures"
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="bg-input/40 text-xs font-semibold h-9 rounded-lg border border-border w-full focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5 font-black">Subject Code</label>
                  <Input
                    placeholder="e.g. 23CSM301"
                    value={formSubjectCode}
                    onChange={(e) => setFormSubjectCode(e.target.value)}
                    className="bg-input/40 text-xs font-semibold h-9 rounded-lg border border-border"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Classroom Room</label>
                  <Input
                    placeholder="e.g. Room 402"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="bg-input/40 text-xs font-semibold h-9 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Attendance Requirement</label>
                  <select
                    value={formAttendanceRequired}
                    onChange={(e) => setFormAttendanceRequired(e.target.value as any)}
                    className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Required">Required</option>
                    <option value="Optional">Optional</option>
                    <option value="Not Required">Not Required</option>
                  </select>
                </div>
              </div>
            )}

            {/* Mode 2: Daily Session Override Form */}
            {editorMode === "override" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Override Session Type</label>
                  <select
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value as SessionType)}
                    className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="regular">Regular Class</option>
                    <option value="lab">Lab Session</option>
                    <option value="seminar">Seminar / Event</option>
                    <option value="workshop">Workshop Training</option>
                    <option value="guest_lecture">Guest Lecture</option>
                    <option value="industrial_visit">Industrial Visit</option>
                    <option value="examination">Examination</option>
                    <option value="extra_class">Extra Class</option>
                    <option value="free_hour">Free Hour</option>
                    <option value="holiday">Holiday</option>
                    <option value="cancelled">Cancelled Period</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Apply Scope (Sections)</label>
                  <select
                    value={overrideScope}
                    onChange={(e) => {
                      const val = e.target.value as any
                      setOverrideScope(val)
                      if (val !== "custom") {
                        setSelectedOverrideSections([currentSectionFilter])
                      }
                    }}
                    className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="single">Currently Selected Section Only</option>
                    <option value="batch">All Sections of This Batch / Program</option>
                    <option value="all">All Sections in Department</option>
                    <option value="custom">Select Specific Sections...</option>
                  </select>
                </div>

                {overrideScope === "custom" && (
                  <div className="space-y-1.5 border border-border/60 bg-muted/20 p-2.5 rounded-xl max-h-[100px] overflow-y-auto">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Select Sections:</p>
                    {sections.map((sec) => (
                      <label key={sec.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOverrideSections.includes(sec.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOverrideSections([...selectedOverrideSections, sec.id])
                            } else {
                              setSelectedOverrideSections(selectedOverrideSections.filter(id => id !== sec.id))
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>{sec.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="applyToEntireDay"
                    checked={applyToEntireDay}
                    onChange={(e) => setApplyToEntireDay(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="applyToEntireDay" className="text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                    Apply to entire day (All periods of this day)
                  </label>
                </div>

                <div>
                  <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Reason / Optional Notes</label>
                  <textarea
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="e.g. Guest lecturer visiting from industry..."
                    className="w-full min-h-[90px] bg-input/40 border border-border text-xs font-semibold rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
              {editorMode === "regular" && !selectedCellForActions.id.startsWith("temp-blank-") ? (
                <div className="space-y-2 w-full">
                  <div className="flex gap-2 w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        confirm({
                          title: "Delete Timetable Entry",
                          message: "Are you sure you want to delete this weekly timetable entry? This cannot be undone.",
                          confirmText: "Delete",
                          onConfirm: () => {
                            deleteTimetableEntry(selectedCellForActions.id)
                            setIsEditModalOpen(false)
                            setSelectedCellForActions(null)
                            toast.success("Timetable entry deleted successfully.")
                          }
                        })
                      }}
                      className="flex-1 text-xs font-bold text-rose-500 rounded-xl h-9 hover:bg-rose-50/50 border border-rose-500/20"
                    >
                      Delete Entry
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 text-xs font-bold rounded-xl h-9"
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={!!conflictDetails && !overrideConflict}
                    className="w-full text-xs font-bold rounded-xl h-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 text-xs font-bold rounded-xl h-9"
                  >
                    Cancel
                  </Button>
                  {editorMode === "override" && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResetOverride}
                      className="flex-1 text-xs font-bold text-rose-500 rounded-xl h-9 hover:bg-rose-50 border border-rose-500/20"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!!conflictDetails && !overrideConflict}
                    className="flex-1 text-xs font-bold rounded-xl h-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
      {isTimeSlotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTimeSlotsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in-up space-y-4 text-xs font-bold">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Edit Timetable Slots & Breaks</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  Configure period timings (e.g. 9:10-10:10) and break labels (e.g. Lunch Break)
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsTimeSlotsModalOpen(false)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {tempTimeSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-8 text-right font-semibold">#{index + 1}</span>
                  <Input
                    value={slot}
                    onChange={(e) => {
                      const updated = [...tempTimeSlots]
                      updated[index] = e.target.value
                      setTempTimeSlots(updated)
                    }}
                    placeholder="e.g. 9:10-10:10 or Lunch Break"
                    className="bg-input/40 text-xs font-semibold h-9 rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTempTimeSlots(tempTimeSlots.filter((_, i) => i !== index))
                    }}
                    className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-2 border-t border-border/50 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTempTimeSlots([...tempTimeSlots, ""])
                }}
                className="text-xs font-bold rounded-xl h-9 flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4 text-primary" />
                Add Row / Break
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTimeSlotsModalOpen(false)} className="text-xs font-bold rounded-xl h-9">Cancel</Button>
                <Button
                  type="button"
                  onClick={() => {
                    const validSlots = tempTimeSlots.map(s => s.trim()).filter(Boolean)
                    if (validSlots.length === 0) {
                      toast.error("You must have at least one time slot or break.")
                      return
                    }
                    updateTimeSlots(validSlots)
                    setIsTimeSlotsModalOpen(false)
                    toast.success("Timetable slots and breaks updated successfully!")
                  }}
                  className="text-xs font-bold rounded-xl h-9"
                >
                  Save Slots
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
