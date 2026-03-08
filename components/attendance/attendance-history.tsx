"use client"

import { useState } from "react"
import { Calendar, Search, Eye, ChevronRight } from "lucide-react"
import { useAppStore, type AttendanceRecord } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AttendanceHistory() {
  const { attendanceRecords } = useAppStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

  const filteredRecords = attendanceRecords.filter(
    (record) =>
      record.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.date.includes(searchTerm)
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
        <p className="text-muted-foreground">View and manage past attendance records</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Filter by Date
          </Button>
        </div>
      </div>

      {/* Records Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Subject</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-center text-muted-foreground">Present</TableHead>
                <TableHead className="text-center text-muted-foreground">Permission</TableHead>
                <TableHead className="text-center text-muted-foreground">Absent</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const present = record.students.filter((s) => s.status === "present").length
                const permission = record.students.filter((s) => s.status === "permission").length
                const absent = record.students.filter((s) => s.status === "absent").length

                return (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer border-border transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {formatDate(record.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                          <span className="text-xs font-bold text-primary">{record.subjectCode}</span>
                        </div>
                        <span className="text-foreground">{record.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.timeSlot}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {present}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-warning/30 text-warning">
                        {permission}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-destructive/30 text-destructive">
                        {absent}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                        Submitted
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredRecords.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No attendance records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Attendance Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRecord?.subject} - {selectedRecord && formatDate(selectedRecord.date)}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-primary/10 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {selectedRecord.students.filter((s) => s.status === "present").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div className="rounded-lg border border-border bg-warning/10 p-4 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {selectedRecord.students.filter((s) => s.status === "permission").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Permission</p>
                </div>
                <div className="rounded-lg border border-border bg-destructive/10 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {selectedRecord.students.filter((s) => s.status === "absent").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
              </div>

              {/* Student List */}
              <ScrollArea className="h-[300px] rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {selectedRecord.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          {student.rollNumber}
                        </span>
                        <span className="font-medium text-foreground">{student.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          student.status === "present"
                            ? "border-primary/30 text-primary"
                            : student.status === "permission"
                            ? "border-warning/30 text-warning"
                            : "border-destructive/30 text-destructive"
                        }
                      >
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Submitted by: {selectedRecord.submittedBy}</span>
                <span>
                  {selectedRecord.submittedAt &&
                    new Date(selectedRecord.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
