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
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
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
  primary: "#22c55e", // Green (primary)
  secondary: "#3b82f6", // Blue
  warning: "#eab308", // Yellow
  destructive: "#ef4444", // Red
  muted: "#6b7280", // Gray
}

export function Analytics() {
  const { user } = useAppStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive attendance analytics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Attendance</p>
                <p className="text-3xl font-bold text-foreground">{overallStats.averageAttendance}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Classes</p>
                <p className="text-3xl font-bold text-foreground">{overallStats.totalClasses}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <span className="text-lg font-bold text-muted-foreground">Cls</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Highest Attendance</p>
                <p className="text-2xl font-bold text-primary">{overallStats.highestAttendance.value}%</p>
                <p className="text-xs text-muted-foreground">{overallStats.highestAttendance.subject}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lowest Attendance</p>
                <p className="text-2xl font-bold text-destructive">{overallStats.lowestAttendance.value}%</p>
                <p className="text-xs text-muted-foreground">{overallStats.lowestAttendance.subject}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance Trend */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Weekly Attendance Trend</CardTitle>
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
              className="h-[300px]"
            >
              <LineChart data={weeklyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis domain={[0, 100]} stroke="#9ca3af" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, strokeWidth: 2 }}
                  name="Attendance %"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subject-wise Attendance */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Subject-wise Attendance</CardTitle>
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
              className="h-[300px]"
            >
              <BarChart data={subjectData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="subject" stroke="#9ca3af" />
                <YAxis domain={[0, 100]} stroke="#9ca3af" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]} name="Attendance %">
                  {subjectData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attendance >= 85 ? COLORS.primary : entry.attendance >= 75 ? COLORS.warning : COLORS.destructive}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Students Below 75% */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Students Below 75% Attendance
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Students who need to improve their attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Roll No.</TableHead>
                <TableHead className="text-muted-foreground">Student Name</TableHead>
                <TableHead className="text-center text-muted-foreground">Classes Attended</TableHead>
                <TableHead className="text-center text-muted-foreground">Total Classes</TableHead>
                <TableHead className="text-center text-muted-foreground">Attendance %</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowAttendanceStudents.map((student) => (
                <TableRow key={student.rollNumber} className="border-border">
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {student.rollNumber}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                  <TableCell className="text-center text-foreground">{student.attended}</TableCell>
                  <TableCell className="text-center text-foreground">{student.classes}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-bold text-destructive">{student.attendance}%</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-destructive/30 text-destructive">
                      At Risk
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {lowAttendanceStudents.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No students below 75% attendance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
