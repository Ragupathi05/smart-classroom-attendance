"use client"

import React from "react"
import { TimetableGrid } from "@/features/timetable/components/TimetableGrid"

export function WeeklyTimetablePage() {
  return <TimetableGrid readOnly={true} />
}
