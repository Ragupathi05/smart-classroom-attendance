"use client"

import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function AttendanceBar() {
  const { students } = useAppStore()

  const total = students.length
  const present = students.filter((s) => s.status === "present").length
  const permission = students.filter((s) => s.status === "permission").length
  const absent = students.filter((s) => s.status === "absent").length

  const presentPercent = (present / total) * 100
  const permissionPercent = (permission / total) * 100
  const absentPercent = (absent / total) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Attendance Distribution</span>
        <span className="font-medium text-foreground">
          {present}/{total} Present ({Math.round(presentPercent)}%)
        </span>
      </div>
      
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full transition-all duration-300">
          <div
            className={cn(
              "h-full bg-green-600 transition-all duration-300",
              presentPercent > 0 && "rounded-l-full"
            )}
            style={{ width: `${presentPercent}%` }}
          />
          <div
            className="h-full bg-warning transition-all duration-300"
            style={{ width: `${permissionPercent}%` }}
          />
          <div
            className={cn(
              "h-full bg-destructive transition-all duration-300",
              absentPercent > 0 && "rounded-r-full"
            )}
            style={{ width: `${absentPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
          <span className="text-muted-foreground">
            Present: {present} ({Math.round(presentPercent)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-warning" />
          <span className="text-muted-foreground">
            Permission: {permission} ({Math.round(permissionPercent)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="text-muted-foreground">
            Absent: {absent} ({Math.round(absentPercent)}%)
          </span>
        </div>
      </div>
    </div>
  )
}
