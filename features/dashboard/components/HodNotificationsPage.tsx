"use client"

import { useState } from "react"
import { Bell, Send, Plus, Trash2, Calendar, Users, Eye } from "lucide-react"
import { useAcademicStore, useAuthStore } from "@/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"

export function HodNotificationsPage() {
  const { notifications, createNotification } = useAcademicStore()
  const { user } = useAuthStore()

  const isCRLR = user?.role === "cr" || user?.role === "lr"

  // Form states
  const [showCompose, setShowCompose] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [target, setTarget] = useState("Entire Department")
  const [schedule, setSchedule] = useState("Immediately")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    createNotification({
      title: title.trim(),
      body: body.trim(),
      target,
      schedule,
    })

    setTitle("")
    setBody("")
    setShowCompose(false)
    toast.success("Notification sent and broadcasted!")
  }

  // Filter notifications visible to the active role
  const visibleNotifications = notifications.filter(n => {
    if (!isCRLR) return true
    return (
      n.target === "Entire Department" ||
      n.target === "Specific Section" ||
      (user?.role === "cr" && n.target === "CRs Only") ||
      (user?.role === "lr" && n.target === "LRs Only")
    )
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">Broadcasting & Notifications</h1>
          <p className="text-xs text-muted-foreground font-semibold">Send department-wide reminders, holiday alerts, or override notifications</p>
        </div>
        {!isCRLR && (
          <Button onClick={() => setShowCompose(!showCompose)} size="sm" className="text-xs font-bold rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Compose Notification
          </Button>
        )}
      </div>

      {/* Compose Notification Form */}
      {showCompose && (
        <form onSubmit={handleSubmit} className="bg-card border border-border/75 p-6 rounded-2xl space-y-4 shadow-sm animate-fade-in-up">
          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">New Broadcast Details</h3>
          <div className="grid gap-4 sm:grid-cols-3 text-xs font-bold">
            <div className="sm:col-span-2">
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Notification Title</label>
              <Input placeholder="e.g. Workshop scheduled for Friday" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs font-semibold rounded-lg" />
            </div>
            <div>
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Target Audience</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="Entire Department">Entire Department</option>
                <option value="Faculty Only">Faculty Only</option>
                <option value="Specific Section">Specific Section (III CSE A)</option>
                <option value="CRs Only">Class Representatives (CRs)</option>
                <option value="LRs Only">Ladies Representatives (LRs)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement details here..."
                className="w-full min-h-[90px] bg-input/40 border text-xs font-semibold rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-muted-foreground uppercase tracking-widest text-[9px] mb-1">Scheduling Time</label>
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="bg-input/40 border text-xs font-semibold rounded-lg h-9 w-full px-3 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="Immediately">Immediately</option>
                <option value="Later (Evening)">Later (Evening)</option>
                <option value="Tomorrow morning">Tomorrow morning</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCompose(false)} className="text-xs font-bold rounded-lg h-9">Cancel</Button>
            <Button type="submit" className="text-xs font-bold rounded-lg h-9">Broadcast Message</Button>
          </div>
        </form>
      )}

      {/* Notifications Sent Feed */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Broadcast History Log</h2>
        <div className="grid gap-4">
          {visibleNotifications.map((notif) => (
            <Card key={notif.id} className="border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{notif.title}</p>
                    <Badge variant="outline" className="text-[9px] font-bold border-border/80 uppercase">
                      {notif.target}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                    {notif.body}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-2.5">
                    Sent at: {notif.sentAt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
