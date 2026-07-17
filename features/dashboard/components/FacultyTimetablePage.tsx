"use client"

import { TimetableGrid } from "@/features/timetable/components/TimetableGrid"

export function FacultyTimetablePage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">My Timetable</h1>
        <p className="text-xs text-muted-foreground font-semibold">Weekly teaching classes timetable schedule grid and hour details</p>
      </div>
      <div className="w-full pt-2">
        <TimetableGrid />
      </div>
    </div>
  )
}
