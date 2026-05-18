import { UserRole } from "@prisma/client"

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "システム管理者",
  manager: "マネージャー",
  general: "一般",
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}
