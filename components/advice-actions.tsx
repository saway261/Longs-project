"use client"

import {
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function AdvicePageHeader({
  eyebrow = "AI Advice",
  title,
  description,
  icon: Icon,
  iconClassName,
}: {
  eyebrow?: string
  title: string
  description: string
  icon: LucideIcon
  iconClassName?: string
}) {
  return (
    <div className="mb-6">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Icon className={cn("w-6 h-6 text-[#345fe1]", iconClassName)} />
        {title}
      </h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

const actionCandidates = [
  {
    title: "為替ヘッジと発注分散で原価上振れを抑制",
    category: "為替",
    impact: "high",
    horizon: "即時",
    summary: "円安局面の発注を複数回に分割し、為替予約の比率を引き上げる。",
  },
  {
    title: "素材比率の再設計と価格改定シミュレーション",
    category: "原材料",
    impact: "high",
    horizon: "今月",
    summary: "ウール/ポリエステル比率の見直しと、粗利確保ラインでの価格帯調整。",
  },
  {
    title: "輸入リードタイム延長を織り込んだ前倒し発注",
    category: "貿易・物流",
    impact: "medium",
    horizon: "今月",
    summary: "遅延リスクの高いカテゴリを先行手配し、欠品を回避。",
  },
  {
    title: "競合値上げを踏まえた価格レンジ再設計",
    category: "同業他社",
    impact: "medium",
    horizon: "次月",
    summary: "同価格帯の競争優位を確認し、重点商品の値付けを調整。",
  },
  {
    title: "セール前倒しに合わせた在庫圧縮プラン",
    category: "同業他社",
    impact: "high",
    horizon: "今月",
    summary: "滞留在庫の割引戦略を早期に決定し、キャッシュ回収を優先。",
  },
]

export function AIAdviceActionCandidates() {
  return (
    <div className="p-6">
      <AdvicePageHeader
        title="最適アクション候補"
        description="直近ニュースを起点に、実行優先度の高い打ち手を整理して意思決定につなげます。"
        icon={Sparkles}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">最適アクション候補（ニュース起点）</CardTitle>
              <p className="text-xs text-muted-foreground">直近ニュースから導出した重点アクションを5件提示</p>
            </div>
            <Button variant="outline" size="sm" className="bg-transparent">
              <RefreshCw className="w-4 h-4 mr-2" />
              再分析
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {actionCandidates.map((action, index) => (
              <div key={`${action.title}-${index}`} className="rounded-xl border border-border/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {action.category}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-xs",
                      action.impact === "high"
                        ? "bg-red-100 text-red-700"
                        : action.impact === "medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700",
                    )}
                  >
                    重要度: {action.impact === "high" ? "高" : action.impact === "medium" ? "中" : "低"}
                  </Badge>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{action.summary}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>対応期限: {action.horizon}</span>
                  <Button size="sm" className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white">
                    実行候補
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}