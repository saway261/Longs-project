"use server"

import { requireRole } from "@/src/lib/permissions"
import * as userService from "@/src/services/user-service"
import type { UserRole } from "@prisma/client"

export type { UserDTO } from "@/src/services/user-service"

/** ユーザー一覧取得（admin 専用） */
export async function getUsersAction(): Promise<
  { success: true; data: userService.UserDTO[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin"])
    const data = await userService.listUsers()
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getUsersAction]", e)
    return { success: false, error: "ユーザー一覧の取得に失敗しました" }
  }
}

/** ユーザー作成（admin 専用） */
export async function createUserAction(input: {
  email: string
  name: string
  password: string
  role: UserRole
}): Promise<{ success: true; data: userService.UserDTO } | { success: false; error: string }> {
  try {
    await requireRole(["admin"])

    if (input.role === "admin") return { success: false, error: "管理者ロールはUIから作成できません。" }
    if (!input.email.trim()) return { success: false, error: "メールアドレスを入力してください" }
    if (!input.name.trim()) return { success: false, error: "名前を入力してください" }
    if (input.password.length < 6) return { success: false, error: "パスワードは6文字以上で入力してください" }

    const data = await userService.createUser(input)
    return { success: true, data }
  } catch (e: any) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e?.code === "P2002") return { success: false, error: "そのメールアドレスはすでに使用されています" }
    console.error("[createUserAction]", e)
    return { success: false, error: "ユーザーの作成に失敗しました" }
  }
}

/** ユーザー削除（admin 専用・自分自身は削除不可） */
export async function deleteUserAction(userId: string): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const session = await requireRole(["admin"])
    await userService.deleteUser(userId, session.userId)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error && e.message === "自分自身は削除できません") {
      return { success: false, error: e.message }
    }
    console.error("[deleteUserAction]", e)
    return { success: false, error: "ユーザーの削除に失敗しました" }
  }
}
