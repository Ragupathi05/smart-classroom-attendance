import type { Student } from "@/types"
import { csmStudents } from "@/lib/data/csm-students"

export class StudentService {
  static getSeedStudents(): Student[] {
    return csmStudents.map((student) => ({ ...student, status: "present" }))
  }
}
