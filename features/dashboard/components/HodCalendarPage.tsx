"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { useTimetableStore, useAcademicStore } from "@/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CalendarX,
  Presentation,
  Settings as SettingsIcon,
  Slash,
  PlusCircle,
  UserCheck,
  Compass,
  GraduationCap,
  Sparkles,
} from "lucide-react"

const categories = [
  { value: "holiday", label: "Holiday (Not Required)", icon: CalendarX, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  { value: "event", label: "Seminar / Department Event", icon: Presentation, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { value: "examination", label: "Examination (Optional)", icon: GraduationCap, color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20" },
  { value: "workshop", label: "Workshop Training", icon: SettingsIcon, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { value: "guest_lecture", label: "Guest Lecture", icon: UserCheck, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "industrial_visit", label: "Industrial Visit", icon: Compass, color: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
]

export function HodCalendarPage() {
  const { specialDays, setSpecialDay, timeSlots } = useTimetableStore()
  const { sections, batches } = useAcademicStore()

  // Form states
  const [date, setDate] = useState("")
  const [type, setType] = useState("holiday")
  const [reason, setReason] = useState("")
  const [selectedCalendarBatch, setSelectedCalendarBatch] = useState("all")
  // Multi-select sections: empty = all
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([])
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  // Multi-select periods: empty = all
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [rightPanelTab, setRightPanelTab] = useState<"grid" | "list">("grid")

  const classTimeSlots = timeSlots.filter(s => !s.toLowerCase().includes("break"))

  const availableSections = selectedCalendarBatch === "all"
    ? sections
    : sections.filter(s => s.batchId === selectedCalendarBatch)

  const toggleSection = (id: string) => {
    setSelectedSectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const togglePeriod = (slot: string) => {
    setSelectedPeriods(prev =>
      prev.includes(slot) ? prev.filter(x => x !== slot) : [...prev, slot]
    )
  }

  const allPeriodsSelected = selectedPeriods.length === 0 || selectedPeriods.length === classTimeSlots.length

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) {
      toast.error("Please select a valid date")
      return
    }

    let scopeType: "all" | "batch" | "section" = "all"
    let scopeTargetIds: string[] = []
    let scopeLabel = "All Batches & Sections"

    if (selectedSectionIds.length > 0) {
      scopeType = "section"
      scopeTargetIds = selectedSectionIds
      scopeLabel = selectedSectionIds.map(id => sections.find(s => s.id === id)?.name || id).join(", ")
    } else if (selectedCalendarBatch !== "all") {
      scopeType = "batch"
      scopeTargetIds = [selectedCalendarBatch]
      scopeLabel = batches.find(b => b.id === selectedCalendarBatch)?.name || "Batch"
    }

    const periodsToSave = allPeriodsSelected ? [] : selectedPeriods
    const periodLabel = periodsToSave.length === 0 ? "All Periods" : periodsToSave.map((_p, i) => `P${classTimeSlots.indexOf(_p) + 1}`).join(", ")
    const displayReason = `${reason || "Declared"} (${scopeLabel} · ${periodLabel})`

    setSpecialDay(date, type as any, displayReason, scopeType, scopeTargetIds, periodsToSave)
    toast.success(`Override saved for ${date}!`)

    // Reset form
    setDate("")
    setReason("")
    setSelectedCalendarBatch("all")
    setSelectedSectionIds([])
    setSelectedPeriods([])
  }

  const handleRemoveOverride = (key: string) => {
    setSpecialDay(key, null)
    toast.info(`Override removed for ${key}`)
  }

  const getCategoryMeta = (val: string) => {
    return categories.find((c) => c.value === val) || { icon: CalendarIcon, label: val, color: "text-muted-foreground bg-muted" }
  }

  // Generate days in a simple list view for premium presentation
  const overridesList = Object.entries(specialDays).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Special Days Calendar</h1>
        <p className="text-xs font-semibold text-muted-foreground">
          Declare holidays, seminars, guest lectures, and exams. These dynamically override standard weekly timetables.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form panel */}
        <Card className="lg:col-span-1 border-border/50 bg-card/80 backdrop-blur-sm shadow-sm h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Declare Override
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddOverride} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Target Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-input/40 text-xs font-semibold h-9 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Override Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Target Batch</label>
                <select
                  value={selectedCalendarBatch}
                  onChange={(e) => {
                    setSelectedCalendarBatch(e.target.value)
                    setSelectedSectionIds([])
                  }}
                  className="bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Multi-select sections dropdown */}
              <div className="relative">
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Target Sections</label>
                <button
                  type="button"
                  onClick={() => { setSectionDropdownOpen(o => !o); setPeriodDropdownOpen(false) }}
                  className="w-full bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 px-3 flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="truncate">
                    {selectedSectionIds.length === 0
                      ? "All Sections"
                      : selectedSectionIds.map(id => availableSections.find(s => s.id === id)?.name || id).join(", ")}
                  </span>
                  <svg className={cn("h-3.5 w-3.5 transition-transform", sectionDropdownOpen && "rotate-180")} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </button>
                {sectionDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionIds([])}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs font-black border-b border-border/50 hover:bg-secondary/40 transition-colors",
                        selectedSectionIds.length === 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      ✓ All Sections
                    </button>
                    {availableSections.map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-secondary/40 transition-colors flex items-center justify-between",
                          selectedSectionIds.includes(sec.id) ? "text-primary bg-primary/5" : "text-foreground"
                        )}
                      >
                        {sec.name}
                        {selectedSectionIds.includes(sec.id) && <span className="h-2 w-2 rounded-full bg-primary"/>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-select periods dropdown */}
              <div className="relative">
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Target Periods</label>
                <button
                  type="button"
                  onClick={() => { setPeriodDropdownOpen(o => !o); setSectionDropdownOpen(false) }}
                  className="w-full bg-input/40 border border-border text-xs font-semibold rounded-lg h-9 px-3 flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="truncate">
                    {selectedPeriods.length === 0
                      ? "All Periods"
                      : selectedPeriods.map(slot => `P${classTimeSlots.indexOf(slot) + 1}: ${slot}`).join(", ")}
                  </span>
                  <svg className={cn("h-3.5 w-3.5 transition-transform", periodDropdownOpen && "rotate-180")} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </button>
                {periodDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedPeriods([])}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs font-black border-b border-border/50 hover:bg-secondary/40 transition-colors",
                        selectedPeriods.length === 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      ✓ All Periods
                    </button>
                    {classTimeSlots.map((slot, idx) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => togglePeriod(slot)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-secondary/40 transition-colors flex items-center justify-between",
                          selectedPeriods.includes(slot) ? "text-primary bg-primary/5" : "text-foreground"
                        )}
                      >
                        <span>Period {idx + 1} <span className="text-muted-foreground">({slot})</span></span>
                        {selectedPeriods.includes(slot) && <span className="h-2 w-2 rounded-full bg-primary"/>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1.5">Reason / Notes</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. National holiday / IEEE guest assembly"
                  className="w-full min-h-[80px] bg-input/40 border border-border text-xs font-semibold rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button type="submit" className="w-full text-xs font-bold rounded-xl mt-2 h-9">
                <Plus className="mr-1.5 h-4 w-4" />
                Apply Calendar Override
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List of active overrides / Monthly Calendar Grid */}
        <Card className="lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Department Calendar
            </CardTitle>
            <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-muted/20">
              <Button
                type="button"
                variant={rightPanelTab === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRightPanelTab("grid")}
                className="h-6 px-2.5 text-[9px] uppercase font-black tracking-wider rounded-md"
              >
                Calendar Grid
              </Button>
              <Button
                type="button"
                variant={rightPanelTab === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRightPanelTab("list")}
                className="h-6 px-2.5 text-[9px] uppercase font-black tracking-wider rounded-md"
              >
                List View ({overridesList.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rightPanelTab === "grid" ? (
              <div className="space-y-4">
                {/* Month navigation header */}
                <div className="flex justify-between items-center bg-secondary/15 px-3 py-1.5 rounded-xl border border-border/40">
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                    {[
                      "January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"
                    ][currentMonth]} {currentYear}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11)
                          setCurrentYear(y => y - 1)
                        } else {
                          setCurrentMonth(m => m - 1)
                        }
                      }}
                      className="h-6 px-2 text-[9px] uppercase font-bold rounded-lg"
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0)
                          setCurrentYear(y => y + 1)
                        } else {
                          setCurrentMonth(m => m + 1)
                        }
                      }}
                      className="h-6 px-2 text-[9px] uppercase font-bold rounded-lg"
                    >
                      Next
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid wrapper */}
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-1 text-center border-b border-border/40 pb-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(dayName => (
                      <div key={dayName} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 py-0.5">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {/* Empty cell placeholders */}
                    {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="aspect-square bg-muted/5 border border-transparent rounded-xl" />
                    ))}

                    {/* Day numbers */}
                    {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }).map((_, idx) => {
                      const dayNum = idx + 1
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                      const override = specialDays[dateStr]
                      const meta = override ? getCategoryMeta(override.type) : null
                      const isSelected = date === dateStr

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => setDate(dateStr)}
                          className={cn(
                            "aspect-square flex flex-col justify-between p-1.5 border rounded-xl text-left transition-all duration-200 cursor-pointer hover:border-primary/50 hover:scale-[1.03]",
                            isSelected ? "border-primary ring-1 ring-primary/25 bg-primary/5 shadow-sm" : "border-border/45 bg-card/25",
                            meta ? `${meta.color} font-black` : "text-foreground"
                          )}
                        >
                          <span className="text-[10px] font-bold">{dayNum}</span>
                          {override && meta && (
                            <span className="text-[7.5px] uppercase font-extrabold truncate max-w-full block leading-none select-none tracking-tight">
                              {meta.label.split(" (")[0].split(" ")[0]}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {overridesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="rounded-full bg-secondary/40 p-4 mb-3">
                      <CalendarIcon className="h-7 w-7 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-xs font-black text-foreground uppercase tracking-wider">No Overrides Declared</h3>
                    <p className="text-[11px] font-bold text-muted-foreground mt-1 max-w-[280px]">
                      All sections will follow their standard weekly timetable templates. Use the left panel to declare overrides.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          <th className="pb-3 pl-2">Date</th>
                          <th className="pb-3">Override Type</th>
                          <th className="pb-3">Reason & Scope</th>
                          <th className="pb-3 pr-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-xs font-semibold">
                        {overridesList.map(([key, override]) => {
                          const meta = getCategoryMeta(override.type)
                          const Icon = meta.icon
                          return (
                            <tr key={key} className="hover:bg-secondary/15 transition-colors group">
                              <td className="py-3.5 pl-2 text-foreground font-bold">
                                {new Date(key).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${meta.color}`}>
                                  <Icon className="h-3 w-3" />
                                  {meta.label.split(" (")[0]}
                                </span>
                              </td>
                              <td className="py-3.5 max-w-[220px] truncate text-muted-foreground leading-snug">
                                {override.reason || "Declared Override"}
                              </td>
                              <td className="py-3.5 pr-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveOverride(key)}
                                  className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
