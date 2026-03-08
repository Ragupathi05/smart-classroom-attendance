"use client"

import { useEffect, useState } from "react"
import { Bell, User, Menu, Calendar, Settings } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, setCurrentPage, notifications, markNotificationsRead } = useAppStore()
  const [time, setTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  const visibleNotifications = notifications
    .filter((notification) => notification.targetRole === "all" || notification.targetRole === user?.role)
    .slice(0, 5)
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md lg:left-64 lg:px-6">
      {/* Left: Menu + Date and Class */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 hover:bg-secondary lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <Calendar className="hidden h-3.5 w-3.5 sm:block" />
            <span>{mounted && time ? formatDate(time) : "Loading..."}</span>
          </div>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{user?.class} - {user?.department}</p>
        </div>
      </div>

      {/* Right: Clock, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Digital Clock */}
        <div className="hidden rounded-xl border border-border/50 bg-card/80 px-4 py-2 backdrop-blur-sm md:block">
          <p className="font-mono text-base font-bold tabular-nums text-primary">
            {mounted && time ? formatTime(time) : "--:--:-- --"}
          </p>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 hover:bg-secondary">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-chart-5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72" onCloseAutoFocus={markNotificationsRead}>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <span className="text-xs font-normal text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} new` : "No new"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleNotifications.length === 0 ? (
              <DropdownMenuItem className="py-3 text-xs text-muted-foreground" disabled>
                No notifications available
              </DropdownMenuItem>
            ) : (
              visibleNotifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-3">
                  <span className="text-sm font-medium">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">{notification.message}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary">
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {user?.role === "cr" ? "Class Rep" : user?.role === "lr" ? "Ladies Rep" : "Faculty"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
