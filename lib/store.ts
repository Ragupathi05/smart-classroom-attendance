import { create } from "zustand"

export type UserRole = "cr" | "lr" | "faculty"

export type AttendanceStatus = "present" | "permission" | "absent"

export interface User {
  id: string
  name: string
  role: UserRole
  className: string
}

export interface Student {
  id: string
  rollNumber: string
  name: string
  status: AttendanceStatus
}

export interface AttendanceRecord {
  id: string
  subject: string
  subjectCode: string
  date: string
  timeSlot: string
  className: string
  students: Student[]
  submittedAt?: string
  submittedBy?: string
}

export interface CorrectionRequest {
  id: string
  studentName: string
  rollNumber: string
  subject: string
  date: string
  reason: string
  status: "pending" | "approved" | "rejected"
}

export interface TimetableCell {
  id: string
  subjectCode: string
  subjectName: string
  day: string
  timeSlot: string
  status: "current" | "submitted" | "missed" | "upcoming"
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  currentPage: string
  students: Student[]
  attendanceRecords: AttendanceRecord[]
  correctionRequests: CorrectionRequest[]
  timetable: TimetableCell[]
  selectedCell: TimetableCell | null
  
  // Actions
  login: (userId: string, password: string, role: UserRole) => boolean
  logout: () => void
  setCurrentPage: (page: string) => void
  updateStudentStatus: (studentId: string, status: AttendanceStatus) => void
  submitAttendance: (cell: TimetableCell) => void
  setSelectedCell: (cell: TimetableCell | null) => void
  approveCorrectionRequest: (requestId: string) => void
  rejectCorrectionRequest: (requestId: string) => void
}

const initialStudents: Student[] = [
  { id: "1", rollNumber: "21CS001", name: "Aditya Kumar", status: "present" },
  { id: "2", rollNumber: "21CS002", name: "Bhavya Sharma", status: "present" },
  { id: "3", rollNumber: "21CS003", name: "Chetan Patel", status: "present" },
  { id: "4", rollNumber: "21CS004", name: "Divya Singh", status: "present" },
  { id: "5", rollNumber: "21CS005", name: "Esha Gupta", status: "present" },
  { id: "6", rollNumber: "21CS006", name: "Farhan Ali", status: "present" },
  { id: "7", rollNumber: "21CS007", name: "Gauri Reddy", status: "present" },
  { id: "8", rollNumber: "21CS008", name: "Harsh Verma", status: "present" },
  { id: "9", rollNumber: "21CS009", name: "Ishita Joshi", status: "present" },
  { id: "10", rollNumber: "21CS010", name: "Jayesh Nair", status: "present" },
  { id: "11", rollNumber: "21CS011", name: "Kavya Menon", status: "present" },
  { id: "12", rollNumber: "21CS012", name: "Lakshmi Iyer", status: "present" },
  { id: "13", rollNumber: "21CS013", name: "Manish Tiwari", status: "present" },
  { id: "14", rollNumber: "21CS014", name: "Neha Agarwal", status: "present" },
  { id: "15", rollNumber: "21CS015", name: "Omkar Deshmukh", status: "present" },
  { id: "16", rollNumber: "21CS016", name: "Priya Saxena", status: "present" },
  { id: "17", rollNumber: "21CS017", name: "Qasim Sheikh", status: "present" },
  { id: "18", rollNumber: "21CS018", name: "Rahul Chopra", status: "present" },
  { id: "19", rollNumber: "21CS019", name: "Sneha Kulkarni", status: "present" },
  { id: "20", rollNumber: "21CS020", name: "Tanvi Mishra", status: "present" },
]

const generateTimetable = (): TimetableCell[] => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const timeSlots = [
    "9:10-10:10",
    "10:10-11:10",
    "11:10-12:10",
    "1:00-2:00",
    "2:00-3:00",
    "3:00-4:00",
    "4:00-5:00",
  ]
  
  const subjects = [
    { code: "DL", name: "Deep Learning" },
    { code: "SS", name: "System Software" },
    { code: "EB", name: "E-Business" },
    { code: "CCAI", name: "Cloud Computing & AI" },
    { code: "RL", name: "Reinforcement Learning" },
    { code: "BDA", name: "Big Data Analytics" },
    { code: "ATCD", name: "Automata Theory" },
    { code: "RM", name: "Research Methodology" },
    { code: "LAB", name: "Laboratory" },
  ]
  
  const timetable: TimetableCell[] = []
  
  days.forEach((day) => {
    timeSlots.forEach((timeSlot, index) => {
      const subject = subjects[Math.floor(Math.random() * subjects.length)]
      const dayIndex = days.indexOf(day)
      const currentDay = new Date().getDay()
      const currentHour = new Date().getHours()
      
      let status: TimetableCell["status"] = "upcoming"
      
      // Check if this is today
      if (dayIndex + 1 === currentDay) {
        const slotHour = parseInt(timeSlot.split(":")[0])
        if (slotHour < currentHour) {
          status = Math.random() > 0.3 ? "submitted" : "missed"
        } else if (slotHour === currentHour) {
          status = "current"
        }
      } else if (dayIndex + 1 < currentDay) {
        status = Math.random() > 0.2 ? "submitted" : "missed"
      }
      
      timetable.push({
        id: `${day}-${index}`,
        subjectCode: subject.code,
        subjectName: subject.name,
        day,
        timeSlot,
        status,
      })
    })
  })
  
  return timetable
}

const initialAttendanceRecords: AttendanceRecord[] = [
  {
    id: "1",
    subject: "Deep Learning",
    subjectCode: "DL",
    date: "2026-03-07",
    timeSlot: "9:10-10:10",
    className: "CSE AI & ML",
    students: initialStudents.map((s) => ({ ...s, status: Math.random() > 0.2 ? "present" : "absent" as AttendanceStatus })),
    submittedAt: "2026-03-07T09:45:00",
    submittedBy: "CR - Aditya Kumar",
  },
  {
    id: "2",
    subject: "System Software",
    subjectCode: "SS",
    date: "2026-03-07",
    timeSlot: "10:10-11:10",
    className: "CSE AI & ML",
    students: initialStudents.map((s) => ({ ...s, status: Math.random() > 0.15 ? "present" : "absent" as AttendanceStatus })),
    submittedAt: "2026-03-07T10:45:00",
    submittedBy: "CR - Aditya Kumar",
  },
  {
    id: "3",
    subject: "Big Data Analytics",
    subjectCode: "BDA",
    date: "2026-03-06",
    timeSlot: "2:00-3:00",
    className: "CSE AI & ML",
    students: initialStudents.map((s) => ({ ...s, status: Math.random() > 0.1 ? "present" : "absent" as AttendanceStatus })),
    submittedAt: "2026-03-06T14:45:00",
    submittedBy: "LR - Priya Saxena",
  },
]

const initialCorrectionRequests: CorrectionRequest[] = [
  {
    id: "1",
    studentName: "Rahul Chopra",
    rollNumber: "21CS018",
    subject: "Deep Learning",
    date: "2026-03-07",
    reason: "I was present but marked absent by mistake",
    status: "pending",
  },
  {
    id: "2",
    studentName: "Sneha Kulkarni",
    rollNumber: "21CS019",
    subject: "System Software",
    date: "2026-03-06",
    reason: "Had permission from HOD for official work",
    status: "pending",
  },
]

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  currentPage: "dashboard",
  students: initialStudents,
  attendanceRecords: initialAttendanceRecords,
  correctionRequests: initialCorrectionRequests,
  timetable: generateTimetable(),
  selectedCell: null,
  
  login: (userId, password, role) => {
    // Simple mock authentication
    if (userId && password) {
      const roleNames = {
        cr: "Class Representative",
        lr: "Ladies Representative",
        faculty: "Faculty Member",
      }
      set({
        user: {
          id: userId,
          name: role === "cr" ? "Aditya Kumar" : role === "lr" ? "Priya Saxena" : "Dr. Sharma",
          role,
          className: "CSE AI & ML",
        },
        isAuthenticated: true,
        currentPage: "dashboard",
      })
      return true
    }
    return false
  },
  
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      currentPage: "dashboard",
      students: initialStudents,
    })
  },
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  updateStudentStatus: (studentId, status) =>
    set((state) => ({
      students: state.students.map((s) =>
        s.id === studentId ? { ...s, status } : s
      ),
    })),
  
  submitAttendance: (cell) =>
    set((state) => {
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        subject: cell.subjectName,
        subjectCode: cell.subjectCode,
        date: new Date().toISOString().split("T")[0],
        timeSlot: cell.timeSlot,
        className: state.user?.className || "CSE AI & ML",
        students: [...state.students],
        submittedAt: new Date().toISOString(),
        submittedBy: `${state.user?.role.toUpperCase()} - ${state.user?.name}`,
      }
      
      return {
        attendanceRecords: [newRecord, ...state.attendanceRecords],
        timetable: state.timetable.map((t) =>
          t.id === cell.id ? { ...t, status: "submitted" as const } : t
        ),
        students: initialStudents, // Reset students for next attendance
        selectedCell: null,
        currentPage: "dashboard",
      }
    }),
  
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  
  approveCorrectionRequest: (requestId) =>
    set((state) => ({
      correctionRequests: state.correctionRequests.map((r) =>
        r.id === requestId ? { ...r, status: "approved" as const } : r
      ),
    })),
  
  rejectCorrectionRequest: (requestId) =>
    set((state) => ({
      correctionRequests: state.correctionRequests.map((r) =>
        r.id === requestId ? { ...r, status: "rejected" as const } : r
      ),
    })),
}))
