"use server"

import { ActionResult } from "@/src/lib/result"
import { loginSchema } from "@/src/lib/validation/auth"
import * as authService from "@/src/services/auth-service"
import { createSession, deleteSession, getSession } from "@/src/lib/auth"

export type SessionUser = {
  userId: string
  email: string
  name: string
  role: string
}

export async function loginAction(input: unknown): Promise<
  ActionResult<SessionUser>
> {
  try {
    // 1. Zodバリデーション
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message }
    }

    // 2. 認証検証（bcrypt）
    const user = await authService.verifyCredentials(
      parsed.data.email,
      parsed.data.password
    )
    if (!user) {
      return {
        success: false,
        error: "メールアドレスまたはパスワードが正しくありません",
      }
    }

    // 3. Session作成 + Cookie設定
    await createSession(user.id)

    // 4. ユーザー情報を返す
    return {
      success: true,
      data: { userId: user.id, email: user.email, name: user.name, role: user.role },
    }
  } catch (error) {
    console.error("[loginAction]", error)
    return { success: false, error: "ログインに失敗しました" }
  }
}

export async function logoutAction(): Promise<ActionResult<void>> {
  try {
    await deleteSession()
    return { success: true, data: undefined }
  } catch (error) {
    console.error("[logoutAction]", error)
    return { success: false, error: "ログアウトに失敗しました" }
  }
}

export async function getSessionAction(): Promise<
  ActionResult<SessionUser | null>
> {
  try {
    const session = await getSession()
    return { success: true, data: session }
  } catch (error) {
    console.error("[getSessionAction]", error)
    return { success: false, error: "セッション情報の取得に失敗しました" }
  }
}
