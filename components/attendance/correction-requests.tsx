"use client"

import { Fragment, useRef, useState } from "react"
import { Check, X, Clock, Share2 } from "lucide-react"
import { useAppStore, type CorrectionRequest } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import { copyTextRobust, tryOpenWindow } from "@/lib/share-utils"

const LONG_PRESS_MS = 550

function formatShortRoll(rollNumber: string) {
  const regularMatch = /^23691A33(\d{2})$/i.exec(rollNumber)
  if (regularMatch) {
    return regularMatch[1]
  }

  const lateralMatch = /^24695A33(\d{2})$/i.exec(rollNumber)
  if (lateralMatch) {
    return `LE${Number(lateralMatch[1])}`
  }

  return rollNumber
}

export function CorrectionRequests() {
  const { correctionRequests, approveCorrectionRequest, rejectCorrectionRequest, deleteCorrectionRequest, user } = useAppStore()
  const { toast } = useToast()
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null)
  const [actionRequestId, setActionRequestId] = useState<string | null>(null)
  const longPressTimer = useRef<number | null>(null)

  const sortedRequests = [...correctionRequests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1
    if (a.status !== "pending" && b.status === "pending") return 1
    return new Date(b.requestedAt || b.date).getTime() - new Date(a.requestedAt || a.date).getTime()
  })

  const pendingCount = correctionRequests.filter((request) => request.status === "pending").length
  const approvedCount = correctionRequests.filter((request) => request.status === "approved").length
  const rejectedCount = correctionRequests.filter((request) => request.status === "rejected").length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: CorrectionRequest["status"]) => {
    if (status === "pending") {
      return (
        <Badge variant="outline" className="border-warning/30 text-warning">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    }

    if (status === "approved") {
      return (
        <Badge variant="outline" className="border-primary/30 text-primary">
          <Check className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="border-destructive/30 text-destructive">
        <X className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    )
  }

  const handleApprove = (requestId: string) => {
    approveCorrectionRequest(requestId)
    toast({
      title: "Request Approved",
      description: "Attendance record updated with approved corrections.",
    })
  }

  const handleReject = (requestId: string) => {
    rejectCorrectionRequest(requestId)
    toast({
      title: "Request Rejected",
      description: "Correction request has been rejected.",
    })
  }

  const handleDelete = (requestId: string) => {
    const confirmed = window.confirm("Delete this correction request?")
    if (!confirmed) return
    deleteCorrectionRequest(requestId)
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null)
    }
    setActionRequestId(null)
    toast({
      title: "Request Deleted",
      description: "Correction request removed.",
    })
  }

  const startLongPress = (requestId: string) => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
    }

    longPressTimer.current = window.setTimeout(() => {
      setActionRequestId(requestId)
    }, LONG_PRESS_MS)
  }

  const clearLongPress = () => {
    if (!longPressTimer.current) return
    window.clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const buildPoliteMessage = (request: CorrectionRequest) => {
    const changes = request.changes || []
    const hour = new Date().getHours()
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    const facultyText = request.facultyName || ""
    const hasMaleTitle = /^(mr)\.?\s/i.test(facultyText)
    const hasFemaleTitle = /^(ms|mrs|miss)\.?\s/i.test(facultyText)

    let greetingLine = `${greeting},`
    if (hasMaleTitle) {
      greetingLine = `${greeting} Sir,`
    } else if (hasFemaleTitle) {
      greetingLine = `${greeting} Ma'am,`
    }

    const presentRolls = changes
      .filter((change) => change.toStatus === "present")
      .map((change) => formatShortRoll(change.rollNumber))
      .join(", ")
    const permissionRolls = changes
      .filter((change) => change.toStatus === "permission")
      .map((change) => formatShortRoll(change.rollNumber))
      .join(", ")
    const absentRolls = changes
      .filter((change) => change.toStatus === "absent")
      .map((change) => formatShortRoll(change.rollNumber))
      .join(", ")

    const lines = [
      greetingLine,
      "",
      `Date: ${formatDate(request.date)}`,
      `Presentees: ${presentRolls || "-"}`,
      `Permissions: ${permissionRolls || "-"}`,
      `Absentees: ${absentRolls || "-"}`,
      "",
      `Please update these modifications for ${request.subjectCode || request.subject} (${request.timeSlot || "N/A"} class).`,
      "Thank you.",
    ]

    return lines.join("\n")
  }

  const handleShareRequest = async (request: CorrectionRequest) => {
    const text = buildPoliteMessage(request)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Correction Request - ${request.subjectCode || request.subject}`,
          text,
        })
        return
      } catch {
        // Fallback handled below.
      }
    }

    const copied = await copyTextRobust(text)
    if (copied) {
      toast({
        title: "Message Copied",
        description: "Polite correction request message copied.",
      })
      return
    }

    const whatsappMessage = encodeURIComponent(text)
    if (tryOpenWindow(`https://wa.me/?text=${whatsappMessage}`)) {
      toast({
        title: "Opened WhatsApp",
        description: "Share message opened in WhatsApp.",
      })
      return
    }

    toast({
      title: "Share Unavailable",
      description: "Unable to share automatically. Please try copy/share again.",
      variant: "destructive",
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Correction Requests</h1>
        <p className="text-muted-foreground">
          {user?.role === "faculty"
            ? "Review class-hour correction requests and approve changes"
            : "Track correction requests raised for attendance updates"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {sortedRequests.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No correction requests found
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Requests by Class Hour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">Long press a row to show delete option.</div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRequests.map((request) => {
                    const expanded = expandedRequestId === request.id
                    const showDelete = actionRequestId === request.id

                    return (
                      <Fragment key={request.id}>
                        <TableRow
                          key={request.id}
                          className="cursor-pointer border-border"
                          onClick={() => setExpandedRequestId(expanded ? null : request.id)}
                          onMouseDown={() => startLongPress(request.id)}
                          onMouseUp={clearLongPress}
                          onMouseLeave={clearLongPress}
                          onTouchStart={() => startLongPress(request.id)}
                          onTouchEnd={clearLongPress}
                        >
                          <TableCell className="font-medium text-foreground">{formatDate(request.date)}</TableCell>
                          <TableCell className="text-foreground">{request.subjectCode || request.subject}</TableCell>
                          <TableCell className="text-foreground">{request.timeSlot || "N/A"}</TableCell>
                          <TableCell className="text-muted-foreground">{request.requestedBy || "N/A"}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {showDelete ? (
                              <Button
                                variant="outline"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(request.id)
                                }}
                              >
                                Delete
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{expanded ? "Hide" : "Open"}</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {expanded ? (
                          <TableRow className="border-border bg-muted/20">
                            <TableCell colSpan={6}>
                              <div className="space-y-4 py-2">
                                {request.changes && request.changes.length > 0 ? (
                                  <div className="overflow-x-auto rounded-lg border border-border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                          <TableHead>Roll No.</TableHead>
                                          <TableHead>Student</TableHead>
                                          <TableHead>From</TableHead>
                                          <TableHead>To</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {request.changes.map((change) => (
                                          <TableRow key={`${request.id}-${change.studentId}`} className="border-border">
                                            <TableCell className="font-mono text-xs text-muted-foreground">{change.rollNumber}</TableCell>
                                            <TableCell className="text-foreground">{change.studentName}</TableCell>
                                            <TableCell className="capitalize text-muted-foreground">{change.fromStatus}</TableCell>
                                            <TableCell className="capitalize text-foreground">{change.toStatus}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                                )}

                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button variant="outline" onClick={() => handleShareRequest(request)}>
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share Request
                                  </Button>

                                  {user?.role === "faculty" && request.status === "pending" ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        className="border-primary/30 text-primary hover:bg-primary/10"
                                        onClick={() => handleApprove(request.id)}
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approve
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleReject(request.id)}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Reject
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
