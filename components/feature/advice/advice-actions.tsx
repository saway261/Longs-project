"use client"

import { useState, useTransition } from "react"
import { Sparkles, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/feature/page-header"
import { updateActionStatusAction } from "@/src/actions/advice-actions"
import type { ActionRecommendationDTO } from "@/src/actions/advice-actions"

const ACTION_TYPE_LABEL: Record<string, string> = {
  procurement: "発注・仕入",
  sales_promotion: "販促・値引",
  inventory: "在庫調整",
  finance: "財務・資金",
  category: "カテゴリ戦略",
}

interface Props {
  initialActions: ActionRecommendationDTO[]
}

export function AIAdviceActionCandidates({ initialActions }: Props) {
  const [actions, setActions] = useState<ActionRecommendationDTO[]>(initialActions)
  const [isPending, startTransition] = useTransition()
  const [actingId, setActingId] = useState<string | null>(null)

  function handleUpdateStatus(id: string, status: "accepted" | "dismissed") {
    setActingId(id)
    startTransition(async () => {
      const res = await updateActionStatusAction(id, status)
      if (res.success) {
        setActions((prev) => prev.map((a) => (a.id === id ? res.data : a)))
      }
      setActingId(null)
    })
  }

  // 週ごとにグルーピング
  const byWeek = actions.reduce<Record<string, ActionRecommendationDTO[]>>((acc, a) => {
    const key = new Date(a.weekStart).toISOString().slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})
  const weekKeys = Object.keys(byWeek).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="AI Advice"
        title="最適アクション候補"
        description="週次ニュースページで生成したアクション候補が週ごとに蓄積されます。"
        icon={Sparkles}
      />

      {actions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">まだアクション候補がありません。</p>
            <p className="text-xs mt-1">週次ニュースページの「在庫データ分析からのアドバイス」セクションから生成できます。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {weekKeys.map((weekKey) => {
            const weekActions = byWeek[weekKey]
            const weekDate = new Date(weekKey)
            const weekEnd = new Date(weekDate)
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
            const weekLabel = `${weekDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} 〜 ${weekEnd.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} の週`

            return (
              <div key={weekKey}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{weekLabel}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {weekActions.map((action) => (
                    <div
                      key={action.id}
                      className={cn(
                        "rounded-xl border p-4 space-y-3 transition-opacity",
                        action.status === "dismissed" && "opacity-40",
                        action.status === "accepted" && "border-green-300 bg-green-50/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          {ACTION_TYPE_LABEL[action.actionType] ?? action.actionType}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-[11px]",
                            action.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : action.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700",
                          )}
                        >
                          重要度: {action.priority === "high" ? "高" : action.priority === "medium" ? "中" : "低"}
                        </Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-foreground text-sm">{action.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{action.description}</p>
                      </div>

                      {action.sources.length > 0 && (
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                          根拠: {action.sources.map((s) => s.evidence).filter(Boolean).join(" / ")}
                        </p>
                      )}

                      <div className="flex items-center justify-end pt-1">
                        {action.status === "pending" && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs text-destructive hover:bg-destructive/10"
                              disabled={isPending && actingId === action.id}
                              onClick={() => handleUpdateStatus(action.id, "dismissed")}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              却下
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-xs bg-primary hover:bg-primary/80 text-white"
                              disabled={isPending && actingId === action.id}
                              onClick={() => handleUpdateStatus(action.id, "accepted")}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              採用
                            </Button>
                          </div>
                        )}
                        {action.status === "accepted" && (
                          <Badge className="bg-green-100 text-green-700 text-[11px]">採用済み</Badge>
                        )}
                        {action.status === "dismissed" && (
                          <Badge className="bg-gray-100 text-gray-500 text-[11px]">却下済み</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
