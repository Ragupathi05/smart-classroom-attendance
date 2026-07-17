import type { Student } from "@/types"
import { csmStudents } from "@/lib/data/csm-students"

const femaleFirstNames = new Set([
  "akhila", "amrutha", "asritha", "bhavana", "bhavya", "priya", "jeevitha", 
  "nandini", "charitha", "harika", "mounika", "yamini", "kavya", "tejaswi",
  "harini", "indhu", "keerthi", "meghana", "swathi", "sneha", "ramya",
  "sravani", "yamini", "yamuna", "anjali", "deepika", "jyothi", "kalyani",
  "lalitha", "madhavi", "manjula", "padma", "radhika", "sandhya", "saritha",
  "shailaja", "srilatha", "saritha", "sitha", "sudha", "sunitha",
  "swarna", "uma", "usha", "vanaja", "vasantha", "vijaya"
])

export class StudentService {
  static getSeedStudents(): Student[] {
    return csmStudents.map((student, idx) => {
      const firstName = student.name.trim().split(/\s+/)[0].toLowerCase()
      const gender = femaleFirstNames.has(firstName) ? "Female" : "Male"
      // Generate a reproducible random-looking mobile number
      const mobileNum = `98480${String(10000 + (idx * 7) % 90000)}`
      return {
        ...student,
        status: "present",
        gender,
        mobileNumber: mobileNum
      }
    })
  }
}
