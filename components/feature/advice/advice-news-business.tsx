"use client"

import { Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/feature/page-header"
import { cn } from "@/lib/utils"

const newsCategories = [
  {
    id: "currency",
    label: "為替",
    description: "輸入原価と価格転嫁の意思決定に直結",
    items: [
      {
        title: "為替：円安進行で輸入コストが上振れ",
        source: "マーケット速報",
        time: "1時間前",
        impact: "high",
        summary: "主要通貨で円安が進み、海外仕入れの原価が上昇傾向。発注タイミングの分散と価格改定シミュレーションが必要。",
      },
    ],
  },
  {
    id: "materials",
    label: "原材料",
    description: "素材別の原価変動と配合見直しに影響",
    items: [
      {
        title: "原材料：ポリエステル価格が上昇、春夏素材に影響",
        source: "素材トレンド通信",
        time: "3時間前",
        impact: "medium",
        summary: "原油高の影響でポリエステル系素材が上昇。薄手アウターの原価見直しが必要。",
      },
      {
        title: "原材料コスト上昇：ウール糸の国際価格が前月比+8%",
        source: "日経ファッション",
        time: "2時間前",
        impact: "high",
        summary: "欧州の寒波と物流混乱でウール糸価格が上昇。コート類の原価率上振れが想定。",
      },
    ],
  },
  {
    id: "trade",
    label: "貿易・物流",
    description: "リードタイムと支払条件に影響",
    items: [
      {
        title: "物流：港湾の一部混雑解消、納期が通常リードタイムへ",
        source: "ロジスティクス通信",
        time: "昨日",
        impact: "low",
        summary: "海外工場からの仕入れが平常化。翌月末払いのキャッシュアウトが平準化する見込み。",
      },
      {
        title: "通関検査の強化で一部原産地のリードタイム延長",
        source: "貿易実務レポート",
        time: "今日",
        impact: "medium",
        summary: "一部ルートで検査が強化され、平均3〜5日の遅延。発注前倒しの検討が必要。",
      },
    ],
  },
  {
    id: "competitors",
    label: "同業他社",
    description: "価格戦略・MD切替えに影響",
    items: [
      {
        title: "競合大手がアウターの値上げを発表",
        source: "業界速報",
        time: "今日",
        impact: "medium",
        summary: "主要ブランドが原材料高を理由に価格改定。自社の価格改定タイミング再検討が必要。",
      },
      {
        title: "同業中堅がセール前倒しを発表",
        source: "流通ニュース",
        time: "昨日",
        impact: "high",
        summary: "在庫消化を優先する競合が増加。販促/値引き計画の再調整を検討。",
      },
    ],
  },
]

export function AIAdviceBusinessNews() {
  return (
    <div className="p-6">
      <PageHeader
        eyebrow="AI Advice"
        title="経営判断に直結するニュース"
        description="為替、原材料、物流、競合の変化を一覧で確認し、経営判断に必要な外部環境を把握します。"
        icon={Globe}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">経営判断に直結するニュース</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {newsCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{category.label}</p>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {category.items.length} 件
                </Badge>
              </div>
              <div className="space-y-3">
                {category.items.map((news, idx) => (
                  <div
                    key={`${category.id}-${idx}`}
                    className="p-3 rounded-xl border border-border/70 hover:border-[#345fe1]/60 hover:shadow-sm transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Badge
                        className={cn(
                          "text-xs",
                          news.impact === "high"
                            ? "bg-red-100 text-red-700"
                            : news.impact === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700",
                        )}
                      >
                        影響度: {news.impact === "high" ? "高" : news.impact === "medium" ? "中" : "低"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {news.source} ・ {news.time}
                      </span>
                    </div>
                    <p className="font-semibold">{news.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{news.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}