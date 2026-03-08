"use client"

import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, BookOpen } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Weekly attendance trend data
const weeklyTrendData = [
  { day: "Mon", attendance: 92 },
  { day: "Tue", attendance: 88 },
  { day: "Wed", attendance: 95 },
  { day: "Thu", attendance: 85 },
  { day: "Fri", attendance: 90 },
  { day: "Sat", attendance: 78 },
]

// Subject-wise attendance data
const subjectData = [
  { subject: "DL", fullName: "Deep Learning", attendance: 92 },
  { subject: "SS", fullName: "System Software", attendance: 88 },
  { subject: "EB", fullName: "E-Business", attendance: 95 },
  { subject: "CCAI", fullName: "Cloud Computing & AI", attendance: 82 },
  { subject: "RL", fullName: "Reinforcement Learning", attendance: 90 },
  { subject: "BDA", fullName: "Big Data Analytics", attendance: 85 },
  { subject: "ATCD", fullName: "Automata Theory", attendance: 78 },
  { subject: "RM", fullName: "Research Methodology", attendance: 91 },
]

// Students below 75% attendance
const lowAttendanceStudents = [
  { rollNumber: "21CS006", name: "Farhan Ali", attendance: 68, classes: 42, attended: 28 },
  { rollNumber: "21CS012", name: "Lakshmi Iyer", attendance: 72, classes: 42, attended: 30 },
  { rollNumber: "21CS015", name: "Omkar Deshmukh", attendance: 65, classes: 42, attended: 27 },
  { rollNumber: "21CS019", name: "Sneha Kulkarni", attendance: 70, classes: 42, attended: 29 },
]

// Overall stats
const overallStats = {
  averageAttendance: 87,
  totalClasses: 42,
  highestAttendance: { subject: "E-Business", value: 95 },
  lowestAttendance: { subject: "Automata Theory", value: 78 },
}

// Colors for charts - computed values, not CSS variables
const COLORS = {
  primary: "#818cf8", // Indigo (primary)
  success: "#4ade80", // Green 
  warning: "#fbbf24", // Amber
  destructive: "#f87171", // Red
  muted: "#6b7280", // Gray
  grid: "#374151",
}

export function Analytics() {
  const { user } = useAppStore()

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reports & Analytics</h1>
        <p className="mt-1 text-muted-foreground">Comprehensive attendance analytics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Average Attendance",
            value: `${overallStats.averageAttendance}%`,
            icon: TrendingUp,
            color: "text-primary",
            bgColor: "bg-primary/10",
          },
          {
            title: "Total Classes",
            value: overallStats.totalClasses,
            icon: BookOpen,
            color: "text-chart-2",
            bgColor: "bg-chart-2/10",
          },
          {
            title: "Highest Attendance",
            value: `${overallStats.highestAttendance.value}%`,
            subtitle: overallStats.highestAttendance.subject,
            icon: TrendingUp,
            color: "text-chart-2",
            bgColor: "bg-chart-2/10",
          },
          {
            title: "Lowest Attendance",
            value: `${overallStats.lowestAttendance.value}%`,
            subtitle: overallStats.lowestAttendance.subject,
            icon: TrendingDown,
            color: "text-chart-5",
            bgColor: "bg-chart-5/10",
          },
        ].map((stat, index) => (
          <Card 
            key={stat.title} 
            className="group border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Trend */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Weekly Attendance Trend
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Daily attendance percentage this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance %",
                  color: COLORS.primary,
                },
              }}
              className="h-[280px]"
            >
              <LineChart data={weeklyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
                <XAxis dataKey="day" stroke={COLORS.muted} fontSize={12} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: COLORS.primary }}
                  name="Attendance %"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subject-wise Attendance */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <BookOpen className="h-5 w-5 text-primary" />
              Subject-wise Attendance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Attendance percentage by subject
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance %",
                  color: COLORS.primary,
                },
              }}
              className="h-[280px]"
            >
              <BarChart data={subjectData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} opacity={0.3} />
                <XAxis dataKey="subject" stroke={COLORS.muted} fontSize={12} />
                <YAxis domain={[0, 100]} stroke={COLORS.muted} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="attendance" radius={[6, 6, 0, 0]} name="Attendance %">
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 85 ? COLORS.success : entry.attendance >= 75 ? COLORS.warning : COLORS.destructive}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Students Below 75% */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-chart-3" />
            Students Below 75% Attendance
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Students who need to improve their attendance to meet requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Roll No.</TableHead>
                  <TableHead className="text-muted-foreground">Student Name</TableHead>
                  <TableHead className="text-center text-muted-foreground">Attended</TableHead>
                  <TableHead className="text-center text-muted-foreground">Total</TableHead>
                  <TableHead className="text-center text-muted-foreground">Percentage</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowAttendanceStudents.map((student, index) => (
                  <TableRow 
                    key={student.rollNumber} 
                    className="border-border/50 transition-colors hover:bg-secondary/50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {student.rollNumber}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                    <TableCell className="text-center text-foreground">{student.attended}</TableCell>
                    <TableCell className="text-center text-foreground">{student.classes}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-chart-5">{student.attendance}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-chart-5/30 bg-chart-5/10 text-chart-5">
                        At Risk
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {lowAttendanceStudents.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No students below 75% attendance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
