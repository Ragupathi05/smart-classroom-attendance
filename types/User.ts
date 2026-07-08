import { UserRole } from "./Role"

export interface User {
  id: string
  name: string
  role: UserRole
  className: string
  email?: string
}
