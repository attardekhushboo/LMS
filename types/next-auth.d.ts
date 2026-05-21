import { DefaultSession } from "next-auth"
import { UserRole } from "../lib/types"

declare module "next-auth" {
  interface User {
    id?: string
    role?: UserRole
    isApproved?: boolean
    institutionId?: string
    class?: number
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      isApproved: boolean
      institutionId?: string
      class?: number
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/types" {
  interface User {
    id?: string
    role?: UserRole
    isApproved?: boolean
    institutionId?: string
    class?: number
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      isApproved: boolean
      institutionId?: string
      class?: number
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: UserRole
    isApproved?: boolean
    institutionId?: string
    class?: number
  }
}
