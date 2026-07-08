import type { User, UserRole } from "@/types"
import { CLASS_NAME } from "@/constants"

export class AuthService {
  static async login(userId: string, role: UserRole): Promise<User | null> {
    if (!userId) return null
    const roleNames: Record<UserRole, string> = {
      cr: "Class Representative",
      lr: "Ladies Representative",
      faculty: "Mr. P. Udayakumar",
    }
    return {
      id: userId,
      name: roleNames[role],
      role,
      className: CLASS_NAME,
      email: `${userId}@college.edu`,
    }
  }
}
