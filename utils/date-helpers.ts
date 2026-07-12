export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const dayOfMonth = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()

  return `${dayOfMonth}-${month}-${year}`
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime12h(time: string): string {
  const [hourStr, minuteStr] = time.split(":")
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time

  const suffix = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`
}

export function formatTimeSlotLabel(slot: string): string {
  const [start, end] = slot.split("-")
  if (!start || !end) return slot
  return `${formatTime12h(start)} - ${formatTime12h(end)}`
}

export function getISOWeekKey(date = new Date()): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

export function getLocalDateStringForDay(dayName: string): string {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const targetIndex = daysOfWeek.indexOf(dayName)
  if (targetIndex === -1) return ""
  
  const now = new Date()
  const currentDayIndex = now.getDay()
  const diff = targetIndex - currentDayIndex
  const targetDate = new Date(now)
  targetDate.setDate(now.getDate() + diff)
  
  return targetDate.toISOString().split("T")[0]
}
