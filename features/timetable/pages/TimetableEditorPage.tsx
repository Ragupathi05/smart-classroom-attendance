"use client"

import React, { useMemo } from "react"
import { TimetableGrid } from "../components/TimetableGrid"
import { useTimetableStore } from "@/store"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { toast } from "react-toastify"

export function TimetableEditorPage() {
  const { timetable, currentSectionFilter, timetables } = useTimetableStore()
  
  const hasDrafts = useMemo(() => {
    return timetable.some(cell => cell.isPublished === false)
  }, [timetable])

  const handlePublish = () => {
    const updatedTimetable = timetable.map(cell => ({ ...cell, isPublished: true }))
    useTimetableStore.setState({
      timetables: {
        ...timetables,
        [currentSectionFilter]: updatedTimetable
      },
      timetable: updatedTimetable
    })
    toast.success("Timetable published successfully! Representatives can now mark attendance.")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">Timetable Editor</h1>
          <p className="text-muted-foreground text-xs font-semibold">
            Adjust weekly schedules, rooms, and subject mappings for class sections
          </p>
        </div>
        {hasDrafts && (
          <Button 
            onClick={handlePublish}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <AlertTriangle className="h-4 w-4" />
            Publish Draft Timetable
          </Button>
        )}
      </div>

      {hasDrafts && (
        <div className="p-4 border border-amber-500/25 bg-amber-500/5 rounded-2xl flex items-center gap-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-bold">Draft Schedule Detected</p>
            <p className="text-[11px] text-muted-foreground">This timetable contains unpublished slots carried forward during session promotion. Publish it to make it active for attendance tracking.</p>
          </div>
        </div>
      )}

      <TimetableGrid hideStatusColors={true} />
    </div>
  )
}
