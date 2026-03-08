"use client"

import { useAppStore, type TimetableCell as TimetableCellType } from "@/lib/store"
import { TimetableCell } from "./timetable-cell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Calendar, Clock } from "lucide-react"

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
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Weekly Timetable
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Mobile: Today's Schedule List */}
        <div className="space-y-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">
              {"Today's Schedule"}
            </p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {dayNames[currentDay]}
            </span>
          </div>
          
          {todaySchedule.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/50 bg-secondary/30 p-8 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySchedule.map((cell, index) => (
                <div
                  key={cell.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TimetableCell
                    cell={cell}
                    onClick={handleCellClick}
                    disabled={user?.role === "faculty"}
                    variant="mobile"
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Legend for mobile */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-secondary/30 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
              <span className="text-xs text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-chart-2" />
              <span className="text-xs text-muted-foreground">Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-chart-3" />
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Upcoming</span>
            </div>
          </div>
        </div>

        {/* Desktop: Full Grid */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row - Days */}
              <div className="mb-3 grid grid-cols-7 gap-2">
                <div className="flex h-12 items-center justify-center rounded-xl bg-secondary/50 px-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</span>
                </div>
                {days.map((day, idx) => {
                  const isToday = dayNames[currentDay] === daysLong[idx]
                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex h-12 items-center justify-center rounded-xl px-2 transition-all duration-300",
                        isToday 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "bg-secondary/50"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        isToday ? "text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {day}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-2">
                {timeSlots.map((timeSlot, slotIdx) => (
                  <div 
                    key={timeSlot} 
                    className="grid grid-cols-7 gap-2"
                    style={{ animationDelay: `${slotIdx * 30}ms` }}
                  >
                    {/* Time Label */}
                    <div className="flex items-center justify-center rounded-xl bg-secondary/30 px-2 py-4">
                      <span className="text-xs font-medium text-muted-foreground">{timeSlot}</span>
                    </div>

                    {/* Day Cells */}
                    {daysLong.map((day) => {
                      if (timeSlot === "Lunch") {
                        return (
                          <div
                            key={`${day}-lunch`}
                            className="flex h-[72px] items-center justify-center rounded-xl border border-dashed border-border/30 bg-secondary/20"
                          >
                            <span className="text-xs text-muted-foreground/60">Lunch</span>
                          </div>
                        )
                      }

                      const cell = getCellForSlot(day, timeSlot)
                      if (!cell) {
                        return (
                          <div
                            key={`${day}-${timeSlot}`}
                            className="flex h-[72px] items-center justify-center rounded-xl border border-dashed border-border/30"
                          >
                            <span className="text-xs text-muted-foreground/40">-</span>
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
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl border border-border/50 bg-secondary/30 p-4">
            <span className="text-xs font-medium text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary shadow-sm shadow-primary/50" />
              <span className="text-xs text-muted-foreground">Current Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-2" />
              <span className="text-xs text-muted-foreground">Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-chart-3" />
              <span className="text-xs text-muted-foreground">Missed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">Upcoming</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
