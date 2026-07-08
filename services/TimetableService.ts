import type { TimetableCell } from "@/types"
import { WEEKLY_SCHEDULE, TIME_SLOTS, SUBJECTS, SUBJECT_FACULTY } from "@/constants"

export class TimetableService {
  static generateTimetable(): TimetableCell[] {
    const timetable: TimetableCell[] = []

    Object.entries(WEEKLY_SCHEDULE).forEach(([day, subjects]) => {
      subjects.forEach((subjectCode, index) => {
        if (!subjectCode) return

        timetable.push({
          id: `${day}-${index}`,
          day,
          timeSlot: TIME_SLOTS[index],
          subjectCode,
          subjectName: SUBJECTS[subjectCode] ?? subjectCode,
          facultyName: SUBJECT_FACULTY[subjectCode] ?? "Faculty Assigned",
          status: "upcoming",
        })
      })
    })

    return timetable
  }

  static resetTimetableStatuses(timetable: TimetableCell[]): TimetableCell[] {
    return timetable.map((entry) => ({ ...entry, status: "upcoming" }))
  }
}
