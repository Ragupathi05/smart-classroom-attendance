import { UserRole } from "./Role"

export interface User {
  id: string
  name: string
  role: UserRole
  className: string
  email?: string
  department?: string
  year?: string
  section?: string
  phone?: string
  mentor?: string
}
