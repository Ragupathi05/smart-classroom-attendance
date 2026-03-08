"use client"

import { Check, AlertTriangle, Clock, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { type TimetableCell as TimetableCellType } from "@/lib/store"
import { Badge } from "@/components/ui/badge"

interface TimetableCellProps {
  cell: TimetableCellType
  onClick: (cell: TimetableCellType) => void
  disabled?: boolean
  variant?: "default" | "mobile"
}

export function TimetableCell({ cell, onClick, disabled, variant = "default" }: TimetableCellProps) {
  const statusStyles = {
    current: "border-primary ring-2 ring-primary/30",
    submitted: "border-primary/50 bg-primary/10",
    missed: "border-warning/50 bg-warning/10",
    upcoming: "border-border hover:border-muted-foreground/50",
  }

  const statusIcons = {
    current: <Clock className="h-3.5 w-3.5 text-primary" />,
    submitted: <Check className="h-3.5 w-3.5 text-primary" />,
    missed: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
    upcoming: null,
  }

  const statusBadges = {
    current: <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">Current</Badge>,
    submitted: <Badge variant="outline" className="border-primary/50 text-primary text-[10px] px-1.5 py-0">Done</Badge>,
    missed: <Badge variant="outline" className="border-warning/50 text-warning text-[10px] px-1.5 py-0">Missed</Badge>,
    upcoming: <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">Upcoming</Badge>,
  }

  // Mobile variant - horizontal card
  if (variant === "mobile") {
    return (
      <button
        onClick={() => onClick(cell)}
        disabled={disabled || cell.status === "submitted"}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border bg-card p-3 transition-all",
          statusStyles[cell.status],
          cell.status === "current" && "animate-pulse",
          !disabled && cell.status !== "submitted" && "active:scale-[0.98]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            cell.status === "current" && "bg-primary/20",
            cell.status === "submitted" && "bg-primary/10",
            cell.status === "missed" && "bg-warning/20",
            cell.status === "upcoming" && "bg-muted"
          )}>
            <span className={cn(
              "text-sm font-bold",
              cell.status === "current" && "text-primary",
              cell.status === "submitted" && "text-primary",
              cell.status === "missed" && "text-warning",
              cell.status === "upcoming" && "text-foreground"
            )}>
              {cell.subjectCode}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">{cell.subjectName}</p>
            <p className="text-xs text-muted-foreground">{cell.timeSlot}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadges[cell.status]}
          {!disabled && cell.status !== "submitted" && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
        "group relative flex h-full min-h-[80px] w-full flex-col items-center justify-center gap-1 rounded-lg border bg-card p-2 transition-all duration-200",
        statusStyles[cell.status],
        cell.status === "current" && "animate-pulse",
        !disabled && cell.status !== "submitted" && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {/* Status Icon */}
      <div className="absolute right-2 top-2">
        {statusIcons[cell.status]}
      </div>

      {/* Subject Code */}
      <span className={cn(
        "text-lg font-bold",
        cell.status === "current" && "text-primary",
        cell.status === "submitted" && "text-primary",
        cell.status === "missed" && "text-warning",
        cell.status === "upcoming" && "text-foreground"
      )}>
        {cell.subjectCode}
      </span>

      {/* Subject Name (on hover) */}
      <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {cell.subjectName}
      </span>

      {/* Status Badge */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        {statusBadges[cell.status]}
      </div>
    </button>
  )
}
