"use client"

import { useState, useTransition } from "react"
import { changePasswordAction } from "@/src/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"

export function PasswordClient() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      const result = await changePasswordAction(form)
      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    })
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">パスワード変更</h1>
        <p className="text-sm text-muted-foreground mt-1">現在のパスワードを確認したうえで新しいパスワードを設定します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            パスワードを変更しました
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">現在のパスワード</Label>
          <Input
            id="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">新しいパスワード</Label>
          <Input
            id="newPassword"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            autoComplete="new-password"
            placeholder="6文字以上"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          パスワードを変更する
        </Button>
      </form>
    </div>
  )
}
