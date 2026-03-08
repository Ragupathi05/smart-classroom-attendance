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
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { name: "Mark Attendance", icon: ClipboardCheck, page: "mark-attendance" },
  { name: "History", icon: History, page: "history" },
  { name: "Corrections", icon: FileEdit, page: "corrections" },
  { name: "Analytics", icon: BarChart3, page: "analytics" },
  { name: "Settings", icon: Settings, page: "settings" },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { currentPage, setCurrentPage, logout, user } = useAppStore()

  const handleNavClick = (page: string) => {
    setCurrentPage(page)
    onClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border/50 bg-sidebar transition-transform duration-300 ease-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">AttendEase</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Attendance System</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          {navigation.map((item, index) => {
            const isActive = currentPage === item.page
            const Icon = item.icon
            
            // Hide mark attendance for faculty
            if (item.page === "mark-attendance" && user?.role === "faculty") {
              return null
            }
            
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.page)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110"
                )} />
                <span className="truncate">{item.name}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
              </button>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-border/50 p-3">
          <div className="mb-3 rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar-accent/50 p-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.role === "cr" ? "Class Representative" : user?.role === "lr" ? "Ladies Representative" : "Faculty"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">{user?.class} | {user?.department}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
