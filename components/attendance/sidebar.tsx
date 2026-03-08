"use client"

import {
  LayoutDashboard,
  ClipboardCheck,
  History,
  FileEdit,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { name: "Mark Attendance", icon: ClipboardCheck, page: "mark-attendance" },
  { name: "Attendance History", icon: History, page: "history" },
  { name: "Correction Requests", icon: FileEdit, page: "corrections" },
  { name: "Reports & Analytics", icon: BarChart3, page: "analytics" },
  { name: "Settings", icon: Settings, page: "settings" },
]

export function Sidebar() {
  const { currentPage, setCurrentPage, logout, user } = useAppStore()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground">AttendEase</h1>
          <p className="text-xs text-muted-foreground">Smart Attendance</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = currentPage === item.page
          const Icon = item.icon
          
          // Hide mark attendance for faculty
          if (item.page === "mark-attendance" && user?.role === "faculty") {
            return null
          }
          
          return (
            <button
              key={item.name}
              onClick={() => setCurrentPage(item.page)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </button>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-border p-4">
        <div className="mb-3 rounded-lg bg-sidebar-accent p-3">
          <p className="text-sm font-medium text-sidebar-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">
            {user?.role === "cr" ? "Class Representative" : user?.role === "lr" ? "Ladies Representative" : "Faculty"}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
