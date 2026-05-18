import { redirect } from "next/navigation"
import { headers } from "next/headers"
import type { UserRole } from "@prisma/client"
import { getSession } from "@/src/lib/auth"
import { canAccess } from "@/src/lib/permissions"
import { AppShell } from "@/components/layout/app-shell"
import { SessionGuard } from "@/components/providers/session-guard"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server Componentでセッション検証（初回アクセス時・F5リロード時に実行）
  // - 絶対タイムアウト（7日）チェック
  // - アイドルタイムアウト（24時間）チェック
  // - スライディングウィンドウ実装
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // ロールベースのアクセス制御
  // middleware.ts で付与した x-pathname ヘッダーでアクセスパスを取得
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? "/"

  if (!canAccess(session.role as UserRole, pathname)) {
    redirect("/design/pop")
  }

  return (
    <>
      {/* クライアント側でセッション監視（ページ遷移時・定期的にチェック） */}
      <SessionGuard checkIntervalMs={5 * 60 * 1000} />
      <AppShell user={{ name: session.name, role: session.role }}>{children}</AppShell>
    </>
  )
}
