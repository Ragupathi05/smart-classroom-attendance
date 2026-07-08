import { UserRole } from "./Role"

export interface AppNotification {
  id: string
  title: string
  message: string
  createdAt: string
  targetRole: UserRole | "all"
  read: boolean
}
