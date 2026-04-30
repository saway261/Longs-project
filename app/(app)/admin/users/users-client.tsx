"use client"

import { useState, useTransition } from "react"
import { createUserAction, deleteUserAction } from "@/src/actions/user-actions"
import type { UserDTO } from "@/src/actions/user-actions"
import type { UserRole } from "@prisma/client"
import { getRoleLabel } from "@/src/lib/role-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Loader2 } from "lucide-react"

const ROLE_BADGE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  manager: "secondary",
  general: "outline",
}

type Props = {
  initialUsers: UserDTO[]
  currentUserId: string
}

export function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserDTO[]>(initialUsers)
  const [pageError, setPageError] = useState<string | null>(null)

  // 作成モーダル
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "general" as UserRole,
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 削除確認
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = () => {
    startTransition(async () => {
      setCreateError(null)
      const result = await createUserAction(createForm)
      if (!result.success) {
        setCreateError(result.error)
        return
      }
      setUsers((prev) => [...prev, result.data])
      setIsCreateOpen(false)
      setCreateForm({ email: "", name: "", password: "", role: "general" })
    })
  }

  const handleDelete = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    const result = await deleteUserAction(deleteTargetId)
    setIsDeleting(false)
    setDeleteTargetId(null)
    if (!result.success) {
      setPageError(result.error)
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== deleteTargetId))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-sm text-muted-foreground mt-1">システムユーザーの作成・削除を行います</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          ユーザー作成
        </Button>
      </div>

      {pageError && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {pageError}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>ロール</TableHead>
              <TableHead>作成日</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  ユーザーが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || "（未設定）"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE_VARIANT[user.role]}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTargetId(user.id)}
                      disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? "自分自身は削除できません" : "削除"}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ユーザー作成モーダル */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ユーザー作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {createError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {createError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="create-name">名前</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">メールアドレス</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">パスワード</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="6文字以上"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ロール</Label>
              <Select
                value={createForm.role}
                onValueChange={(v: string) => setCreateForm((f) => ({ ...f, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">マネージャー</SelectItem>
                  <SelectItem value="general">一般</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認モーダル */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open:boolean) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ユーザーを削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この操作は取り消せません。対象ユーザーのセッションもすべて削除されます。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)} disabled={isDeleting}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
