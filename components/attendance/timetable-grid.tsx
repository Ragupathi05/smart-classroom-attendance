"use client"

import { useAppStore, type TimetableCell as TimetableCellType } from "@/lib/store"
import { TimetableCell } from "./timetable-cell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const daysLong = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const timeSlots = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "Lunch",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

export function TimetableGrid() {
  const { timetable, setSelectedCell, setCurrentPage, user } = useAppStore()

  const handleCellClick = (cell: TimetableCellType) => {
    if (user?.role === "faculty") return
    if (cell.status === "submitted") return
    
    setSelectedCell(cell)
    setCurrentPage("mark-attendance")
  }

  const getCellForSlot = (dayLong: string, timeSlot: string): TimetableCellType | null => {
    if (timeSlot === "Lunch") return null
    return timetable.find((t) => t.day === dayLong && t.timeSlot === timeSlot.replace("Lunch", "Lunch Break")) || null
  }

  const currentDay = new Date().getDay()
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  // For mobile: show today's schedule as a list
  const todaySchedule = timetable.filter((cell) => cell.day === dayNames[currentDay])

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">Weekly Timetable</CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Mobile: Today's Schedule List */}
        <div className="space-y-3 lg:hidden">
          <p className="text-sm font-medium text-muted-foreground">
            {"Today's Schedule"} - {dayNames[currentDay]}
          </p>
          {todaySchedule.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySchedule.map((cell) => (
                <TimetableCell
                  key={cell.id}
                  cell={cell}
                  onClick={handleCellClick}
                  disabled={user?.role === "faculty"}
                  variant="mobile"
                />
              ))}
            </div>
          )}
          
          {/* Legend for mobile */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary/50" />
              <span className="text-xs text-muted-foreground">Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-warning" />
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full border border-border" />
              <span className="text-xs text-muted-foreground">Upcoming</span>
            </div>
          </div>
        </div>

        {/* Desktop: Full Grid */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row - Days */}
              <div className="mb-4 grid grid-cols-7 gap-2">
                <div className="flex h-10 items-center justify-center rounded-lg bg-muted px-2">
                  <span className="text-xs font-medium text-muted-foreground">Time</span>
                </div>
                {days.map((day, idx) => {
                  const isToday = dayNames[currentDay] === daysLong[idx]
                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex h-10 items-center justify-center rounded-lg px-2",
                        isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-medium",
                        isToday ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {day}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-3">
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-7 gap-2">
                    {/* Time Label */}
                    <div className="flex items-center justify-center rounded-lg bg-muted/50 px-2 py-3">
                      <span className="text-xs font-medium text-muted-foreground">{timeSlot}</span>
                    </div>

                    {/* Day Cells */}
                    {daysLong.map((day) => {
                      if (timeSlot === "Lunch") {
                        return (
                          <div
                            key={`${day}-lunch`}
                            className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30"
                          >
                            <span className="text-xs text-muted-foreground">Break</span>
                          </div>
                        )
                      }

                      const cell = getCellForSlot(day, timeSlot)
                      if (!cell) {
                        return (
                          <div
                            key={`${day}-${timeSlot}`}
                            className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border"
                          >
                            <span className="text-xs text-muted-foreground">-</span>
                          </div>
                        )
                      }

                      return (
                        <TimetableCell
                          key={cell.id}
                          cell={cell}
                          onClick={handleCellClick}
                          disabled={user?.role === "faculty"}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend for desktop */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Current Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary/50" />
              <span className="text-xs text-muted-foreground">Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border border-border" />
              <span className="text-xs text-muted-foreground">Upcoming</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
