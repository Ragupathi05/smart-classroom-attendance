"use client"

import { useEffect, useState } from "react"
import { useAuthStore, useSharedStore, useTimetableStore, useAttendanceStore } from "@/store"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { Dashboard } from "./DashboardPage"
import { MarkAttendance } from "@/features/attendance/pages/AttendancePage"
import { AttendanceHistory } from "@/features/history/pages/AttendanceHistoryPage"
import { CorrectionRequests } from "@/features/corrections/pages/CorrectionRequestsPage"
import { Analytics } from "@/features/analytics/pages/AnalyticsPage"
import { Settings } from "@/features/settings/pages/SettingsPage"
import { ProfilePage } from "@/features/profile/pages/ProfilePage"
import { TimetableEditorPage } from "@/features/timetable/pages/TimetableEditorPage"
import { StudentManagerPage } from "@/features/student-manager/pages/StudentManagerPage"
import { Toaster } from "@/components/ui/toaster"
import { Spinner } from "@/components/ui/spinner"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export function AttendanceApp() {
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const { currentPage } = useSharedStore()
  const { ensureWeeklyTimetableReset } = useTimetableStore()
  const { hydrateAttendanceRecords } = useAttendanceStore()

  useEffect(() => {
    ensureWeeklyTimetableReset()
    hydrateAttendanceRecords()
    setMounted(true)
  }, [ensureWeeklyTimetableReset, hydrateAttendanceRecords])

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
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />
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
      case "profile":
        return <ProfilePage />
      case "timetable-editor":
        return <TimetableEditorPage />
      case "student-manager":
        return <StudentManagerPage />
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </div>
  )
}
