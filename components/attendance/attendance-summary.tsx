"use client"

import { Users, UserCheck, UserMinus, Clock } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"

export function AttendanceSummary() {
  const { students } = useAppStore()

  const total = students.length
  const present = students.filter((s) => s.status === "present").length
  const permission = students.filter((s) => s.status === "permission").length
  const absent = students.filter((s) => s.status === "absent").length

  const stats = [
    { label: "Total Students", value: total, icon: Users, color: "text-foreground", bgColor: "bg-muted" },
    { label: "Present", value: present, icon: UserCheck, color: "text-green-600", bgColor: "bg-green-100" },
    { label: "Permission", value: permission, icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
    { label: "Absent", value: absent, icon: UserMinus, color: "text-destructive", bgColor: "bg-destructive/10" },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
