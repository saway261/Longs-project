import { cookies } from "next/headers"
import { prisma } from "@/src/lib/prisma"

export async function getSession(): Promise<{
  userId: string
  email: string
  name: string
  role: string
} | null> {
  try {
    // 1. CookieからsessionIdを取得
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("sessionId")?.value

    if (!sessionId) return null

    // 2. DBでSessionを検索
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }, // UserAccountをジョイン
    })

    if (!session) return null

    const now = new Date()

    // 3. 絶対タイムアウトチェック（7日間）
    if (session.expiresAt < now) {
      await prisma.session.delete({ where: { id: sessionId } })
      return null
    }

    // 4. アイドルタイムアウトチェック（1日 = 24時間）
    const idleTimeout = 24 * 60 * 60 * 1000 // 24時間（ミリ秒）
    const timeSinceLastActivity = now.getTime() - session.lastActivityAt.getTime()

    if (timeSinceLastActivity > idleTimeout) {
      await prisma.session.delete({ where: { id: sessionId } })
      return null
    }

    // 5. セッションリフレッシュ（スライディングウィンドウ）
    // 最終アクティビティから5分以上経過している場合のみ更新（DB負荷軽減）
    const updateThreshold = 5 * 60 * 1000 // 5分
    if (timeSinceLastActivity > updateThreshold) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActivityAt: now },
      })
      // Note: Cookie の有効期限は初回作成時の7日間のまま維持
      // Server Component 内では Cookie を変更できないため、DB の lastActivityAt のみ更新
    }

    // 6. ユーザー情報を返す
    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? "",
      role: session.user.role,
    }
  } catch (error) {
    console.error("[getSession]", error)
    return null
  }
}

export async function createSession(userId: string): Promise<void> {
  // 1. 既存セッションを全削除（セッション固定攻撃対策）
  await prisma.session.deleteMany({
    where: { userId },
  })

  // 2. Session有効期限を設定（7日間）
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // 3. DBにSessionレコードを作成
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      lastActivityAt: new Date(), // 初回作成時
    },
  })

  // 4. CookieにsessionIdを設定
  const cookieStore = await cookies()
  cookieStore.set("sessionId", session.id, {
    httpOnly: true, // JavaScriptからアクセス不可（XSS対策）
    secure: process.env.NODE_ENV === "production", // HTTPS必須（本番環境）
    sameSite: "lax", // CSRF対策
    expires: expiresAt,
    path: "/",
  })
}

export async function deleteSession(): Promise<void> {
  try {
    // 1. CookieからsessionIdを取得
    const cookieStore = await cookies()
    const sessionId = cookieStore.get("sessionId")?.value

    if (sessionId) {
      // 2. DBからSessionを削除
      await prisma.session
        .delete({
          where: { id: sessionId },
        })
        .catch(() => {
          // Session不存在でもエラーにしない
        })
    }

    // 3. Cookieを削除
    cookieStore.delete("sessionId")
  } catch (error) {
    console.error("[deleteSession]", error)
    throw error
  }
}
