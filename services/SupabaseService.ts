import { supabase } from "@/lib/supabase/client"
import type { AcademicSession, AcademicBatch, Program, Section, FacultyMember } from "@/store/academicStore"
import type { Student, StudentSectionAssignment } from "@/types"

const DEFAULT_DEPT_CODE = "CSE"

// Year converters
const yearToLabel = (year: number): string => {
  if (year === 1) return "1st Year"
  if (year === 2) return "2nd Year"
  if (year === 3) return "3rd Year"
  if (year === 4) return "4th Year"
  return "Graduated"
}

const labelToYear = (label: string): number => {
  if (label.includes("1st")) return 1
  if (label.includes("2nd")) return 2
  if (label.includes("3rd")) return 3
  if (label.includes("4th")) return 4
  return 5
}

// Roman numeral converters for section name mapping
const getRomanYear = (yearLabel: string): string => {
  if (yearLabel.includes("1st")) return "I"
  if (yearLabel.includes("2nd")) return "II"
  if (yearLabel.includes("3rd")) return "III"
  if (yearLabel.includes("4th")) return "IV"
  return "V"
}

export const SupabaseService = {
  // 1. Initialize Default Department
  async getOrInitializeDepartmentId(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id")
        .eq("code", DEFAULT_DEPT_CODE)
        .maybeSingle()

      if (data?.id) return data.id

      const { data: inserted, error: insertError } = await supabase
        .from("departments")
        .insert({
          name: "Computer Science & Engineering",
          code: DEFAULT_DEPT_CODE,
          description: "MITS CSE Department"
        })
        .select("id")
        .single()

      if (insertError) throw insertError
      return inserted.id
    } catch (err: any) {
      console.warn("Supabase RLS Restriction / Offline Mode: Department check bypassed, using local store values.", err?.message || err)
      return "00000000-0000-0000-0000-000000000000"
    }
  },

  // 2. Academic Sessions
  async fetchAcademicSessions(): Promise<AcademicSession[]> {
    try {
      const { data, error } = await supabase
        .from("academic_sessions")
        .select("*")
        .order("start_year", { ascending: false })

      if (error) throw error
      return (data || []).map(s => ({
        id: s.id,
        name: s.session_name,
        status: s.is_active ? "ACTIVE" : "INACTIVE"
      }))
    } catch (err) {
      console.error("Error fetching academic sessions:", err)
      return []
    }
  },

  async createAcademicSession(session: Omit<AcademicSession, "id">, startYear: number, endYear: number, startDate: string, endDate: string): Promise<AcademicSession | null> {
    try {
      // If active, disable other active sessions first
      if (session.status === "ACTIVE") {
        await supabase.from("academic_sessions").update({ is_active: false }).eq("is_active", true)
      }

      const { data, error } = await supabase
        .from("academic_sessions")
        .insert({
          session_name: session.name,
          start_year: startYear,
          end_year: endYear,
          start_date: startDate,
          end_date: endDate,
          is_active: session.status === "ACTIVE"
        })
        .select("*")
        .single()

      if (error) throw error
      return {
        id: data.id,
        name: data.session_name,
        status: data.is_active ? "ACTIVE" : "INACTIVE"
      }
    } catch (err) {
      console.warn("Bypassed Supabase write / offline mode for session:", err?.message || err)
      return null
    }
  },

  // 3. Programs
  async fetchPrograms(): Promise<Program[]> {
    try {
      const { data, error } = await supabase.from("programs").select("*").order("name")
      if (error) throw error

      const programsList: Program[] = []
      for (const p of data || []) {
        // Query section count
        const { count: sectionCount } = await supabase
          .from("sections")
          .select("*", { count: "exact", head: true })
          .eq("program_id", p.id)

        // Query student count
        const { data: sectionData } = await supabase.from("sections").select("id").eq("program_id", p.id)
        const sectionIds = (sectionData || []).map(s => s.id)
        
        let studentCount = 0
        if (sectionIds.length > 0) {
          const { count } = await supabase
            .from("student_section_assignments")
            .select("*", { count: "exact", head: true })
            .in("section_id", sectionIds)
            .eq("is_active", true)
          studentCount = count || 0
        }

        programsList.push({
          id: p.id,
          name: p.name,
          years: p.code === "B.Tech" ? 4 : 2, // Map typical durations or configure
          studentCount,
          sectionCount: sectionCount || 0
        })
      }
      return programsList
    } catch (err) {
      console.error("Error fetching programs:", err)
      return []
    }
  },

  async createProgram(program: Omit<Program, "id" | "studentCount" | "sectionCount">): Promise<Program | null> {
    try {
      const code = program.name.includes("B.Tech") ? "B.Tech" : program.name.substring(0, 10)
      const { data, error } = await supabase
        .from("programs")
        .insert({
          name: program.name,
          code,
          is_active: true
        })
        .select("*")
        .single()

      if (error) throw error
      return {
        id: data.id,
        name: data.name,
        years: program.years,
        studentCount: 0,
        sectionCount: 0
      }
    } catch (err) {
      console.warn("Bypassed Supabase write / offline mode for program:", err?.message || err)
      return null
    }
  },

  // 4. Sections
  async fetchSections(deptId: string): Promise<Section[]> {
    try {
      const { data, error } = await supabase
        .from("sections")
        .select(`
          id,
          section_name,
          year,
          semester,
          program_id,
          academic_session_id,
          is_active
        `)
        .eq("department_id", deptId)

      if (error) throw error

      const sectionsList: Section[] = []
      for (const s of data || []) {
        // Fetch student count
        const { count: studentCount } = await supabase
          .from("student_section_assignments")
          .select("*", { count: "exact", head: true })
          .eq("section_id", s.id)
          .eq("is_active", true)

        // Fetch CR / LR names
        const { data: roles } = await supabase
          .from("section_role_assignments")
          .select(`
            role,
            users (
              full_name
            )
          `)
          .eq("section_id", s.id)
          .eq("is_active", true)

        const crObj = (roles || []).find(r => r.role === "CR")
        const lrObj = (roles || []).find(r => r.role === "LR")

        // Fetch faculty assignment count
        const { count: facultyCount } = await supabase
          .from("faculty_assignments")
          .select("*", { count: "exact", head: true })
          .eq("section_id", s.id)
          .eq("is_active", true)

        const yearLabel = yearToLabel(s.year)

        sectionsList.push({
          id: s.id,
          name: `${getRomanYear(yearLabel)} CSE ${s.section_name}`,
          year: yearLabel,
          semester: s.semester % 2 === 0 ? "Even" : "Odd",
          sectionName: s.section_name,
          studentCount: studentCount || 0,
          crName: crObj ? (crObj.users as any)?.full_name || "Unassigned" : "Unassigned",
          lrName: lrObj ? (lrObj.users as any)?.full_name || "Unassigned" : "Unassigned",
          facultyCount: facultyCount || 0,
          status: s.is_active ? "Active" : "Inactive",
          batchId: s.program_id, // Map program_id as batchId for category filtering
          academicSessionId: s.academic_session_id
        })
      }
      return sectionsList
    } catch (err) {
      console.error("Error fetching sections:", err)
      return []
    }
  },

  async createSection(section: Omit<Section, "id">, deptId: string): Promise<Section | null> {
    try {
      const yearVal = labelToYear(section.year)
      const semVal = section.semester === "Odd" ? (yearVal * 2 - 1) : (yearVal * 2)

      const { data, error } = await supabase
        .from("sections")
        .insert({
          department_id: deptId,
          program_id: section.batchId,
          academic_session_id: section.academicSessionId,
          year: yearVal,
          semester: semVal,
          section_name: section.sectionName,
          is_active: section.status === "Active"
        })
        .select("*")
        .single()

      if (error) throw error

      return {
        id: data.id,
        name: section.name,
        year: section.year,
        semester: section.semester,
        sectionName: section.sectionName,
        studentCount: 0,
        crName: "Unassigned",
        lrName: "Unassigned",
        facultyCount: 0,
        status: data.is_active ? "Active" : "Inactive",
        batchId: data.program_id,
        academicSessionId: data.academic_session_id
      }
    } catch (err) {
      console.warn("Bypassed Supabase write / offline mode for section:", err?.message || err)
      return null
    }
  },

  // 5. Faculty Users
  async fetchFaculty(deptId: string): Promise<FacultyMember[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("department_id", deptId)

      if (error) throw error

      const facultyList: FacultyMember[] = []
      for (const f of data || []) {
        // Query assignments
        const { data: assignments } = await supabase
          .from("faculty_assignments")
          .select(`
            subjects (
              subject_name
            ),
            sections (
              section_name,
              year
            )
          `)
          .eq("faculty_id", f.id)
          .eq("is_active", true)

        const subjects = Array.from(new Set((assignments || []).map(a => (a.subjects as any)?.subject_name).filter(Boolean))) as string[]
        const sections = Array.from(new Set((assignments || []).map(a => `${yearToLabel((a.sections as any)?.year)} CSE ${(a.sections as any)?.section_name}`).filter(Boolean))) as string[]

        facultyList.push({
          id: f.id,
          code: f.faculty_code,
          name: f.full_name,
          department: "CSE",
          email: f.email,
          phone: f.phone || "",
          subjects,
          sections,
          weeklyLoad: (assignments || []).length * 3, // mock load multiplier
          attendancePending: 0, // mock status
          status: f.is_active ? "Active" : "Inactive",
          photo: f.profile_photo || undefined
        })
      }
      return facultyList
    } catch (err) {
      console.error("Error fetching faculty:", err)
      return []
    }
  },

  async createFaculty(fac: Omit<FacultyMember, "id">, deptId: string): Promise<FacultyMember | null> {
    try {
      // Create user record in Supabase users table (Note: auth is done through separate flow or mock keys)
      // Since users table references auth.users(id), we generate a valid UUID for mock/sync logins,
      // or map it directly. If we are running in HOD setup mode, HOD registers the faculty.
      const newId = crypto.randomUUID()
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: newId,
          full_name: fac.name,
          email: fac.email,
          phone: fac.phone,
          faculty_code: fac.code,
          role: "Faculty",
          department_id: deptId,
          is_active: fac.status === "Active"
        })
        .select("*")
        .single()

      if (error) throw error
      return {
        id: data.id,
        code: data.faculty_code,
        name: data.full_name,
        department: "CSE",
        email: data.email,
        phone: data.phone || "",
        subjects: [],
        sections: [],
        weeklyLoad: 0,
        attendancePending: 0,
        status: data.is_active ? "Active" : "Inactive"
      }
    } catch (err) {
      console.error("Error creating faculty user:", err)
      return null
    }
  },

  // 6. Students & Assignments
  async fetchStudentsRoster(sectionId: string): Promise<Student[]> {
    try {
      const { data, error } = await supabase
        .from("student_section_assignments")
        .select(`
          students (
            id,
            roll_number,
            full_name,
            gender,
            email,
            phone,
            profile_photo,
            is_active
          )
        `)
        .eq("section_id", sectionId)
        .eq("is_active", true)

      if (error) throw error

      return (data || [])
        .map(a => {
          const s = a.students as any
          if (!s) return null
          return {
            id: s.id,
            rollNumber: s.roll_number,
            name: s.full_name,
            gender: s.gender,
            mobileNumber: s.phone || "",
            status: s.is_active ? "present" as const : "absent" as const
          }
        })
        .filter((s): s is Student => s !== null)
    } catch (err) {
      console.error("Error fetching section roster:", err)
      return []
    }
  },

  async enrollStudent(student: Omit<Student, "id">, sectionId: string, sessionId: string): Promise<Student | null> {
    try {
      const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      if (!isValidUuid(sectionId) || !isValidUuid(sessionId)) {
        return null
      }

      // 1. Insert/Find student profile
      const { data: existing } = await supabase
        .from("students")
        .select("*")
        .eq("roll_number", student.rollNumber)
        .maybeSingle()

      let studentId = existing?.id
      if (!studentId) {
        const { data: newStudent, error: sError } = await supabase
          .from("students")
          .insert({
            roll_number: student.rollNumber,
            register_number: `REG-${student.rollNumber}`,
            full_name: student.name,
            gender: student.gender,
            admission_year: new Date().getFullYear(),
            regulation: "R23",
            is_active: true
          })
          .select("id")
          .single()

        if (sError) throw sError
        studentId = newStudent.id
      }

      // 2. Create section assignment
      await supabase
        .from("student_section_assignments")
        .insert({
          student_id: studentId,
          section_id: sectionId,
          academic_session_id: sessionId,
          is_active: true
        })

      return {
        id: studentId,
        rollNumber: student.rollNumber,
        name: student.name,
        gender: student.gender,
        mobileNumber: student.mobileNumber
      }
    } catch (err: any) {
      if (err?.code === "42501") {
        console.warn("Supabase RLS Restriction: Enrollment write bypassed, using local store.")
      } else {
        console.error("Error enrolling student:", err)
      }
      return null
    }
  },

  async promoteBatchInSupabase(
    batchId: string, 
    nextSessionName: string, 
    nextYearLevel: string, 
    targetSemester: "Odd" | "Even",
    config: { retainFaculty: boolean; retainTimetable: boolean }
  ): Promise<{ success: boolean; nextSessionId?: string }> {
    try {
      const deptId = await this.getOrInitializeDepartmentId()

      // 1. Check or create next academic session
      const nextSessionId = `session-${nextSessionName}`
      const years = nextSessionName.split("-").map(Number)
      const startYear = years[0] || 2027
      const endYear = years[1] || 2028

      // Disable other sessions
      await supabase.from("academic_sessions").update({ is_active: false }).eq("is_active", true)

      // Insert or get new session
      const { data: existingSession } = await supabase
        .from("academic_sessions")
        .select("id")
        .eq("session_name", nextSessionName)
        .maybeSingle()

      let finalSessionId = existingSession?.id
      if (!finalSessionId) {
        const { data: newSess, error: sessError } = await supabase
          .from("academic_sessions")
          .insert({
            session_name: nextSessionName,
            start_year: startYear,
            end_year: endYear,
            start_date: `${startYear}-06-01`,
            end_date: `${endYear}-05-30`,
            is_active: true
          })
          .select("id")
          .single()
        if (sessError) throw sessError
        finalSessionId = newSess.id
      } else {
        await supabase.from("academic_sessions").update({ is_active: true }).eq("id", finalSessionId)
      }

      // Update department settings active session
      await supabase
        .from("department_settings")
        .update({
          current_academic_session: finalSessionId,
          current_semester: targetSemester === "Odd" ? 5 : 6 // mock semester jump
        })
        .eq("department_id", deptId)

      // 2. Fetch sections of this program/batch under current session
      const { data: oldSections, error: secError } = await supabase
        .from("sections")
        .select("*")
        .eq("program_id", batchId)
        .eq("is_active", true)

      if (secError) throw secError

      for (const oldSec of oldSections || []) {
        let nextName = oldSec.section_name
        const yearVal = labelToYear(nextYearLevel)
        const semVal = targetSemester === "Odd" ? (yearVal * 2 - 1) : (yearVal * 2)

        // Insert new section
        const { data: newSec, error: newSecError } = await supabase
          .from("sections")
          .insert({
            department_id: deptId,
            program_id: batchId,
            academic_session_id: finalSessionId,
            year: yearVal,
            semester: semVal,
            section_name: nextName,
            is_active: nextYearLevel !== "Graduated"
          })
          .select("id")
          .single()

        if (newSecError) continue

        // Migrate student assignments
        const { data: oldAssignments } = await supabase
          .from("student_section_assignments")
          .select("student_id")
          .eq("section_id", oldSec.id)
          .eq("is_active", true)

        if (oldAssignments && oldAssignments.length > 0) {
          // Deactivate old assignments
          await supabase
            .from("student_section_assignments")
            .update({ is_active: false })
            .eq("section_id", oldSec.id)

          if (nextYearLevel !== "Graduated") {
            const newAssigns = oldAssignments.map(a => ({
              student_id: a.student_id,
              section_id: newSec.id,
              academic_session_id: finalSessionId,
              is_active: true
            }))
            await supabase.from("student_section_assignments").insert(newAssigns)
          }
        }

        // Clone faculty assignments if requested
        if (config.retainFaculty) {
          const { data: oldFacAssigns } = await supabase
            .from("faculty_assignments")
            .select("faculty_id, subject_id")
            .eq("section_id", oldSec.id)
            .eq("is_active", true)

          if (oldFacAssigns && oldFacAssigns.length > 0) {
            const newFacAssigns = oldFacAssigns.map(fa => ({
              faculty_id: fa.faculty_id,
              subject_id: fa.subject_id,
              section_id: newSec.id,
              academic_session_id: finalSessionId,
              is_active: true
            }))
            await supabase.from("faculty_assignments").insert(newFacAssigns)
          }
        }
      }

      return { success: true, nextSessionId: finalSessionId }
    } catch (err) {
      console.error("Supabase promotion error:", err)
      return { success: false }
    }
  },

  async fetchAllStudents(): Promise<Student[]> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("is_active", true)

      if (error) throw error
      return (data || []).map(s => ({
        id: s.id,
        rollNumber: s.roll_number,
        name: s.full_name,
        gender: s.gender as any,
        mobileNumber: s.phone || "",
        status: "present"
      }))
    } catch (err) {
      console.error("Error fetching all students:", err)
      return []
    }
  },

  async fetchAllEnrollments(): Promise<StudentSectionAssignment[]> {
    try {
      const { data, error } = await supabase
        .from("student_section_assignments")
        .select("*")
        .eq("is_active", true)

      if (error) throw error
      return (data || []).map(e => ({
        id: e.id,
        studentId: e.student_id,
        sectionId: e.section_id,
        academicSessionId: e.academic_session_id,
        status: "Active",
        joinedOn: e.assigned_at ? new Date(e.assigned_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
      }))
    } catch (err) {
      console.error("Error fetching enrollments:", err)
      return []
    }
  }
}

