import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/auth"
import { AppShell } from "@/components/app-shell"
import { SessionGuard } from "@/components/session-guard"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server Componentでセッション検証（初回アクセス時・F5リロード時に実行）
  // - 絶対タイムアウト（7日）チェック
  // - アイドルタイムアウト（24時間）チェック
  // - スライディングウィンドウ実装
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <>
      {/* クライアント側でセッション監視（ページ遷移時・定期的にチェック） */}
      <SessionGuard checkIntervalMs={5 * 60 * 1000} />
      <AppShell>{children}</AppShell>
    </>
  )
}
