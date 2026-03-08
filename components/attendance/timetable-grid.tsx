"use client"

import { useAppStore, type TimetableCell as TimetableCellType } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Calendar } from "lucide-react"

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const timeSlots = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "Lunch Break",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

const classSlots = ["9:10-10:10", "10:10-11:10", "11:10-12:10", "1:00-2:00", "2:00-3:00", "3:00-4:00", "4:00-5:00"]
const slotToDataRow: Record<string, number> = {
  "9:10-10:10": 1,
  "10:10-11:10": 2,
  "11:10-12:10": 3,
  "1:00-2:00": 5,
  "2:00-3:00": 6,
  "3:00-4:00": 7,
  "4:00-5:00": 8,
}

const displayTime = (slot: string) => slot.replace(/-/g, "–")

const stateStyles: Record<TimetableCellType["status"], string> = {
  current:
    "border-blue-500 bg-blue-50 text-blue-900 shadow-[0_0_0_1px_rgba(59,130,246,0.5),0_0_18px_rgba(59,130,246,0.45)] animate-pulse",
  submitted: "border-green-300 bg-green-100 text-green-900",
  missed: "border-yellow-300 bg-yellow-100 text-yellow-900",
  upcoming: "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
}

const stateLabel: Record<TimetableCellType["status"], string> = {
  current: "Current class",
  submitted: "Attendance completed",
  missed: "Attendance missing",
  upcoming: "Upcoming class",
}

type MergedCell = {
  cell: TimetableCellType
  startSlot: string
  span: number
}

export function TimetableGrid() {
  const { timetable, setSelectedCell, setCurrentPage, user } = useAppStore()

  const handleCellClick = (cell: TimetableCellType) => {
    if (user?.role === "faculty") return
    if (cell.subjectCode === "MM") return

    setSelectedCell(cell)
    setCurrentPage("mark-attendance")
  }

  const getCellForSlot = (day: string, timeSlot: string): TimetableCellType | null => {
    return timetable.find((cell) => cell.day === day && cell.timeSlot === timeSlot) || null
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
        if (!nextCell || nextCell.subjectCode !== current.subjectCode) break
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

  const todayIndex = new Date().getDay() - 1

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Weekly Timetable
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div className="grid grid-cols-[120px_repeat(6,minmax(120px,1fr))] grid-rows-[48px_repeat(8,74px)] gap-2">
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Time
              </div>

              {days.map((day, index) => (
                <div
                  key={day}
                  style={{ gridColumn: index + 2, gridRow: 1 }}
                  className={cn(
                    "flex items-center justify-center rounded-lg border px-2 py-3 text-sm font-semibold",
                    todayIndex === index
                      ? "border-blue-400 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  )}
                >
                  {day}
                </div>
              ))}

              {timeSlots.map((slot, index) => {
                const isLunch = slot === "Lunch Break"
                return (
                  <div
                    key={slot}
                    style={{ gridColumn: 1, gridRow: index + 2 }}
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-2 py-4 text-xs font-semibold",
                      isLunch ? "border-amber-300 bg-amber-100 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-700"
                    )}
                  >
                    {isLunch ? "Lunch" : displayTime(slot)}
                  </div>
                )
              })}

              <div
                style={{ gridColumn: "2 / span 6", gridRow: 5 }}
                className="flex items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-2 py-4 text-sm font-semibold text-amber-900"
              >
                Lunch Break
              </div>

              {days.flatMap((day, dayIndex) =>
                mergedByDay[day].map(({ cell, startSlot, span }) => {
                  const startRow = slotToDataRow[startSlot] + 1
                  const isMentorMentee = cell.subjectCode === "MM"
                  const statusIcon =
                    isMentorMentee ? "" : cell.status === "submitted" ? "✓" : cell.status === "missed" ? "⚠" : ""
                  const isDisabled = user?.role === "faculty" || isMentorMentee

                  return (
                    <button
                      key={cell.id}
                      type="button"
                      onClick={() => handleCellClick(cell)}
                      disabled={isDisabled}
                      style={{ gridColumn: dayIndex + 2, gridRow: `${startRow} / span ${span}` }}
                      className={cn(
                        "relative rounded-lg border px-2 py-3 text-left transition-all duration-200",
                        isMentorMentee ? "border-slate-300 bg-slate-100 text-slate-800" : stateStyles[cell.status],
                        !isDisabled && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
                        isDisabled && "cursor-not-allowed"
                      )}
                      title={
                        isMentorMentee
                          ? `${day} ${startSlot} - MM (Mentor - Mentee)`
                          : `${day} ${startSlot} - ${cell.subjectCode} (${stateLabel[cell.status]})`
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-base font-bold tracking-wide">{cell.subjectCode}</span>
                        {statusIcon ? <span className="text-base font-bold">{statusIcon}</span> : null}
                      </div>
                      <p className="mt-1 text-xs font-medium opacity-80">
                        {isMentorMentee
                          ? "Mentor - Mentee"
                          : span > 1
                          ? `${stateLabel[cell.status]} (${span} hrs)`
                          : stateLabel[cell.status]}
                      </p>
                    </button>
                  )
                })
              )}

              {days.flatMap((day, dayIndex) =>
                classSlots
                  .filter((slot) => !occupiedRowsByDay[day].has(slotToDataRow[slot]))
                  .map((slot) => (
                    <div
                      key={`${day}-${slot}-blank`}
                      style={{ gridColumn: dayIndex + 2, gridRow: slotToDataRow[slot] + 1 }}
                      className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
                      title={`${day} ${slot} - No class`}
                    >
                      <span className="text-xs text-slate-400">-</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <span className="font-semibold">Legend:</span>
          <span>Current class: glowing border + pulse</span>
          <span>Attendance completed: green + ✓</span>
          <span>Attendance missing: yellow + ⚠</span>
          <span>Upcoming class: normal card</span>
          <span>Continuous same subject: merged as one block</span>
        </div>
      </CardContent>
    </Card>
  )
}
