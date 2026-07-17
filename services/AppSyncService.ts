import { supabase } from "@/lib/supabase/client"
import type { AttendanceRecord } from "@/types"
import type { TimetableCell, SpecialDay } from "@/types"

// =========================================================================
// AppSyncService — Syncs local Zustand store data to Supabase flat tables
// Tables: app_attendance_records, app_timetable_cells, app_special_days
// =========================================================================

export const AppSyncService = {
  // -----------------------------------------------------------------------
  // ATTENDANCE RECORDS
  // -----------------------------------------------------------------------
  async upsertAttendanceRecord(record: AttendanceRecord): Promise<void> {
    try {
      const { error } = await supabase.from("app_attendance_records").upsert(
        {
          id: record.id,
          section_id: record.sectionId || "sec-1",
          session_date: record.date,
          time_slot: record.timeSlot,
          subject_code: record.subjectCode,
          subject_name: record.subject,
          faculty_name: record.submittedBy,
          records: record.students,
          submitted_at: record.submittedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to upsert attendance record:", err?.message)
    }
  },

  async deleteAttendanceRecord(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("app_attendance_records").delete().eq("id", id)
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to delete attendance record:", err?.message)
    }
  },

  async fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from("app_attendance_records")
        .select("*")
        .order("submitted_at", { ascending: false })
      if (error) throw error
      return (data || []).map((row: any) => ({
        id: row.id,
        sectionId: row.section_id,
        date: row.session_date,
        timeSlot: row.time_slot,
        subjectCode: row.subject_code,
        subject: row.subject_name,
        submittedBy: row.faculty_name,
        students: row.records || [],
        submittedAt: row.submitted_at,
        className: row.class_name || "",
        cellIds: row.cell_ids || [],
        academicSessionId: row.academic_session_id || "",
      }))
    } catch (err: any) {
      console.warn("AppSyncService: Failed to fetch attendance records:", err?.message)
      return []
    }
  },

  // -----------------------------------------------------------------------
  // TIMETABLE CELLS
  // -----------------------------------------------------------------------
  async upsertTimetableCell(cell: TimetableCell): Promise<void> {
    try {
      const { error } = await supabase.from("app_timetable_cells").upsert(
        {
          id: cell.id,
          section_id: cell.sectionId || "sec-1",
          day: cell.day,
          time_slot: cell.timeSlot,
          subject_code: cell.subjectCode,
          subject_name: cell.subjectName,
          faculty_name: cell.facultyName,
          room_name: cell.roomName,
          type: cell.type || "regular",
          attendance_required: cell.attendanceRequired || "Required",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to upsert timetable cell:", err?.message)
    }
  },

  async deleteTimetableCell(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("app_timetable_cells").delete().eq("id", id)
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to delete timetable cell:", err?.message)
    }
  },

  async fetchTimetableCells(sectionId: string): Promise<TimetableCell[]> {
    try {
      const { data, error } = await supabase
        .from("app_timetable_cells")
        .select("*")
        .eq("section_id", sectionId)
      if (error) throw error
      return (data || []).map((row: any) => ({
        id: row.id,
        sectionId: row.section_id,
        day: row.day,
        timeSlot: row.time_slot,
        subjectCode: row.subject_code,
        subjectName: row.subject_name,
        facultyName: row.faculty_name,
        roomName: row.room_name,
        type: row.type || "regular",
        attendanceRequired: row.attendance_required || "Required",
        status: "upcoming" as const,
      }))
    } catch (err: any) {
      console.warn("AppSyncService: Failed to fetch timetable cells:", err?.message)
      return []
    }
  },

  // -----------------------------------------------------------------------
  // SPECIAL DAYS CALENDAR
  // -----------------------------------------------------------------------
  async upsertSpecialDay(date: string, day: SpecialDay): Promise<void> {
    try {
      const { error } = await supabase.from("app_special_days").upsert(
        {
          date,
          type: day.type,
          reason: day.reason,
          scope_type: day.scopeType || "all",
          scope_target_ids: day.scopeTargetIds || [],
          periods: day.periods || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "date" }
      )
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to upsert special day:", err?.message)
    }
  },

  async deleteSpecialDay(date: string): Promise<void> {
    try {
      const { error } = await supabase.from("app_special_days").delete().eq("date", date)
      if (error) throw error
    } catch (err: any) {
      console.warn("AppSyncService: Failed to delete special day:", err?.message)
    }
  },

  async fetchSpecialDays(): Promise<Record<string, SpecialDay>> {
    try {
      const { data, error } = await supabase.from("app_special_days").select("*")
      if (error) throw error
      const result: Record<string, SpecialDay> = {}
      for (const row of data || []) {
        result[row.date] = {
          date: row.date,
          type: row.type,
          reason: row.reason,
          scopeType: row.scope_type || "all",
          scopeTargetIds: row.scope_target_ids || [],
          periods: row.periods || [],
        }
      }
      return result
    } catch (err: any) {
      console.warn("AppSyncService: Failed to fetch special days:", err?.message)
      return {}
    }
  },
}
