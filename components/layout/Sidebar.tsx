"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  Bell,
  Settings,
  History,
  User,
  FileEdit,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore, useSharedStore } from "@/store"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuthStore()
  const { currentPage, setCurrentPage, sidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useSharedStore()

  const handleNavClick = (page: string) => {
    setCurrentPage(page)
    onClose()
  }

  const getNavigation = () => {
    switch (user?.role) {
      case "hod":
        return [
          { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
          { name: "Academic", icon: GraduationCap, page: "academic" },
          { name: "Class Reps", icon: Users, page: "people" },
          { name: "Timetable", icon: CalendarDays, page: "timetable-editor" },
          { name: "Calendar", icon: Calendar, page: "calendar" },
          { name: "Attendance", icon: ClipboardCheck, page: "attendance-monitoring" },
          { name: "Analytics", icon: BarChart3, page: "analytics" },
          { name: "Notifications", icon: Bell, page: "notifications" },
        ]
      case "faculty":
        return [
          { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
          { name: "My Timetable", icon: CalendarDays, page: "my-timetable" },
          { name: "Attendance", icon: ClipboardCheck, page: "mark-attendance" },
          { name: "History", icon: History, page: "history" },
          { name: "Analytics", icon: BarChart3, page: "analytics" },
        ]
      case "cr":
      case "lr":
      default:
        return [
          { name: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
          { name: "History", icon: History, page: "history" },
          { name: "Analytics", icon: BarChart3, page: "analytics" },
          { name: "Notifications", icon: Bell, page: "notifications" },
          { name: "Weekly Timetable", icon: CalendarDays, page: "weekly-timetable" },
        ]
    }
  }

  const navigation = getNavigation()

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
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-out lg:translate-x-0",
          isOpen ? "translate-x-0 w-[280px]" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[72px]" : "w-[280px]"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in-up">
                <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">AttendEase</h1>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">MITS Dashboard</p>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-sidebar-accent text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-5 h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-all duration-200"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {!isCollapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground animate-fade-in-up">
              Workspace
            </p>
          )}
          {navigation.map((item, index) => {
            const isActive = currentPage === item.page
            const Icon = item.icon

            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.page)}
                className={cn(
                  "group flex w-full items-center gap-4 rounded-xl px-3.5 py-3 text-sm font-bold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-250",
                  !isActive && "group-hover:scale-110"
                )} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom Profile, Settings & Logout Section */}
        <div className="border-t border-border/50 p-3 space-y-1">
          {/* Settings button */}
          <button
            onClick={() => handleNavClick("settings")}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150",
              currentPage === "settings" && "bg-sidebar-accent text-sidebar-foreground"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* Profile button */}
          <button
            onClick={() => handleNavClick("profile")}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl px-3.5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150",
              currentPage === "profile" && "bg-sidebar-accent text-sidebar-foreground"
            )}
            title={isCollapsed ? "Profile" : undefined}
          >
            <User className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Profile</span>}
          </button>

          {/* Logout */}
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full justify-start gap-4 rounded-xl text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive font-bold px-3.5 py-2.5",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}
