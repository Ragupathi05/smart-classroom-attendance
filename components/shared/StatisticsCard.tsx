import React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatisticsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  bgColor: string
  trend?: string | null
  index?: number
}

export function StatisticsCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  trend = null,
  index = 0,
}: StatisticsCardProps) {
  return (
    <Card
      className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor} transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {trend && <p className="mt-0.5 text-[10px] text-chart-2">{trend}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
