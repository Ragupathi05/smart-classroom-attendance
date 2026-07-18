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
      // 1. Try to get the active logged-in user's department ID from the auth store
      const { useAuthStore } = require("@/store")
      const localUser = useAuthStore.getState().user
      if (localUser?.id) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("department_id")
          .eq("id", localUser.id)
          .maybeSingle()

        if (userProfile?.department_id) {
          return userProfile.department_id
        }
      }

      // 2. Try to get the active logged-in user's department ID from Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("department_id")
          .eq("id", session.user.id)
          .maybeSingle()

        if (userProfile?.department_id) {
          return userProfile.department_id
        }
      }

      // 3. Fallback to reusing ANY existing department in the database (e.g. CSM)
      const { data: existingDepts } = await supabase
        .from("departments")
        .select("id")
        .limit(1)

      if (existingDepts && existingDepts.length > 0) {
        return existingDepts[0].id
      }

      // 4. Fallback to default department check/creation if no department exists at all
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
        status: s.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"
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
        await supabase.from("academic_sessions").update({ status: "INACTIVE" }).eq("status", "ACTIVE")
      }

      const { data, error } = await supabase
        .from("academic_sessions")
        .insert({
          session_name: session.name,
          start_year: startYear,
          end_year: endYear,
          start_date: startDate,
          end_date: endDate,
          status: session.status
        })
        .select("*")
        .single()

      if (error) throw error
      return {
        id: data.id,
        name: data.session_name,
        status: data.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"
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
          is_active,
          departments (
            code
          )
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

        // Fetch CR / LR names from section_role_assignments
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

        // Fallback: Fetch CR / LR names from student_section_assignments (roll_no_in_class)
        // Format: "CR" (default password) or "CR:customPwd" (custom password)
        const { data: localRoles } = await supabase
          .from("student_section_assignments")
          .select(`
            roll_no_in_class,
            students (
              full_name
            )
          `)
          .eq("section_id", s.id)
          .or("roll_no_in_class.like.CR%,roll_no_in_class.like.LR%")

        const localCr = (localRoles || []).find(r => r.roll_no_in_class?.startsWith("CR"))
        const localLr = (localRoles || []).find(r => r.roll_no_in_class?.startsWith("LR"))

        // Parse password from roll_no_in_class (format: "CR" or "CR:customPwd")
        const parseCRLRPassword = (val: string | null) => {
          if (!val) return undefined
          const colonIdx = val.indexOf(":")
          return colonIdx > 0 ? val.substring(colonIdx + 1) : undefined
        }

        const crName = crObj 
          ? (crObj.users as any)?.full_name || "Unassigned" 
          : (localCr ? (localCr.students as any)?.full_name || "Unassigned" : "Unassigned")

        const lrName = lrObj 
          ? (lrObj.users as any)?.full_name || "Unassigned" 
          : (localLr ? (localLr.students as any)?.full_name || "Unassigned" : "Unassigned")

        const crPassword = parseCRLRPassword(localCr?.roll_no_in_class || null)
        const lrPassword = parseCRLRPassword(localLr?.roll_no_in_class || null)

        // Fetch faculty assignment count
        const { count: facultyCount } = await supabase
          .from("faculty_assignments")
          .select("*", { count: "exact", head: true })
          .eq("section_id", s.id)
          .eq("is_active", true)

        const yearLabel = yearToLabel(s.year)
        const deptCode = (s.departments as any)?.code ? (s.departments as any).code.split("@")[0] : "CSE"

        sectionsList.push({
          id: s.id,
          name: `${getRomanYear(yearLabel)} ${deptCode} ${s.section_name}`,
          year: yearLabel,
          semester: s.semester % 2 === 0 ? "Even" : "Odd",
          sectionName: s.section_name,
          studentCount: studentCount || 0,
          crName: crName,
          lrName: lrName,
          crPassword: crPassword,
          lrPassword: lrPassword,
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

  async assignCRLRInSupabase(sectionId: string, crName: string, lrName: string, sessionId: string): Promise<boolean> {
    try {
      // 1. Reset existing CR/LR roles for this section and session (match CR, CR:pwd, LR, LR:pwd)
      // Need two separate updates since PostgREST .in() doesn't support LIKE
      await supabase
        .from("student_section_assignments")
        .update({ roll_no_in_class: null })
        .eq("section_id", sectionId)
        .eq("academic_session_id", sessionId)
        .like("roll_no_in_class", "CR%")
      
      await supabase
        .from("student_section_assignments")
        .update({ roll_no_in_class: null })
        .eq("section_id", sectionId)
        .eq("academic_session_id", sessionId)
        .like("roll_no_in_class", "LR%")

      // 2. Find the student who is assigned as CR (default password = just "CR")
      if (crName && crName !== "To be assigned" && crName !== "Unassigned") {
        const { data: crStud } = await supabase
          .from("students")
          .select("id")
          .eq("full_name", crName)
          .limit(1)
          .maybeSingle()

        if (crStud) {
          const { error: crErr } = await supabase
            .from("student_section_assignments")
            .update({ roll_no_in_class: "CR" })
            .eq("student_id", crStud.id)
            .eq("section_id", sectionId)
            .eq("academic_session_id", sessionId)
          
          if (crErr) console.error("CR assign error:", crErr.message)
        } else {
          console.warn("CR student not found in students table:", crName)
        }
      }

      // 3. Find the student who is assigned as LR (default password = just "LR")
      if (lrName && lrName !== "To be assigned" && lrName !== "Unassigned") {
        const { data: lrStud } = await supabase
          .from("students")
          .select("id")
          .eq("full_name", lrName)
          .limit(1)
          .maybeSingle()

        if (lrStud) {
          const { error: lrErr } = await supabase
            .from("student_section_assignments")
            .update({ roll_no_in_class: "LR" })
            .eq("student_id", lrStud.id)
            .eq("section_id", sectionId)
            .eq("academic_session_id", sessionId)
          
          if (lrErr) console.error("LR assign error:", lrErr.message)
        } else {
          console.warn("LR student not found in students table:", lrName)
        }
      }

      return true
    } catch (err) {
      console.error("Error assigning CR/LR in Supabase:", err)
      return false
    }
  },

  // Update CR/LR password in Supabase (stores as "CR:newPassword" or "LR:newPassword")
  async updateCRLRPasswordInSupabase(studentName: string, role: "cr" | "lr", newPassword: string): Promise<boolean> {
    try {
      const rolePrefix = role === "cr" ? "CR" : "LR"
      
      // Find the student
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("full_name", studentName)
        .limit(1)
        .maybeSingle()

      if (!student) {
        console.warn("Student not found for password update:", studentName)
        return false
      }

      // Update roll_no_in_class to "CR:newPassword" or "LR:newPassword"
      const { error } = await supabase
        .from("student_section_assignments")
        .update({ roll_no_in_class: `${rolePrefix}:${newPassword}` })
        .eq("student_id", student.id)
        .like("roll_no_in_class", `${rolePrefix}%`)

      if (error) {
        console.error("Password update error:", error.message)
        return false
      }
      return true
    } catch (err) {
      console.error("Error updating CR/LR password:", err)
      return false
    }
  },

  // Reset CR/LR password to default (stores as just "CR" or "LR")
  async resetCRLRPasswordInSupabase(studentName: string, role: "cr" | "lr"): Promise<boolean> {
    try {
      const rolePrefix = role === "cr" ? "CR" : "LR"
      
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("full_name", studentName)
        .limit(1)
        .maybeSingle()

      if (!student) {
        console.warn("Student not found for password reset:", studentName)
        return false
      }

      // Reset to just "CR" or "LR" (means default password)
      const { error } = await supabase
        .from("student_section_assignments")
        .update({ roll_no_in_class: rolePrefix })
        .eq("student_id", student.id)
        .like("roll_no_in_class", `${rolePrefix}%`)

      if (error) {
        console.error("Password reset error:", error.message)
        return false
      }
      return true
    } catch (err) {
      console.error("Error resetting CR/LR password:", err)
      return false
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
              year,
              departments (
                code
              )
            )
          `)
          .eq("faculty_id", f.id)
          .eq("is_active", true)

        const subjects = Array.from(new Set((assignments || []).map(a => (a.subjects as any)?.subject_name).filter(Boolean))) as string[]
        const sections = Array.from(new Set((assignments || []).map(a => {
          const s = (a.sections as any)
          if (!s) return null
          const deptCode = s.departments?.code ? s.departments.code.split("@")[0] : "CSE"
          return `${getRomanYear(yearToLabel(s.year))} ${deptCode} ${s.section_name}`
        }).filter(Boolean))) as string[]

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
      // 0. Check if the profile already exists in the public users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", fac.email.trim().toLowerCase())
        .maybeSingle()

      if (existingUser) {
        return {
          id: existingUser.id,
          code: existingUser.faculty_code,
          name: existingUser.full_name,
          department: "CSE",
          email: existingUser.email,
          phone: existingUser.phone || "",
          subjects: [],
          sections: [],
          weeklyLoad: 0,
          attendancePending: 0,
          status: existingUser.is_active ? "Active" : "Inactive"
        }
      }

      // Use a separate Supabase client for signup so we don't affect the HOD's session
      const { createClient } = await import("@supabase/supabase-js")
      const signupClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: "sb-signup-temp-token",
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {}
            }
          }
        }
      )

      const tempPassword = `Faculty@${fac.code}123`
      let authUserId: string | undefined

      // 1. Create auth user via signUp (generates a valid auth.users entry)
      const { data: authData, error: authError } = await signupClient.auth.signUp({
        email: fac.email,
        password: tempPassword,
        options: {
          data: { full_name: fac.name, role: "Faculty" }
        }
      })

      if (authError) {
        // Fallback: If user is already registered in Auth, try to sign in to get their user ID
        if (authError.message.toLowerCase().includes("already registered") || authError.status === 422) {
          console.warn("User already registered in Auth. Attempting fallback sign-in to retrieve ID.")
          const { data: signInData, error: signInErr } = await signupClient.auth.signInWithPassword({
            email: fac.email,
            password: tempPassword
          })
          if (signInErr) {
            console.error("Fallback sign-in failed:", signInErr.message)
            throw authError
          }
          authUserId = signInData?.user?.id
        } else {
          console.error("Auth signUp error:", authError.message)
          throw authError
        }
      } else {
        authUserId = authData?.user?.id
      }

      if (!authUserId) {
        throw new Error("Could not resolve auth user ID")
      }

      // 2. Insert into users table using the auth user ID (satisfies FK to auth.users)
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: authUserId,
          full_name: fac.name,
          email: fac.email,
          phone: fac.phone || null,
          faculty_code: fac.code,
          role: "Faculty",
          department_id: deptId,
          is_active: fac.status === "Active"
        })
        .select("*")
        .single()

      if (error) {
        console.error("Users table insert error:", error.message)
        throw error
      }

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

  async updateFacultyInSupabase(id: string, fields: Partial<FacultyMember>): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {}
      if (fields.name !== undefined) updateData.full_name = fields.name
      if (fields.email !== undefined) updateData.email = fields.email
      if (fields.phone !== undefined) updateData.phone = fields.phone
      if (fields.code !== undefined) updateData.faculty_code = fields.code
      if (fields.status !== undefined) updateData.is_active = fields.status === "Active"

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", id)

        if (error) {
          console.error("Error updating faculty profile:", error.message)
          return false
        }
      }

      // Sync subjects/sections to faculty_assignments table if updated
      if (fields.subjects !== undefined || fields.sections !== undefined) {
        await this.syncFacultyAssignments(id, fields.subjects, fields.sections)
      }

      return true
    } catch (err) {
      console.error("Error updating faculty in Supabase:", err)
      return false
    }
  },

  async syncFacultyAssignments(
    facultyId: string,
    subjects: string[] | undefined,
    sections: string[] | undefined
  ): Promise<boolean> {
    try {
      // 1. Get the department ID and the active session ID
      const deptId = await this.getOrInitializeDepartmentId()
      const { data: activeSession } = await supabase
        .from("academic_sessions")
        .select("id")
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle()

      const sessionId = activeSession?.id
      if (!sessionId) {
        console.warn("No active academic session found for faculty assignments sync")
        return false
      }

      // 2. Fetch current assignments to know what subjects/sections are already mapped if one of them is undefined
      const { data: currentAssigns } = await supabase
        .from("faculty_assignments")
        .select(`
          id,
          subject_id,
          section_id,
          subjects (
            subject_name
          ),
          sections (
            section_name,
            year,
            departments (
              code
            )
          )
        `)
        .eq("faculty_id", facultyId)
        .eq("academic_session_id", sessionId)
        .eq("is_active", true)

      // Extract unique subject names and section names from current assignments
      const currentSubjects = Array.from(new Set((currentAssigns || []).map(a => (a.subjects as any)?.subject_name).filter(Boolean))) as string[]
      const currentSections = Array.from(new Set((currentAssigns || []).map(a => {
        const s = (a.sections as any)
        if (!s) return null
        const deptCode = s.departments?.code ? s.departments.code.split("@")[0] : "CSE"
        return `${getRomanYear(yearToLabel(s.year))} ${deptCode} ${s.section_name}`
      }).filter(Boolean))) as string[]

      const targetSubjects = subjects !== undefined ? subjects : currentSubjects
      const targetSections = sections !== undefined ? sections : currentSections

      // 3. Resolve all target subjects to their IDs. If a subject doesn't exist in the subjects table, insert it.
      const resolvedSubjectIds: string[] = []
      const { SUBJECTS } = require("@/constants") // Dynamic import to avoid load issues
      
      for (const name of targetSubjects) {
        const trimmedName = name.trim()
        // Try to find in database first
        let { data: subData } = await supabase
          .from("subjects")
          .select("id")
          .eq("subject_name", trimmedName)
          .limit(1)
          .maybeSingle()

        if (subData) {
          resolvedSubjectIds.push(subData.id)
        } else {
          // Find or generate subject code
          let code = Object.keys(SUBJECTS).find(k => SUBJECTS[k] === trimmedName) || 
                     trimmedName.split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 10)
          if (!code) code = "SUB-" + Date.now().toString().slice(-4)
          
          const { data: newSub, error: subErr } = await supabase
            .from("subjects")
            .insert({
              subject_name: trimmedName,
              subject_code: code,
              department_id: deptId,
              semester: 1 // Default
            })
            .select("id")
            .single()

          if (subErr) {
            console.error("Error creating subject:", subErr.message)
            continue
          }
          resolvedSubjectIds.push(newSub.id)
        }
      }

      // 4. Resolve target sections to their database IDs.
      const resolvedSectionIds: string[] = []
      // Fetch sections for this department
      const { data: dbSections } = await supabase
        .from("sections")
        .select(`
          id,
          section_name,
          year,
          departments (
            code
          )
        `)
        .eq("department_id", deptId)

      for (const name of targetSections) {
        const matched = (dbSections || []).find(s => {
          const deptCode = (s.departments as any)?.code ? (s.departments as any).code.split("@")[0] : "CSE"
          const sName = `${getRomanYear(yearToLabel(s.year))} ${deptCode} ${s.section_name}`
          return sName.toLowerCase() === name.toLowerCase()
        })
        if (matched) {
          resolvedSectionIds.push(matched.id)
        } else {
          console.warn("Could not resolve section name to DB ID:", name)
        }
      }

      // 5. Generate target assignments cross product
      const targetPairs: { subjectId: string; sectionId: string }[] = []
      for (const subjectId of resolvedSubjectIds) {
        for (const sectionId of resolvedSectionIds) {
          targetPairs.push({ subjectId, sectionId })
        }
      }

      // 6. Delete assignments that are not in targetPairs
      const currentPairs = (currentAssigns || []).map(a => ({
        id: a.id,
        subjectId: a.subject_id,
        sectionId: a.section_id
      }))

      const toDelete = currentPairs.filter(cp => 
        !targetPairs.some(tp => tp.subjectId === cp.subjectId && tp.sectionId === cp.sectionId)
      )

      for (const d of toDelete) {
        await supabase
          .from("faculty_assignments")
          .update({ is_active: false })
          .eq("id", d.id)
      }

      // 7. Insert assignments that are not in currentPairs
      const toInsert = targetPairs.filter(tp => 
        !currentPairs.some(cp => cp.subjectId === tp.subjectId && cp.sectionId === tp.sectionId)
      )

      if (toInsert.length > 0) {
        const insertRows = toInsert.map(tp => ({
          faculty_id: facultyId,
          subject_id: tp.subjectId,
          section_id: tp.sectionId,
          academic_session_id: sessionId,
          is_active: true
        }))

        const { error: insErr } = await supabase
          .from("faculty_assignments")
          .insert(insertRows)

        if (insErr) {
          console.error("Error inserting faculty assignments:", insErr.message)
          return false
        }
      }

      return true
    } catch (err) {
      console.error("Error syncing faculty assignments:", err)
      return false
    }
  },

  async deactivateFacultyInSupabase(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", id)

      if (error) {
        console.error("Error deactivating faculty:", error.message)
        return false
      }
      return true
    } catch (err) {
      console.error("Error deactivating faculty in Supabase:", err)
      return false
    }
  },

  async deleteFacultyInSupabase(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Error deleting faculty:", error.message)
        return false
      }
      return true
    } catch (err) {
      console.error("Error deleting faculty in Supabase:", err)
      return false
    }
  },

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
      await supabase.from("academic_sessions").update({ status: "INACTIVE" }).eq("status", "ACTIVE")

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
            status: "ACTIVE"
          })
          .select("id")
          .single()
        if (sessError) throw sessError
        finalSessionId = newSess.id
      } else {
        await supabase.from("academic_sessions").update({ status: "ACTIVE" }).eq("id", finalSessionId)
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

