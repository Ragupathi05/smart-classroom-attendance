"use client"

import { useEffect, useState } from "react"
import { useAppStore } from "@/lib/store"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { LoginPage } from "./login-page"
import { Dashboard } from "./dashboard"
import { MarkAttendance } from "./mark-attendance"
import { AttendanceHistory } from "./attendance-history"
import { CorrectionRequests } from "./correction-requests"
import { Analytics } from "./analytics"
import { Settings } from "./settings"
import { Toaster } from "@/components/ui/toaster"
import { Spinner } from "@/components/ui/spinner"

export function AttendanceApp() {
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, currentPage, ensureWeeklyTimetableReset } = useAppStore()

  useEffect(() => {
    ensureWeeklyTimetableReset()
    setMounted(true)
  }, [ensureWeeklyTimetableReset])

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "mark-attendance":
        return <MarkAttendance />
      case "history":
        return <AttendanceHistory />
      case "corrections":
        return <CorrectionRequests />
      case "analytics":
        return <Analytics />
      case "settings":
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <main className="pt-16 lg:ml-64">
        <div className="p-4 sm:p-6">{renderPage()}</div>
      </main>
      <Toaster />
    </div>
  )
}
