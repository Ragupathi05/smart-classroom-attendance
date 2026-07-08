import { AppSettings } from "@/types"

export const CLASS_NAME = "III B.TECH CSE (AI & ML) - II SEM"

export const ROLES = {
  CR: "cr",
  LR: "lr",
  FACULTY: "faculty",
} as const

export const STORAGE_KEYS = {
  ATTENDANCE_RECORDS: "attendanceRecords",
  STORE: "attendance-app-store-v1",
} as const

export const TIME_SLOTS = [
  "9:10-10:10",
  "10:10-11:10",
  "11:10-12:10",
  "1:00-2:00",
  "2:00-3:00",
  "3:00-4:00",
  "4:00-5:00",
]

export const SUBJECTS: Record<string, string> = {
  BDA: "Big Data Analytics",
  CCAI: "Cloud Computing for AI",
  DL: "Deep Learning",
  ATCD: "Automata Theory and Compiler Design",
  RL: "Reinforcement Learning",
  EB: "E-Business",
  RM: "Research Methodology",
  "BDCC LAB": "Big Data and Cloud Computing Laboratory",
  "DL LAB": "Deep Learning Laboratory",
  SS: "Soft Skills",
  "SS (SEC)": "Soft Skills (SEC - IV)",
  "SS LAB (SEC)": "Soft Skills Lab (SEC)",
  "T LAB": "Tinkering Laboratory",
  APTITUDE: "Aptitude",
  VERBAL: "Verbal",
  MM: "Mentor - Mentee",
}

export const SUBJECT_FACULTY: Record<string, string> = {
  BDA: "Dr. K. Raman",
  CCAI: "Dr. V. Saranya",
  DL: "Mr. P. Udayakumar",
  ATCD: "Dr. R. Prakash",
  RL: "Dr. S. Karthik",
  EB: "Dr. M. Divya",
  RM: "Dr. A. Nirmala",
  "BDCC LAB": "Ms. N. Priyanka",
  "DL LAB": "Mr. P. Udayakumar",
  SS: "Ms. B. Kavitha",
  "SS (SEC)": "Ms. B. Kavitha",
  "SS LAB (SEC)": "Ms. B. Kavitha",
  "T LAB": "Mr. R. Manoj",
  APTITUDE: "Mr. S. Hari",
  VERBAL: "Ms. L. Keerthana",
  MM: "Class Mentor",
}

export const WEEKLY_SCHEDULE: Record<string, string[]> = {
  Monday: ["DL", "SS", "EB", "CCAI", "DL LAB", "DL LAB", "DL LAB"],
  Tuesday: ["CCAI", "SS (SEC)", "MM", "RL", "BDA", "ATCD", "RM"],
  Wednesday: ["EB", "T LAB", "T LAB", "APTITUDE", "ATCD", "DL", "RM"],
  Thursday: ["BDA", "APTITUDE", "EB", "RL", "RM", "ATCD", "DL"],
  Friday: ["BDCC LAB", "BDCC LAB", "BDCC LAB", "SS LAB (SEC)", "SS LAB (SEC)", "VERBAL", "BDA"],
  Saturday: ["RL", "CCAI", "MM", "", "", "", ""],
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoSelectPresent: true,
  allowLateModifications: true,
  requireConfirmation: true,
  classReminders: true,
  attendanceAlerts: true,
  emailReports: false,
  twoFactorEnabled: false,
}
