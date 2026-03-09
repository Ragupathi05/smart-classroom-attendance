"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { toast } from "react-toastify"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const TIME_SLOTS = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

const dayOrder = new Map(DAYS.map((day, idx) => [day, idx]))
const slotOrder = new Map(TIME_SLOTS.map((slot, idx) => [slot, idx]))

export function TimetableEditorPage() {
  const { timetable, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useAppStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [slotErrorMessage, setSlotErrorMessage] = useState("")
  const [form, setForm] = useState({
    day: DAYS[0],
    timeSlot: TIME_SLOTS[0],
    subject: "",
    faculty: "",
  })

  const sortedTimetable = useMemo(() => {
    return [...timetable].sort((a, b) => {
      const dayDiff = (dayOrder.get(a.day) ?? 99) - (dayOrder.get(b.day) ?? 99)
      if (dayDiff !== 0) return dayDiff
      return (slotOrder.get(a.timeSlot) ?? 99) - (slotOrder.get(b.timeSlot) ?? 99)
    })
  }, [timetable])

  const openAddModal = () => {
    setEditingId(null)
    setSlotErrorMessage("")
    setForm({ day: DAYS[0], timeSlot: TIME_SLOTS[0], subject: "", faculty: "" })
    setIsModalOpen(true)
  }

  const openEditModal = (
    id: string,
    day: string,
    timeSlot: string,
    subjectCode: string,
    facultyName: string
  ) => {
    setEditingId(id)
    setSlotErrorMessage("")
    setForm({ day, timeSlot, subject: subjectCode, faculty: facultyName })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    const subject = form.subject.trim()
    const faculty = form.faculty.trim()
    if (!subject) return

    const conflictingEntry = timetable.find(
      (entry) =>
        entry.day === form.day &&
        entry.timeSlot === form.timeSlot &&
        entry.id !== editingId
    )

    if (conflictingEntry) {
      const message = `Already there is a class in this slot (${conflictingEntry.subjectCode}). Edit or remove that slot, then add.`
      setSlotErrorMessage(message)
      toast.warning(
        message
      )
      return
    }

    setSlotErrorMessage("")

    if (editingId) {
      updateTimetableEntry(editingId, {
        day: form.day,
        timeSlot: form.timeSlot,
        subjectCode: subject,
        facultyName: faculty,
      })
    } else {
      addTimetableEntry({
        day: form.day,
        timeSlot: form.timeSlot,
        subjectCode: subject,
        facultyName: faculty,
      })
    }

    setIsModalOpen(false)
  }

  const handleDeleteEntry = (id: string, day: string, timeSlot: string, subjectCode: string) => {
    const shouldDelete = window.confirm(
      `Delete ${subjectCode} on ${day} ${timeSlot}? This action cannot be undone.`
    )
    if (!shouldDelete) return
    deleteTimetableEntry(id)
    toast.success("Timetable entry deleted.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Timetable Editor</h1>
        <p className="text-muted-foreground">Add, edit, and delete timetable entries</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Weekly Timetable Entries</CardTitle>
              <CardDescription className="text-muted-foreground">Manage class schedule used by the dashboard grid</CardDescription>
            </div>
            <Button
              type="button"
              onClick={openAddModal}
              className="bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Time Slot</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Faculty</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTimetable.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                    <td className="px-3 py-2 text-foreground">{entry.day}</td>
                    <td className="px-3 py-2 text-foreground">{entry.timeSlot}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{entry.subjectCode}</td>
                    <td className="px-3 py-2 text-foreground">{entry.facultyName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openEditModal(
                              entry.id,
                              entry.day,
                              entry.timeSlot,
                              entry.subjectCode,
                              entry.facultyName
                            )
                          }
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleDeleteEntry(entry.id, entry.day, entry.timeSlot, entry.subjectCode)
                          }
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Timetable Entry" : "Add Timetable Entry"}</DialogTitle>
            <DialogDescription>Set day, time slot, subject, and faculty for the class period.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Day</label>
              <select
                value={form.day}
                onChange={(e) => {
                  setSlotErrorMessage("")
                  setForm((prev) => ({ ...prev, day: e.target.value }))
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Time Slot</label>
              <select
                value={form.timeSlot}
                onChange={(e) => {
                  setSlotErrorMessage("")
                  setForm((prev) => ({ ...prev, timeSlot: e.target.value }))
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => {
                  setSlotErrorMessage("")
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }}
                placeholder="Enter subject code (e.g., DL)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Faculty</label>
              <input
                value={form.faculty}
                onChange={(e) => {
                  setSlotErrorMessage("")
                  setForm((prev) => ({ ...prev, faculty: e.target.value }))
                }}
                placeholder="Enter faculty name (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            {slotErrorMessage ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {slotErrorMessage}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
