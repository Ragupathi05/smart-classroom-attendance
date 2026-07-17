import type { User, UserRole } from "@/types"
import { SUBJECTS } from "@/constants"

export class AuthService {
  static async login(userId: string, role: UserRole): Promise<User | null> {
    if (!userId) return null
    const cleanedId = userId.trim()
    const lowerId = cleanedId.toLowerCase()

    // Dynamically require stores to avoid circular dependencies
    const { useAcademicStore, useStudentStore } = require("@/store")

    if (role === "hod") {
      return {
        id: cleanedId,
        name: "Dr. Ramesh",
        role: "hod",
        className: "",
        email: "hod@mits.ac.in",
        department: "Computer Science & Engineering",
        year: "",
        section: "",
        phone: "9876543210",
        mentor: "",
      }
    }

    if (role === "cr" || role === "lr") {
      const rollNumber = lowerId.replace("-cr", "").replace("-lr", "")
      const students = useStudentStore.getState().classStudents || []
      const student = students.find((s: any) => s.rollNumber.toLowerCase() === rollNumber)
      if (!student) return null

      const sections = useAcademicStore.getState().sections || []
      const section = sections.find((sec: any) => 
        (role === "cr" && sec.crName === student.name) || 
        (role === "lr" && sec.lrName === student.name)
      )

      if (!section) return null

      return {
        id: cleanedId,
        name: student.name,
        role,
        className: section.name,
        email: `${rollNumber}@mits.ac.in`,
        department: "Computer Science & Engineering",
        year: section.year,
        section: section.name.split(" ").pop() || "A",
        phone: student.mobileNumber || "9876543210",
        mentor: "Dr. Arunkumar",
        sectionId: section.id,
      }
    }

    if (role === "faculty") {
      const facultyList = useAcademicStore.getState().facultyList || []
      const faculty = facultyList.find((f: any) => 
        f.email.toLowerCase() === lowerId || 
        f.code.toLowerCase() === lowerId || 
        f.name.toLowerCase() === lowerId
      )

      if (!faculty) {
        // Fallback for first-time launch / demo if list has items
        if (facultyList.length > 0) {
          const first = facultyList[0]
          return {
            id: cleanedId,
            name: first.name,
            role: "faculty",
            className: "",
            email: first.email,
            department: "Computer Science & Engineering",
            year: "",
            section: "",
            phone: first.phone || "9876543210",
            mentor: "",
          }
        }
        return null
      }

      return {
        id: cleanedId,
        name: faculty.name,
        role: "faculty",
        className: "",
        email: faculty.email,
        department: "Computer Science & Engineering",
        year: "",
        section: "",
        phone: faculty.phone || "9876543210",
        mentor: "",
      }
    }

    return null
  }
}
