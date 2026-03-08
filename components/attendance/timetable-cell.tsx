"use client"

import { Check, AlertTriangle, Clock, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { type TimetableCell as TimetableCellType } from "@/lib/store"

interface TimetableCellProps {
  cell: TimetableCellType
  onClick: (cell: TimetableCellType) => void
  disabled?: boolean
  variant?: "default" | "mobile"
}

export function TimetableCell({ cell, onClick, disabled, variant = "default" }: TimetableCellProps) {
  const statusConfig = {
    current: {
      border: "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10",
      bg: "bg-primary/5",
      iconBg: "bg-primary/20",
      textColor: "text-primary",
      icon: <Clock className="h-3.5 w-3.5" />,
      badge: { bg: "bg-primary", text: "text-primary-foreground", label: "Current" },
    },
    submitted: {
      border: "border-chart-2/30",
      bg: "bg-chart-2/5",
      iconBg: "bg-chart-2/20",
      textColor: "text-chart-2",
      icon: <Check className="h-3.5 w-3.5" />,
      badge: { bg: "bg-chart-2/10", text: "text-chart-2", label: "Done" },
    },
    missed: {
      border: "border-chart-3/30",
      bg: "bg-chart-3/5",
      iconBg: "bg-chart-3/20",
      textColor: "text-chart-3",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      badge: { bg: "bg-chart-3/10", text: "text-chart-3", label: "Missed" },
    },
    upcoming: {
      border: "border-border/50 hover:border-primary/30",
      bg: "bg-card hover:bg-secondary/50",
      iconBg: "bg-secondary",
      textColor: "text-foreground",
      icon: null,
      badge: { bg: "bg-secondary", text: "text-muted-foreground", label: "Upcoming" },
    },
  }

  const config = statusConfig[cell.status]

  // Mobile variant - horizontal card
  if (variant === "mobile") {
    return (
      <button
        onClick={() => onClick(cell)}
        disabled={disabled || cell.status === "submitted"}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl border p-4 transition-all duration-200",
          config.border,
          config.bg,
          cell.status === "current" && "animate-pulse-subtle",
          !disabled && cell.status !== "submitted" && "active:scale-[0.98]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            config.iconBg
          )}>
            <span className={cn("text-sm font-bold", config.textColor)}>
              {cell.subjectCode}
            </span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground">{cell.subjectName}</p>
            <p className="text-sm text-muted-foreground">{cell.timeSlot}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            config.badge.bg,
            config.badge.text
          )}>
            {config.badge.label}
          </span>
          {!disabled && cell.status !== "submitted" && (
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </div>
      </button>
    )
  }

  // Default variant - grid cell
  return (
    <button
      onClick={() => onClick(cell)}
      disabled={disabled || cell.status === "submitted"}
      className={cn(
        "group relative flex h-[72px] w-full flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-200",
        config.border,
        config.bg,
        cell.status === "current" && "animate-pulse-subtle",
        !disabled && cell.status !== "submitted" && "cursor-pointer hover:scale-[1.02] hover:shadow-lg",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {/* Status Icon */}
      {config.icon && (
        <div className={cn(
          "absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md",
          config.iconBg,
          config.textColor
        )}>
          {config.icon}
        </div>
      )}

      {/* Subject Code */}
      <span className={cn("text-base font-bold", config.textColor)}>
        {cell.subjectCode}
      </span>

      {/* Subject Name (truncated) */}
      <span className="max-w-[90%] truncate text-[10px] text-muted-foreground">
        {cell.subjectName}
      </span>
    </button>
  )
}
