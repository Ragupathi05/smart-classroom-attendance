"use client"

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

export function AttendanceApp() {
  const { isAuthenticated, currentPage } = useAppStore()

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16">
        <div className="p-6">{renderPage()}</div>
      </main>
      <Toaster />
    </div>
  )
}
