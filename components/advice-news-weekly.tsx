"use client"

import { useState } from "react"
import {
  Bot,
  CloudSun,
  Globe,
  TrendingUp,
  Calendar,
  Shirt,
  Footprints,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"

// AI Advice data - weekly summaries
const weeklyAdvices = [
  {
    id: 1,
    week: "2024年12月第3週",
    date: "2024/12/16 - 2024/12/22",
    isLatest: true,
    summary:
      "年末商戦に向けて、アウター類の需要が急増しています。特にダウンジャケットとウールコートの在庫確保を推奨します。",
    categories: [
      {
        name: "アウター",
        icon: Shirt,
        trend: "up",
        advice: "寒波到来予報により、ダウンジャケットの需要が前週比150%増加見込み。追加発注を推奨。",
        confidence: 92,
      },
      {
        name: "シューズ",
        icon: Footprints,
        trend: "up",
        advice: "防寒ブーツの検索トレンドが上昇中。在庫を20%増やすことを推奨。",
        confidence: 85,
      },
      {
        name: "バッグ",
        icon: Briefcase,
        trend: "stable",
        advice: "年末ギフト需要でレザーバッグが好調。現状維持で問題なし。",
        confidence: 78,
      },
    ],
    factors: [
      {
        type: "weather",
        icon: CloudSun,
        title: "気象情報",
        content: "来週は全国的に気温が平年より5度低い見込み。積雪の可能性あり。",
        impact: "high",
      },
      {
        type: "global",
        icon: Globe,
        title: "国際情勢",
        content: "中国からの輸入が通常通り。物流に大きな遅延なし。",
        impact: "low",
      },
      {
        type: "trend",
        icon: TrendingUp,
        title: "トレンド分析",
        content: "SNSで「ミニマルファッション」がトレンド。無地アイテムの需要増加。",
        impact: "medium",
      },
    ],
    actions: [
      { text: "ダウンジャケット 50点追加発注", priority: "high", category: "アウター" },
      { text: "防寒ブーツ 30点追加発注", priority: "high", category: "シューズ" },
      { text: "ウールコート在庫確認", priority: "medium", category: "アウター" },
      { text: "春物の入荷準備開始", priority: "low", category: "全般" },
    ],
  },
  {
    id: 2,
    week: "2024年12月第2週",
    date: "2024/12/09 - 2024/12/15",
    isLatest: false,
    summary: "冬物セールに向けた準備期間。在庫調整と価格見直しを推奨します。",
    categories: [
      {
        name: "アウター",
        icon: Shirt,
        trend: "stable",
        advice: "冬物コートの売れ行きが安定。セール前の価格維持を推奨。",
        confidence: 88,
      },
      {
        name: "シューズ",
        icon: Footprints,
        trend: "down",
        advice: "秋物シューズの在庫消化を優先。値引き販売を検討。",
        confidence: 82,
      },
      {
        name: "バッグ",
        icon: Briefcase,
        trend: "up",
        advice: "クリスマスギフト需要でバッグの売上増加中。",
        confidence: 75,
      },
    ],
    factors: [
      {
        type: "weather",
        icon: CloudSun,
        title: "気象情報",
        content: "週末にかけて気温低下。防寒具の需要増加見込み。",
        impact: "medium",
      },
      {
        type: "global",
        icon: Globe,
        title: "国際情勢",
        content: "アジア地域の物流が一部遅延。2-3日の遅れを想定。",
        impact: "medium",
      },
      {
        type: "trend",
        icon: TrendingUp,
        title: "トレンド分析",
        content: "インフルエンサーによるアウター紹介が話題。特定商品の需要急増。",
        impact: "high",
      },
    ],
    actions: [
      { text: "秋物シューズ 20%オフセール開始", priority: "high", category: "シューズ" },
      { text: "クリスマスギフトコーナー設置", priority: "medium", category: "全般" },
      { text: "防寒小物の店頭配置変更", priority: "low", category: "アクセサリー" },
    ],
  },
  {
    id: 3,
    week: "2024年12月第1週",
    date: "2024/12/02 - 2024/12/08",
    isLatest: false,
    summary: "12月商戦スタート。クリスマス需要に向けた品揃え強化を推奨します。",
    categories: [
      {
        name: "アウター",
        icon: Shirt,
        trend: "up",
        advice: "本格的な冬の到来でアウター需要が増加。在庫補充を推奨。",
        confidence: 90,
      },
      {
        name: "シューズ",
        icon: Footprints,
        trend: "stable",
        advice: "革靴の需要が安定。年末の忘年会シーズンに向けて在庫維持。",
        confidence: 80,
      },
      {
        name: "バッグ",
        icon: Briefcase,
        trend: "up",
        advice: "ギフト需要の立ち上がり。ラッピング対応の準備を。",
        confidence: 85,
      },
    ],
    factors: [
      {
        type: "weather",
        icon: CloudSun,
        title: "気象情報",
        content: "平年並みの気温。急激な変化なし。",
        impact: "low",
      },
      {
        type: "global",
        icon: Globe,
        title: "国際情勢",
        content: "物流は安定。年末に向けて発注リードタイムに注意。",
        impact: "low",
      },
      {
        type: "trend",
        icon: TrendingUp,
        title: "トレンド分析",
        content: "エコファッション、サステナブル商品への関心が高まる。",
        impact: "medium",
      },
    ],
    actions: [
      { text: "クリスマスギフト向け商品の陳列", priority: "high", category: "全般" },
      { text: "年末年始の営業時間確定", priority: "medium", category: "運営" },
      { text: "春物カタログの確認", priority: "low", category: "全般" },
    ],
  },
]

const inventoryDataInsights = [
  {
    title: "在庫回転率の改善余地",
    summary: "アウターの回転率が目標に対して低下。重点SKUの値引きと発注抑制が必要。",
    metric: "回転率: 2.5 / 目標 3.0",
    impact: "high",
  },
  {
    title: "カテゴリ別売上構成の偏り",
    summary: "トップス比率が高止まり。ボトムスの売上構成を増やす施策が必要。",
    metric: "トップス比率: 35%",
    impact: "medium",
  },
  {
    title: "在庫アラートの増加",
    summary: "在庫不足アラートが前月比で増加。補充リードタイムの短縮が課題。",
    metric: "在庫不足: 128件",
    impact: "high",
  },
]


export function AIAdviceWeeklyNews() {
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const selectedWeek = weeklyAdvices[selectedWeekIndex]

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="AI Advice"
        title="週次ニュース"
        description="天気、気温、国際情勢などの幅広い視点から、週次の経営示唆を確認します。"
        icon={Calendar}
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#345fe1]" />
              <span className="font-medium">週次レポート選択</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedWeekIndex((prev) => (prev === 0 ? weeklyAdvices.length - 1 : prev - 1))}
                className="bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-3 py-2 rounded-lg border border-[#345fe1]/30 bg-[#345fe1]/10 text-sm font-medium text-[#345fe1]">
                {selectedWeek.week}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedWeekIndex((prev) => (prev === weeklyAdvices.length - 1 ? 0 : prev + 1))}
                className="bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-linear-to-r from-[#345fe1] to-[#2a4bb3] text-white">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold">{selectedWeek.week}</h3>
                {selectedWeek.isLatest && <Badge className="bg-white/20 text-white hover:bg-white/30">最新</Badge>}
              </div>
              <p className="text-sm text-white/70 mb-2">{selectedWeek.date}</p>
              <p className="text-white/90">{selectedWeek.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {selectedWeek.categories.map((cat, index) => {
          const Icon = cat.icon
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#345fe1]" />
                    </div>
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <Badge
                    className={cn(
                      cat.trend === "up"
                        ? "bg-green-100 text-green-700"
                        : cat.trend === "down"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700",
                    )}
                  >
                    {cat.trend === "up" ? "↑ 上昇" : cat.trend === "down" ? "↓ 下降" : "→ 安定"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{cat.advice}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#345fe1] rounded-full" style={{ width: `${cat.confidence}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">信頼度 {cat.confidence}%</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">影響要因分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedWeek.factors.map((factor, index) => {
              const Icon = factor.icon
              return (
                <div
                  key={index}
                  className={cn(
                    "p-4 rounded-xl border",
                    factor.impact === "high"
                      ? "border-red-200 bg-red-50"
                      : factor.impact === "medium"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-green-200 bg-green-50",
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        factor.impact === "high"
                          ? "text-red-600"
                          : factor.impact === "medium"
                            ? "text-yellow-600"
                            : "text-green-600",
                      )}
                    />
                    <span className="font-medium">{factor.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{factor.content}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">在庫データ分析からのアドバイス</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inventoryDataInsights.map((item) => (
            <div key={item.title} className="rounded-xl border border-border/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{item.title}</p>
                <Badge
                  className={cn(
                    "text-[11px]",
                    item.impact === "high"
                      ? "bg-red-100 text-red-700"
                      : item.impact === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700",
                  )}
                >
                  影響度: {item.impact === "high" ? "高" : item.impact === "medium" ? "中" : "低"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.metric}</p>
              <p className="text-sm text-muted-foreground">{item.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}