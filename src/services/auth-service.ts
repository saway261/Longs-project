import { prisma } from "@/src/lib/prisma"
import bcrypt from "bcryptjs"

export type UserDTO = {
  id: string
  email: string
  name: string
  role: string
}

/**
 * メールアドレスとパスワードで認証検証
 * @returns ユーザー情報 or null（認証失敗）
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserDTO | null> {
  try {
    // 1. emailでUserAccountを検索
    const user = await prisma.userAccount.findUnique({
      where: { email },
    })

    if (!user || !user.passwordHash) {
      return null // ユーザー不存在 or パスワード未設定
    }

    // 2. bcryptでパスワード検証
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return null // パスワード不一致
    }

    // 3. ユーザー情報を返す
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
    }
  } catch (error) {
    console.error("[verifyCredentials]", error)
    return null
  }
}

/**
 * パスワードを変更する
 */
export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await prisma.userAccount.findUnique({ where: { id: userId } })
    if (!user) return { success: false, error: "ユーザーが見つかりません" }
    if (!user.passwordHash) return { success: false, error: "パスワードが設定されていません" }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) return { success: false, error: "現在のパスワードが正しくありません" }

    const newHash = await bcrypt.hash(newPassword, 12)
    await prisma.userAccount.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })
    return { success: true }
  } catch (error) {
    console.error("[updatePassword]", error)
    return { success: false, error: "パスワードの変更に失敗しました" }
  }
}

/**
 * IDでユーザー情報を取得（セッション復元用）
 */
export async function getUserById(userId: string): Promise<UserDTO | null> {
  try {
    const user = await prisma.userAccount.findUnique({
      where: { id: userId },
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      role: user.role,
    }
  } catch (error) {
    console.error("[getUserById]", error)
    return null
  }
}
