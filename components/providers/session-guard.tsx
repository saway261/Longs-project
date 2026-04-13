"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSessionAction } from "@/src/actions/auth-actions"

/**
 * セッションガード: クライアント側でセッションの有効性を監視
 *
 * 【目的】
 * - ページ遷移時に自動的にセッション検証
 * - 定期的にセッション検証（アイドルタイムアウト検出）
 * - 無効なセッションの場合は /login へリダイレクト
 *
 * 【メリット】
 * - 各ページで個別に getSession() を呼ぶ必要がなくなる
 * - バックエンド実装者がセッション検証を意識する必要がない
 * - レイアウトに1度追加するだけで全ページに適用される
 *
 * @param checkIntervalMs - セッションチェックの間隔（ミリ秒）。デフォルト: 5分
 */
export function SessionGuard({
  checkIntervalMs = 5 * 60 * 1000 // デフォルト: 5分
}: {
  checkIntervalMs?: number
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await getSessionAction()

        if (!result.success || !result.data) {
          console.log("[SessionGuard] セッション無効 → ログインページへリダイレクト")
          router.push("/login")
          router.refresh()
        }
      } catch (error) {
        console.error("[SessionGuard] セッションチェックエラー:", error)
        router.push("/login")
        router.refresh()
      }
    }

    // ページ遷移時にセッションチェック
    checkSession()

    // 定期的にセッションチェック（アイドルタイムアウト検出）
    const interval = setInterval(checkSession, checkIntervalMs)

    return () => clearInterval(interval)
  }, [pathname, router, checkIntervalMs]) // pathname が変わるたびに実行

  return null // UI を持たないガードコンポーネント
}
