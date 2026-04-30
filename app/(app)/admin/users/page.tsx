import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/auth"
import { getUsersAction } from "@/src/actions/user-actions"
import { UsersClient } from "./users-client"

export default async function UsersPage() {
  // サーバー側でロールチェック
  const session = await getSession()
  if (!session || session.role !== "admin") {
    redirect("/design/pop")
  }

  // 初期ユーザー一覧取得
  const result = await getUsersAction()
  const initialUsers = result.success ? result.data : []

  return (
    <UsersClient
      initialUsers={initialUsers}
      currentUserId={session.userId}
    />
  )
}
