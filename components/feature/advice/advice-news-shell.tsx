"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import {
  Bot,
  CloudSun,
  Globe,
  TrendingUp,
  Calendar,
  Shirt,
  Footprints,
  Briefcase,
  Plus,
  Pencil,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Newspaper,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/feature/page-header"
import { WeekPicker } from "@/components/feature/advice/week-picker"
import { NewsQueryEditDialog } from "@/components/feature/advice/news-query-edit-dialog"
import { cn } from "@/lib/utils"
import { getWeekStart } from "@/src/lib/news-week"
import {
  fetchLatestNewsAction,
  getNewsViewAction,
  listActiveQueriesAction,
  createNewsQueryAction,
  updateNewsQueryAction,
  deleteNewsQueryAction,
  deleteNewsArticleAction,
} from "@/src/actions/news-actions"
import type { NewsQueryDTO, NewsViewGroup } from "@/src/actions/news-actions"

// ─── 週次ニュース モックデータ ────────────────────────────────────────────

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

function getMockIndex(weekStart: Date): number {
  const currentWeekStart = getWeekStart(new Date())
  const weekDiff = Math.round(
    (weekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 3600 * 1000),
  )
  return ((weekDiff % weeklyAdvices.length) + weeklyAdvices.length) % weeklyAdvices.length
}

// ─── 定数 ─────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 10

// ─── メインコンポーネント ──────────────────────────────────────────────────

interface Props {
  initialData: NewsViewGroup[]
  initialWeekStart: Date
  initialQueries: NewsQueryDTO[]
}

export function AdviceNewsShell({ initialData, initialWeekStart, initialQueries }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart)

  // ─── 週次ニュース ─────────────────────────────────────────────────

  const selectedWeek = weeklyAdvices[getMockIndex(weekStart)]

  // ─── 経営判断ニュース state ───────────────────────────────────────

  const [viewData, setViewData] = useState<NewsViewGroup[]>(initialData)
  const [queries, setQueries] = useState<NewsQueryDTO[]>(initialQueries)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuery, setEditingQuery] = useState<NewsQueryDTO | null>(null)
  const [isFetching, startFetching] = useTransition()
  const [isLoading, startLoading] = useTransition()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const loadNewsView = useCallback((ws: Date) => {
    startLoading(async () => {
      const res = await getNewsViewAction(ws.toISOString())
      if (res.success) setViewData(res.data)
    })
  }, [])

  // weekStart 変化時に関連ニュースを再取得
  const prevWeekStart = useRef<number | null>(null)
  useEffect(() => {
    const t = weekStart.getTime()
    if (prevWeekStart.current !== null && prevWeekStart.current !== t) {
      loadNewsView(weekStart)
    }
    prevWeekStart.current = t
  }, [weekStart, loadNewsView])

  function handleFetch() {
    startFetching(async () => {
      await fetchLatestNewsAction()
      const [qRes, nRes] = await Promise.all([
        listActiveQueriesAction(),
        getNewsViewAction(weekStart.toISOString()),
      ])
      if (qRes.success) setQueries(qRes.data)
      if (nRes.success) setViewData(nRes.data)
    })
  }

  function openCreate() {
    setEditingQuery(null)
    setDialogOpen(true)
  }

  function openEdit(q: NewsQueryDTO) {
    setEditingQuery(q)
    setDialogOpen(true)
  }

  async function handleSave(input: Parameters<typeof createNewsQueryAction>[0]) {
    if (editingQuery) {
      const res = await updateNewsQueryAction(editingQuery.id, input)
      if (!res.success) throw new Error(res.error)
    } else {
      const res = await createNewsQueryAction(input)
      if (!res.success) throw new Error(res.error)
    }
    const [qRes, nRes] = await Promise.all([
      listActiveQueriesAction(),
      getNewsViewAction(weekStart.toISOString()),
    ])
    if (qRes.success) setQueries(qRes.data)
    if (nRes.success) setViewData(nRes.data)
  }

  async function handleDeleteQuery() {
    if (!editingQuery) return
    const res = await deleteNewsQueryAction(editingQuery.id)
    if (!res.success) throw new Error(res.error)
    const [qRes, nRes] = await Promise.all([
      listActiveQueriesAction(),
      getNewsViewAction(weekStart.toISOString()),
    ])
    if (qRes.success) setQueries(qRes.data)
    if (nRes.success) setViewData(nRes.data)
  }

  async function handleDeleteArticle(articleId: string) {
    setDeletingIds((prev) => new Set(prev).add(articleId))
    const res = await deleteNewsArticleAction(articleId)
    if (res.success) {
      setViewData((prev) =>
        prev.map((group) => ({
          ...group,
          articles: group.articles.filter((a) => a.id !== articleId),
        })),
      )
    }
    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(articleId)
      return next
    })
  }

  function toggleExpand(groupId: string) {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // ─── レンダリング ─────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* ── 週次ニュース ── */}
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
              <WeekPicker weekStart={weekStart} onChange={setWeekStart} />
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
                  {selectedWeek.isLatest && (
                    <Badge className="bg-white/20 text-white hover:bg-white/30">最新</Badge>
                  )}
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

      {/* ── セパレータ ── */}
      <div className="px-6 py-4">
        <Separator />
        <div className="flex items-center gap-2 mt-6 mb-2">
          <Newspaper className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">関連ニュース一覧</h2>
        </div>
      </div>

      {/* ── 経営判断ニュース ── */}
      <div className="px-6 pb-6 space-y-6">
        {/* ツールバー */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetch}
              disabled={isFetching || queries.length === 0}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />
              {isFetching ? "取得中..." : "最新ニュースを取得"}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              検索フィルターを追加
            </Button>
          </div>
        </div>

        {/* フィルターが0件 */}
        {queries.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="mb-3">検索フィルターがまだ登録されていません。</p>
              <Button variant="outline" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                検索フィルターを追加
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ニュースカード（queryGroupId単位） */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">読み込み中...</div>
        ) : (
          viewData.map((group) => {
            const isExpanded = expandedGroups[group.queryGroupId] ?? false
            const hasMore = group.articles.length > COLLAPSE_THRESHOLD
            const visibleArticles =
              hasMore && !isExpanded ? group.articles.slice(0, COLLAPSE_THRESHOLD) : group.articles

            return (
              <Card key={group.queryGroupId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{group.queryName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {group.articles.length} 件
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const q = queries.find((q) => q.queryGroupId === group.queryGroupId)
                          if (q) openEdit(q)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.articles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      この週のニュースはありません。「最新ニュースを取得」ボタンで取得できます。
                    </p>
                  ) : (
                    <>
                      {visibleArticles.map((article) => (
                        <div
                          key={article.id}
                          className={cn(
                            "p-3 rounded-xl border border-border/70 hover:border-[#345fe1]/60 hover:shadow-sm transition-colors",
                            deletingIds.has(article.id) && "opacity-40 pointer-events-none",
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <Badge
                              className={cn(
                                "text-xs",
                                article.impact === "high"
                                  ? "bg-red-100 text-red-700"
                                  : article.impact === "medium"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : article.impact === "low"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-500",
                              )}
                            >
                              影響度:{" "}
                              {article.impact === "high"
                                ? "高"
                                : article.impact === "medium"
                                  ? "中"
                                  : article.impact === "low"
                                    ? "低"
                                    : "-"}
                            </Badge>
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-xs text-muted-foreground">
                                {article.sourceName && `${article.sourceName} ・ `}
                                {new Date(article.publishedAt).toLocaleString("ja-JP", {
                                  timeZone: "Asia/Tokyo",
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteArticle(article.id)}
                                disabled={deletingIds.has(article.id)}
                                title="この記事を削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {article.sourceUrl ? (
                            <a
                              href={article.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold hover:underline"
                            >
                              {article.title}
                            </a>
                          ) : (
                            <p className="font-semibold">{article.title}</p>
                          )}
                          {article.summary && (
                            <p className="text-sm text-muted-foreground mt-1">{article.summary}</p>
                          )}
                        </div>
                      ))}

                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground hover:text-foreground"
                          onClick={() => toggleExpand(group.queryGroupId)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1.5" />
                              折りたたむ
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1.5" />
                              もっと見る（残り {group.articles.length - COLLAPSE_THRESHOLD} 件）
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}

        <NewsQueryEditDialog
          key={editingQuery?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          query={editingQuery}
          onSave={handleSave}
          onDelete={editingQuery ? handleDeleteQuery : undefined}
        />
      </div>
    </div>
  )
}
