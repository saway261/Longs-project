"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent, useTransition } from "react"
import { CalendarClock, Lock, ShieldCheck, Smartphone, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { loginAction } from "@/src/actions/auth-actions" 
 
const highlights = [
  { title: "年間/月次ガント", icon: CalendarClock, description: "当月払いや翌々月15日払いなどのサイトを一目管理" },
  { title: "固定費もPL連動", icon: ShieldCheck, description: "家賃・人件費・サブスクをまとめて可視化" },
  { title: "スマホ対応", icon: Smartphone, description: "外出先からも一覧できるレスポンシブ設計" },
  { title: "設定同期", icon: Lock, description: "振込サイト・通知設定を保存していつでも再利用" },
]

export default function LoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string>("")

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    // フォームデータを取得
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Server Action呼び出し
    startTransition(async () => {
      const result = await loginAction({ email, password })

      if (result.success) {
        // ログイン成功 → デザインスタジオへ
        router.push("/design/pop")
      } else {
        // ログイン失敗 → エラー表示
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#345fe1]/15 via-white to-white">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <Badge variant="outline" className="bg-white/70">
            Apparel Business Dashboard
          </Badge>
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              年間ガント・固定費・振込サイトをまとめて可視化。
            </h1>
            <p className="text-muted-foreground">
              デモログインでダッシュボードに入れます。スマホでも崩れず、支払いサイクルや固定費を一目で確認。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="bg-white/70">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="w-4 h-4 text-[#345fe1]" />
                      {item.title}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <Card className="backdrop-blur bg-white/90 shadow-xl border border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">ログイン</CardTitle>
            <p className="text-sm text-muted-foreground">ダミー情報でOKです。入力後ダッシュボードへ遷移します。</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="demo@apparel.jp"
                  required
                  defaultValue="testuser@apparel.jp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  defaultValue="testpass"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean) => setRememberMe(Boolean(checked))}
                    className="data-[state=checked]:bg-[#345fe1]"
                  />
                  <span className="text-sm text-muted-foreground">次回から自動ログイン</span>
                </div>
                <Link href="/settings" className="text-sm text-[#345fe1] hover:underline">
                  パスワードを忘れた
                </Link>
              </div>
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full gap-2 bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
                  disabled={isPending}
                >
                  {isPending ? "ログイン中..." : "ログイン"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#345fe1]" />
                  直近の入出金をホームで確認
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#345fe1]" />
                  設定はローカル保存のダミー
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
