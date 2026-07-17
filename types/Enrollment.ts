export interface StudentSectionAssignment {
  id: string
  studentId: string
  sectionId: string
  academicSessionId: string
  status: "Active" | "Completed" | "Alumni"
  joinedOn: string // YYYY-MM-DD
}
