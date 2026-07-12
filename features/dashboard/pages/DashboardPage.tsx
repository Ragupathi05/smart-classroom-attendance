"use client"

import React from "react"
import { DashboardHeader } from "../components/DashboardHeader"
import { CurrentClassCard } from "../components/CurrentClassCard"
import { ProgressCard } from "../components/ProgressCard"
import { QuickStats } from "../components/QuickStats"
import { TodaysWorkflow } from "../components/TodaysWorkflow"
import { QuickActions } from "../components/QuickActions"
import { NotificationsWidget } from "../components/NotificationsWidget"
import { MotivationCard } from "../components/MotivationCard"
import { TimetableGrid } from "@/features/timetable/components/TimetableGrid"

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Dynamic Welcome Greeting Header */}
      <DashboardHeader />

      {/* Row 1: Split layout for daily operational widgets */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Col span 2) - Priority cards and checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hero active class panel */}
            <CurrentClassCard />

            {/* Daily completions progress */}
            <ProgressCard />
          </div>

          {/* Chronological checklist timeline */}
          <TodaysWorkflow />
        </div>

        {/* Right Column (Col span 1) - Stats and notification sidebars */}
        <div className="space-y-6">
          {/* Actionable daily statistics */}
          <QuickStats />

          {/* Alert logs widget */}
          <NotificationsWidget />

          {/* Context-aware motivation phrase */}
          <MotivationCard />
        </div>
      </div>

      {/* Row 2: Full-width Weekly Timetable (Spans the entire screen width to prevent horizontal scrolling) */}
      <div className="w-full pt-2">
        <TimetableGrid />
      </div>

      {/* Row 3: Full-width Quick Actions footer */}
      <div className="w-full">
        <QuickActions />
      </div>
    </div>
  )
}
