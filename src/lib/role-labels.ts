import { UserRole } from "@prisma/client"

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  general: "一般",
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}
