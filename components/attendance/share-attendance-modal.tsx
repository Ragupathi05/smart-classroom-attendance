"use client"

import { Download, Copy, Send, MessageCircle, X, Check } from "lucide-react"
import { useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ShareAttendanceModalProps {
  open: boolean
  onClose: () => void
}

export function ShareAttendanceModal({ open, onClose }: ShareAttendanceModalProps) {
  const { students, selectedCell, user } = useAppStore()
  const [copied, setCopied] = useState(false)

  const present = students.filter((s) => s.status === "present").length
  const permission = students.filter((s) => s.status === "permission").length
  const absent = students.filter((s) => s.status === "absent").length
  const absentStudents = students.filter((s) => s.status === "absent")

  const generateReport = () => {
    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return `ATTENDANCE REPORT
================
Subject: ${selectedCell?.subjectName || "N/A"}
Date: ${date}
Time: ${selectedCell?.timeSlot || "N/A"}
Class: ${user?.className || "N/A"}

SUMMARY
-------
Present: ${present}
Permission: ${permission}
Absent: ${absent}
Total: ${students.length}

${absentStudents.length > 0 ? `ABSENT STUDENTS\n---------------\n${absentStudents.map((s) => `${s.rollNumber} - ${s.name}`).join("\n")}` : "All students present!"}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(generateReport())
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Attendance Report - ${selectedCell?.subjectName} - ${new Date().toLocaleDateString()}`)
    const body = encodeURIComponent(generateReport())
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share Attendance Report</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share the attendance report with faculty or save for records
          </DialogDescription>
        </DialogHeader>

        {/* Report Preview */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subject</span>
              <span className="font-medium text-foreground">{selectedCell?.subjectName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{permission}</p>
                <p className="text-xs text-muted-foreground">Permission</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
            {absentStudents.length > 0 && (
              <>
                <Separator className="bg-border" />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">ABSENT STUDENTS</p>
                  <div className="max-h-24 space-y-1 overflow-y-auto text-sm">
                    {absentStudents.map((s) => (
                      <p key={s.id} className="text-foreground">
                        {s.rollNumber} - {s.name}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="gap-2" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Report"}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleEmail}>
            <Send className="h-4 w-4" />
            Email
          </Button>
        </div>

        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}
