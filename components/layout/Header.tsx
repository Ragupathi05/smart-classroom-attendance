"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Bell,
  Menu,
  Search,
  Moon,
  Sun,
  ChevronRight,
  User,
  Settings,
  LogOut,
  X,
  Command,
  BookOpen,
  Users,
  Calendar,
  CheckCircle,
} from "lucide-react"
import { useAuthStore, useSharedStore, useStudentStore, useAcademicStore } from "@/store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { currentPage, setCurrentPage, notifications, markNotificationsRead, sidebarCollapsed } = useSharedStore()
  const { classStudents } = useStudentStore()
  const { facultyList, sections } = useAcademicStore()

  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check local storage or document class for theme
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light"
    setTheme(nextTheme)
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  // Breadcrumbs resolver
  const breadcrumbs = useMemo(() => {
    const base = ["Dashboard"]
    switch (currentPage) {
      case "academic":
        return [...base, "Academic", "Programs & Sessions"]
      case "people":
        return [...base, "People", "Faculty Directory"]
      case "timetable-editor":
        return [...base, "Timetable Builder"]
      case "attendance-monitoring":
        return [...base, "Attendance", "Monitoring Center"]
      case "mark-attendance":
        return [...base, "Attendance", "Mark Attendance"]
      case "history":
        return [...base, "Attendance", "History Logs"]
      case "analytics":
        return [...base, "Analytics & Metrics"]
      case "settings":
        return [...base, "Settings"]
      case "profile":
        return [...base, "User Profile"]
      case "todays-classes":
        return [...base, "Today's Schedule"]
      case "my-timetable":
        return [...base, "My Timetable"]
      default:
        return base
    }
  }, [currentPage])

  // Instant Grouped Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const query = searchQuery.toLowerCase().trim()

    const studentsResult = classStudents
      .filter((s) => s.name.toLowerCase().includes(query) || s.rollNumber.toLowerCase().includes(query))
      .slice(0, 4)

    const facultyResult = facultyList
      .filter((f) => f.name.toLowerCase().includes(query) || f.code.toLowerCase().includes(query))
      .slice(0, 4)

    const sectionsResult = sections
      .filter((sec) => sec.name.toLowerCase().includes(query))
      .slice(0, 3)

    return {
      students: studentsResult,
      faculty: facultyResult,
      sections: sectionsResult,
    }
  }, [searchQuery, classStudents, facultyList, sections])

  const visibleNotifications = notifications
    .filter((n) => n.targetRole === "all" || n.targetRole === user?.role)
  const unreadCount = visibleNotifications.filter((n) => !n.read).length

  return (
    <>
      <header className={cn(
        "fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md transition-all duration-300 lg:px-6",
        sidebarCollapsed ? "lg:left-[72px]" : "lg:left-[280px]"
      )}>
        {/* Left Section: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-secondary lg:hidden"
            onClick={onMenuClick}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Breadcrumb component */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                <span className={cn(
                  idx === breadcrumbs.length - 1 ? "text-foreground font-black" : "text-muted-foreground/80 hover:text-foreground cursor-pointer"
                )} onClick={() => idx === 0 && setCurrentPage("dashboard")}>
                  {crumb}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active Session Indicator */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-border bg-card/65 px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Session: 2026-2027
          </div>

          {/* Command Palette Search Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="relative h-9 justify-start text-xs font-bold text-muted-foreground hover:bg-secondary/40 w-36 sm:w-44 rounded-xl border-border/80"
            type="button"
          >
            <Search className="mr-2 h-3.5 w-3.5" />
            Search...
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl hover:bg-secondary"
            type="button"
            title="Theme Toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative h-9 w-9 rounded-xl hover:bg-secondary"
            type="button"
            title="Notification Center"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Avatar Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-secondary/20 p-1 pr-2 transition-all duration-200 hover:border-border hover:bg-secondary/45"
              >
                <Avatar className="h-7 w-7 transition-transform duration-200 group-hover:scale-105">
                  <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[90px] truncate text-xs font-bold text-foreground sm:block">
                  {user?.name?.split(" ")[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel className="font-extrabold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentPage("profile")} className="font-semibold text-xs py-2">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                Profile Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentPage("settings")} className="font-semibold text-xs py-2">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="font-bold text-xs text-destructive focus:text-destructive py-2">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Slide-out Notification Drawer (Right Side) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md transform bg-card shadow-xl transition-all duration-300 ease-in-out border-l border-border animate-slide-in-right">
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Notification Drawer</h2>
                  {unreadCount > 0 && <Badge variant="destructive">{unreadCount} New</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      markNotificationsRead()
                      setDrawerOpen(false)
                    }}
                    className="text-[10px] font-black uppercase"
                  >
                    Mark All Read
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} className="rounded-xl">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="h-[calc(100vh-4rem)] overflow-y-auto p-6 space-y-4">
                {visibleNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-2">
                    <CheckCircle className="h-10 w-10 text-muted-foreground/45" />
                    <p className="text-xs font-bold uppercase tracking-wider">Inbox Clean</p>
                    <p className="text-[11px] font-semibold text-muted-foreground/75">You have no pending alerts.</p>
                  </div>
                ) : (
                  visibleNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-200 bg-card/65",
                        notif.read ? "border-border/60 opacity-70" : "border-primary/30 bg-primary/5 shadow-sm"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-foreground">{notif.title}</p>
                        {!notif.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-semibold mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-3">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Palette Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSearchOpen(false)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-300 animate-fade-in-up">
            <div className="flex items-center border-b border-border px-4 py-3">
              <Command className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type to search students, faculty, or sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ml-3 w-full bg-transparent text-sm text-foreground font-semibold placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {searchQuery.trim() === "" ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-semibold">
                  Type a name, roll number, or faculty code to lookup information instantly.
                </div>
              ) : (
                searchResults && (
                  <div className="space-y-4">
                    {/* Faculty Section */}
                    {searchResults.faculty.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Faculty members</p>
                        {searchResults.faculty.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              setCurrentPage("people")
                              setSearchOpen(false)
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-secondary/40 text-xs font-semibold text-foreground transition-all duration-150"
                          >
                            <span className="font-extrabold">{f.name}</span>
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-bold uppercase">{f.code}</Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Students Section */}
                    {searchResults.students.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Roster Students</p>
                        {searchResults.students.map((s) => (
                          <div
                            key={s.id}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-secondary/40 text-xs font-semibold text-foreground transition-all duration-150"
                          >
                            <span className="font-extrabold">{s.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.rollNumber}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sections Section */}
                    {searchResults.sections.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Academic Sections</p>
                        {searchResults.sections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => {
                              setCurrentPage("academic")
                              setSearchOpen(false)
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-secondary/40 text-xs font-semibold text-foreground transition-all duration-150"
                          >
                            <span className="font-extrabold">{sec.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{sec.year} - {sec.semester}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.faculty.length === 0 && searchResults.students.length === 0 && searchResults.sections.length === 0 && (
                      <div className="py-6 text-center text-xs text-muted-foreground font-semibold">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
