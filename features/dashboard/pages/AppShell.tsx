"use client"

import { useEffect, useState } from "react"
import { useAuthStore, useSharedStore, useTimetableStore, useAttendanceStore, useAcademicStore } from "@/store"
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
import { WeeklyTimetablePage } from "@/features/timetable/pages/WeeklyTimetablePage"
import { StudentManagerPage } from "@/features/student-manager/pages/StudentManagerPage"
import { Toaster } from "@/components/ui/toaster"
import { Spinner } from "@/components/ui/spinner"
import { ToastContainer, toast } from "react-toastify"
import { cn } from "@/lib/utils"
import { HodAcademicPage } from "../components/HodAcademicPage"
import { HodPeoplePage } from "../components/HodPeoplePage"
import { AttendanceMonitoringPage } from "../components/AttendanceMonitoringPage"
import { HodNotificationsPage } from "../components/HodNotificationsPage"
import { FacultyTimetablePage } from "../components/FacultyTimetablePage"
import { CrLrTodaysClassesPage } from "../components/CrLrTodaysClassesPage"
import { HodCalendarPage } from "../components/HodCalendarPage"
import { GlobalConfirmationModal } from "@/components/ui/GlobalConfirmationModal"
import "react-toastify/dist/ReactToastify.css"

import { AppSyncService } from "@/services/AppSyncService"

export function AttendanceApp() {
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated } = useAuthStore()
  const { currentPage, sidebarCollapsed } = useSharedStore()
  const { ensureWeeklyTimetableReset } = useTimetableStore()
  const { hydrateAttendanceRecords } = useAttendanceStore()

  useEffect(() => {
    ensureWeeklyTimetableReset()
    hydrateAttendanceRecords()

    // Sync academic data from Supabase
    useAcademicStore.getState().syncWithSupabase().catch(console.error)

    // Fetch attendance records from Supabase and merge into local store
    AppSyncService.fetchAttendanceRecords().then((remoteRecords) => {
      if (remoteRecords.length > 0) {
        const { attendanceRecords } = useAttendanceStore.getState()
        const localIds = new Set(attendanceRecords.map((r: any) => r.id))
        const newRemote = remoteRecords.filter((r) => !localIds.has(r.id))
        if (newRemote.length > 0) {
          useAttendanceStore.setState((s: any) => ({
            attendanceRecords: [...newRemote, ...s.attendanceRecords]
          }))
        }
      }
    }).catch(console.error)

    // Fetch special days from Supabase and merge
    AppSyncService.fetchSpecialDays().then((remoteSpecialDays) => {
      if (Object.keys(remoteSpecialDays).length > 0) {
        useTimetableStore.setState((s) => ({
          specialDays: { ...remoteSpecialDays, ...s.specialDays }
        }))
      }
    }).catch(console.error)

    // Fetch timetable cells for current section from Supabase and merge
    const currentSection = useTimetableStore.getState().currentSectionFilter
    AppSyncService.fetchTimetableCells(currentSection).then((remoteCells) => {
      if (remoteCells.length > 0) {
        useTimetableStore.setState((s) => {
          const localCells = s.timetables[currentSection] || []
          const localIds = new Set(localCells.map((c) => c.id))
          const newCells = remoteCells.filter((c) => !localIds.has(c.id))
          const merged = [...localCells, ...newCells]
          return {
            timetables: { ...s.timetables, [currentSection]: merged },
            timetable: merged
          }
        })
      }
    }).catch(console.error)

    setMounted(true)
  }, [ensureWeeklyTimetableReset, hydrateAttendanceRecords])


  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0)
    }
  }, [currentPage])

  useEffect(() => {
    if (!isAuthenticated) return

    const isAppMode = () => {
      if (typeof window === "undefined") return false
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isMobileAppWrapper = !!(window as any).Capacitor || !!(window as any).cordova
      return isStandalone || isIOSStandalone || isMobileAppWrapper
    }

    const checkSession = () => {
      const authState = useAuthStore.getState()
      const now = Date.now()
      const isApp = isAppMode()

      if (isApp) {
        // App Mode: Expire after 7 days of inactivity
        const lastActive = authState.lastActivityTime || authState.sessionLoginTime || now
        const inactivityLimit = 7 * 24 * 60 * 60 * 1000
        if (now - lastActive > inactivityLimit) {
          toast.warn("Session expired due to inactivity. Please log in again.")
          authState.logout()
        }
      } else {
        // Web Site Mode: Expire exactly 3 hours after login
        const loginTime = authState.sessionLoginTime || now
        const sessionLimit = 3 * 60 * 60 * 1000
        if (now - loginTime > sessionLimit) {
          toast.warn("Login session expired (3 hours limit). Please log in again.")
          authState.logout()
        }
      }
    }

    const updateActivity = () => {
      if (isAppMode()) {
        useAuthStore.setState({ lastActivityTime: Date.now() })
      }
    }

    checkSession()

    let lastUpdate = Date.now()
    const handleInteraction = () => {
      const now = Date.now()
      if (now - lastUpdate > 10000) {
        lastUpdate = now
        updateActivity()
        checkSession()
      }
    }

    window.addEventListener("click", handleInteraction)
    window.addEventListener("keydown", handleInteraction)
    window.addEventListener("scroll", handleInteraction)

    const interval = setInterval(checkSession, 30000)

    return () => {
      window.removeEventListener("click", handleInteraction)
      window.removeEventListener("keydown", handleInteraction)
      window.removeEventListener("scroll", handleInteraction)
      clearInterval(interval)
    }
  }, [isAuthenticated])

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
      case "academic":
        return <HodAcademicPage />
      case "people":
        return <HodPeoplePage />
      case "attendance-monitoring":
        return <AttendanceMonitoringPage />
      case "notifications":
        return <HodNotificationsPage />
      case "calendar":
        return <HodCalendarPage />
      case "my-timetable":
        return <FacultyTimetablePage />
      case "todays-classes":
        return <CrLrTodaysClassesPage />
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
      case "weekly-timetable":
        return <WeeklyTimetablePage />
      case "student-manager":
        return <StudentManagerPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" suppressHydrationWarning>
      {/* Background Decorative Glows */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-primary/5 dark:bg-primary/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/3 blur-[150px] pointer-events-none" />
      
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <main className={cn(
        "pt-16 transition-all duration-300",
        sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
      )}>
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
      <GlobalConfirmationModal />
    </div>
  )
}
