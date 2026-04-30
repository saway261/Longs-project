import type { UserRole } from "@prisma/client"
import { getSession } from "@/src/lib/auth"

// general ユーザーがアクセスできるパスプレフィックス
const GENERAL_ALLOWED_PATHS = ["/design", "/account"]

/**
 * フロント層: パスとロールからアクセス可否を判定
 * - admin / manager: 全ページ許可
 * - general: /design/* のみ許可
 */
export function canAccess(role: UserRole, pathname: string): boolean {
  if (role === "admin" || role === "manager") return true
  return GENERAL_ALLOWED_PATHS.some((p) => pathname.startsWith(p))
}

/**
 * バックエンド層: Server Action 先頭で呼ぶ認可ガード
 * - 未認証の場合: Error("認証が必要です") をスロー
 * - ロール不足の場合: Error("権限がありません") をスロー
 * - 認可成功の場合: セッション情報を返す
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await getSession()
  if (!session) throw new Error("認証が必要です")
  if (!allowedRoles.includes(session.role as UserRole)) {
    throw new Error("権限がありません")
  }
  return session
}

/** ロールが admin かどうかを判定 */
export function isAdmin(role: UserRole): boolean {
  return role === "admin"
}
