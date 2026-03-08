"use client"

import { Download, Copy, Send, MessageCircle, Check } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { copyTextRobust, tryOpenWindow } from "@/lib/share-utils"

interface ShareStudent {
  id: string
  rollNumber: string
  name: string
  status: "present" | "permission" | "absent"
}

export interface ShareAttendanceData {
  subject: string
  date: string
  presentCount: number
  permissionCount: number
  absentCount: number
  absentStudents: ShareStudent[]
}

interface ShareAttendanceModalProps {
  open: boolean
  onClose: () => void
  data: ShareAttendanceData | null
}

const NL = String.fromCharCode(10)

export function ShareAttendanceModal({ open, onClose, data }: ShareAttendanceModalProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [copiedAbsentees, setCopiedAbsentees] = useState(false)

  if (!data) return null

  const { subject, date, presentCount, permissionCount, absentCount, absentStudents } = data

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const absentBlock = absentStudents.length
    ? [
        "ABSENT STUDENTS",
        "---------------",
        ...absentStudents.map((student) => `${student.rollNumber} - ${student.name}`),
      ].join(NL)
    : "All students present!"

  const generateReport = () => {
    return [
      "ATTENDANCE REPORT",
      "================",
      `Subject: ${subject}`,
      `Date: ${formattedDate}`,
      "",
      "SUMMARY",
      "-------",
      `Present: ${presentCount}`,
      `Permission: ${permissionCount}`,
      `Absent: ${absentCount}`,
      `Total: ${presentCount + permissionCount + absentCount}`,
      "",
      absentBlock,
      "",
    ].join(NL)
  }

  const getAbsenteeList = () =>
    absentStudents.length > 0
      ? absentStudents.map((student) => `${student.rollNumber} - ${student.name}`).join(NL)
      : "No absent students"

  const handleCopyReport = async () => {
    const copiedOk = await copyTextRobust(generateReport())
    if (!copiedOk) {
      toast({
        title: "Copy Blocked",
        description: "Could not copy report. Please allow clipboard permissions.",
        variant: "destructive",
      })
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    toast({ title: "Report Copied", description: "Formatted attendance report copied." })
  }

  const handleCopyAbsentees = async () => {
    const copiedOk = await copyTextRobust(getAbsenteeList())
    if (!copiedOk) {
      toast({
        title: "Copy Blocked",
        description: "Could not copy absentee list. Please allow clipboard permissions.",
        variant: "destructive",
      })
      return
    }
    setCopiedAbsentees(true)
    setTimeout(() => setCopiedAbsentees(false), 1800)
    toast({ title: "Absentee List Copied", description: "Absentee list copied to clipboard." })
  }

  const handleDownloadPdf = () => {
    const escapedAbsentees = absentStudents.length
      ? absentStudents.map((student) => `<li>${student.rollNumber} - ${student.name}</li>`).join("")
      : "<li>No absent students</li>"

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700")
    if (!printWindow) {
      toast({
        title: "Popup Blocked",
        description: "Allow popups to download as PDF.",
        variant: "destructive",
      })
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { font-size: 22px; margin-bottom: 14px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; margin-bottom: 16px; }
            .k { color: #6b7280; font-size: 12px; }
            .v { font-weight: 600; }
            .counts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
            ul { margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <div class="grid">
            <div><div class="k">Subject</div><div class="v">${subject}</div></div>
            <div><div class="k">Date</div><div class="v">${formattedDate}</div></div>
          </div>
          <div class="counts">
            <div class="card"><div class="k">Present</div><div class="v">${presentCount}</div></div>
            <div class="card"><div class="k">Permission</div><div class="v">${permissionCount}</div></div>
            <div class="card"><div class="k">Absent</div><div class="v">${absentCount}</div></div>
          </div>
          <h3>Absent Students</h3>
          <ul>${escapedAbsentees}</ul>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(generateReport())
    const opened = tryOpenWindow(`https://wa.me/?text=${message}`)
    if (!opened) {
      toast({
        title: "Popup Blocked",
        description: "Could not open WhatsApp. Please allow popups and try again.",
        variant: "destructive",
      })
    }
  }

  const handleEmail = () => {
    const subjectLine = encodeURIComponent(`Attendance Report - ${subject} - ${formattedDate}`)
    const body = encodeURIComponent(generateReport())
    const opened = tryOpenWindow(`mailto:?subject=${subjectLine}&body=${body}`)
    if (!opened) {
      toast({
        title: "Popup Blocked",
        description: "Could not open email app. Please allow popups and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl border-border/70 bg-card/95 p-0 shadow-2xl backdrop-blur-sm">
        <DialogHeader>
          <div className="rounded-t-xl border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
            <DialogTitle className="text-xl text-foreground">ShareAttendanceModal</DialogTitle>
            <DialogDescription className="mt-1 text-muted-foreground">
              Attendance submitted successfully. Share or export the report.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-6 pt-1">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                <p className="font-semibold text-foreground">{subject}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
                <p className="font-semibold text-foreground">{formattedDate}</p>
              </div>
            </div>

            <Separator className="my-4 bg-border" />

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{presentCount}</p>
                <p className="text-xs text-green-700/80">Present</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-2xl font-bold text-yellow-700">{permissionCount}</p>
                <p className="text-xs text-yellow-700/80">Permission</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{absentCount}</p>
                <p className="text-xs text-red-700/80">Absent</p>
              </div>
            </div>

            <Separator className="my-4 bg-border" />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Absent Students</p>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border bg-background/80 p-3 text-sm">
                {absentStudents.length > 0 ? (
                  absentStudents.map((student) => (
                    <p key={student.id} className="text-foreground">
                      {student.rollNumber} - {student.name}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">No absent students</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopyAbsentees}>
              {copiedAbsentees ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedAbsentees ? "Copied Absentees" : "Copy Absentee List"}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              Share WhatsApp
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleEmail}>
              <Send className="h-4 w-4" />
              Send Email
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="gap-2" onClick={handleCopyReport}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Report Copied" : "Copy Full Report"}
            </Button>
            <Button onClick={onClose} className="sm:min-w-32">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
