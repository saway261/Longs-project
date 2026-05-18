"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import {
  Bot,
  CloudSun,
  Globe,
  TrendingUp,
  Calendar,
  Shirt,
  Plus,
  Pencil,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Newspaper,
  Settings2,
  X,
  Loader2,
  Package,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PageHeader } from "@/components/feature/page-header"
import { WeekPicker } from "@/components/feature/advice/week-picker"
import { NewsQueryEditDialog } from "@/components/feature/advice/news-query-edit-dialog"
import { cn } from "@/lib/utils"
import { getWeekStart, isCurrentWeek, formatWeekRange, getWeekEnd } from "@/src/lib/news-week"
import {
  fetchLatestNewsAction,
  getNewsViewAction,
  listActiveQueriesAction,
  createNewsQueryAction,
  updateNewsQueryAction,
  deleteNewsQueryAction,
  deleteNewsArticleAction,
  setDefaultExcludedSourcesAction,
} from "@/src/actions/news-actions"
import type { NewsQueryDTO, NewsViewGroup } from "@/src/actions/news-actions"
import {
  addFactorConfigAction,
  removeFactorConfigAction,
  getWeeklyFactorAnalysesAction,
  runWeeklyFactorAnalysisAction,
  getWeeklyNewsSummariesAction,
  generateWeeklyNewsSummariesAction,
  getCategorySelectionsAction,
  addCategorySelectionAction,
  removeCategorySelectionAction,
  getWeeklyCategoryAdvicesAction,
  generateWeeklyCategoryAdviceAction,
  generateInventoryActionsAction,
  getActionRecommendationsAction,
} from "@/src/actions/advice-actions"
import type { FactorQueryConfigDTO, WeeklyFactorAnalysisDTO, WeeklyNewsSummaryDTO, FactorType, WeekCategorySelectionDTO, WeeklyCategoryAdviceDTO, ActionRecommendationDTO } from "@/src/actions/advice-actions"
import type { CategoryDTO } from "@/src/services/settings-service"
import { Input } from "@/components/ui/input"

// ─── 影響要因の定義 ────────────────────────────────────────────────────────

const FACTOR_DEFS = [
  { type: "weather" as FactorType, icon: CloudSun, title: "気象情報" },
  { type: "global" as FactorType, icon: Globe, title: "国際情勢" },
  { type: "trend" as FactorType, icon: TrendingUp, title: "トレンド分析" },
]

// ─── フィルター複数選択コンポーネント ────────────────────────────────────

interface FactorFilterSelectProps {
  queries: NewsQueryDTO[]
  selectedGroupIds: string[]
  onAdd: (queryGroupId: string) => void
  onRemove: (queryGroupId: string) => void
}

function FactorFilterSelect({ queries, selectedGroupIds, onAdd, onRemove }: FactorFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const label =
    selectedGroupIds.length === 0
      ? "フィルターを選択..."
      : `${selectedGroupIds.length}件のフィルター選択中`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between text-left font-normal">
          <span className={selectedGroupIds.length === 0 ? "text-muted-foreground" : ""}>{label}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {queries.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-1">フィルターがありません</p>
        ) : (
          <div className="space-y-1">
            {queries.map((q) => (
              <label
                key={q.queryGroupId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selectedGroupIds.includes(q.queryGroupId)}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    if (checked === true) onAdd(q.queryGroupId)
                    else onRemove(q.queryGroupId)
                  }}
                />
                <span className="text-sm leading-none">{q.name}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── 定数 ─────────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 10

// ─── メインコンポーネント ──────────────────────────────────────────────────

interface Props {
  initialData: NewsViewGroup[]
  initialWeekStart: Date
  initialQueries: NewsQueryDTO[]
  initialDefaultExcludedSources: string | null
  initialFactorConfigs: FactorQueryConfigDTO[]
  initialFactorAnalyses: WeeklyFactorAnalysisDTO[]
  initialNewsSummaries: WeeklyNewsSummaryDTO[]
  /** true のとき、今週でも5件以上ニュースがあれば分析ボタンを表示する */
  flexibleAnalysis?: boolean
  initialAllCategories: CategoryDTO[]
  initialCategorySelections: WeekCategorySelectionDTO[]
  initialCategoryAdvices: WeeklyCategoryAdviceDTO[]
  initialInventoryActions: ActionRecommendationDTO[]
}

export function AdviceNewsShell({ initialData, initialWeekStart, initialQueries, initialDefaultExcludedSources, initialFactorConfigs, initialFactorAnalyses, initialNewsSummaries, flexibleAnalysis = false, initialAllCategories, initialCategorySelections, initialCategoryAdvices, initialInventoryActions }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart)

  // ─── 週ラベル ─────────────────────────────────────────────────

  const weekLabel = formatWeekRange(weekStart)
  const weekEndDate = getWeekEnd(weekStart)
  const weekDateRange = `${weekStart.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })} - ${weekEndDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`

  // ─── 経営判断ニュース state ───────────────────────────────────────

  const [viewData, setViewData] = useState<NewsViewGroup[]>(initialData)
  const [queries, setQueries] = useState<NewsQueryDTO[]>(initialQueries)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingQuery, setEditingQuery] = useState<NewsQueryDTO | null>(null)
  const [isFetching, startFetching] = useTransition()
  const [isLoading, startLoading] = useTransition()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // ─── 影響要因分析 state ───────────────────────────────────────────

  const [factorConfigs, setFactorConfigs] = useState<FactorQueryConfigDTO[]>(initialFactorConfigs ?? [])
  const [factorAnalyses, setFactorAnalyses] = useState<WeeklyFactorAnalysisDTO[]>(initialFactorAnalyses ?? [])
  const [isRunningAnalysis, startRunningAnalysis] = useTransition()
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // ─── 週次要約サマリー state ───────────────────────────────────────

  const [newsSummaries, setNewsSummaries] = useState<WeeklyNewsSummaryDTO[]>(initialNewsSummaries ?? [])
  const [isGeneratingSummaries, startGeneratingSummaries] = useTransition()
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [articlesExpanded, setArticlesExpanded] = useState<Record<string, boolean>>({})

  // ─── カテゴリ別動向アドバイス state ──────────────────────────

  const [allCategories] = useState<CategoryDTO[]>(initialAllCategories)
  const [categorySelections, setCategorySelections] = useState<WeekCategorySelectionDTO[]>(initialCategorySelections ?? [])
  const [categoryAdvices, setCategoryAdvices] = useState<WeeklyCategoryAdviceDTO[]>(initialCategoryAdvices ?? [])
  const [generatingCategories, setGeneratingCategories] = useState<Set<string>>(new Set())
  const [categoryError, setCategoryError] = useState<Record<string, string>>({})
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [isUpdatingSelection, startUpdatingSelection] = useTransition()

  // ─── 在庫データアクション state ──────────────────────────────────

  // 在庫データ期間（YYYY-MM形式）
  const defaultPeriodTo = new Date().toISOString().slice(0, 7)
  const defaultPeriodFrom = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 2)
    return d.toISOString().slice(0, 7)
  })()
  const [inventoryPeriodFrom, setInventoryPeriodFrom] = useState(defaultPeriodFrom)
  const [inventoryPeriodTo, setInventoryPeriodTo] = useState(defaultPeriodTo)
  // 使用するニュース要約フィルターのqueryGroupId（空=全て）
  const [selectedSummaryGroupIds, setSelectedSummaryGroupIds] = useState<string[]>([])
  const [inventoryActions, setInventoryActions] = useState<ActionRecommendationDTO[]>(initialInventoryActions)
  const [isGeneratingActions, startGeneratingActions] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [summaryFilterOpen, setSummaryFilterOpen] = useState(false)

  function handleGenerateInventoryActions() {
    setActionError(null)
    startGeneratingActions(async () => {
      const periodFromDate = new Date(`${inventoryPeriodFrom}-01T00:00:00Z`)
      // 月末日を計算
      const [fy, fm] = inventoryPeriodTo.split("-").map(Number)
      const periodToDate = new Date(Date.UTC(fy, fm, 0)) // 翌月0日 = 当月末
      const groupIds = selectedSummaryGroupIds.length > 0
        ? selectedSummaryGroupIds
        : newsSummaries.map((s) => s.queryGroupId)
      const res = await generateInventoryActionsAction(
        weekStart.toISOString(),
        groupIds,
        periodFromDate.toISOString(),
        periodToDate.toISOString(),
      )
      if (res.success) {
        setInventoryActions(res.data)
      } else {
        setActionError(res.error)
      }
    })
  }

  // ─── デフォルト除外ソース設定 ─────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [defaultExcludedSources, setDefaultExcludedSources] = useState<string[]>(
    initialDefaultExcludedSources
      ? initialDefaultExcludedSources.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  )
  const [defaultSourceInput, setDefaultSourceInput] = useState("")
  const [isSavingSettings, startSavingSettings] = useTransition()
  const [settingsError, setSettingsError] = useState("")

  function addDefaultExcludedSource() {
    const src = defaultSourceInput.trim()
    if (!src || defaultExcludedSources.includes(src)) return
    setDefaultExcludedSources((prev) => [...prev, src])
    setDefaultSourceInput("")
  }

  function removeDefaultExcludedSource(src: string) {
    setDefaultExcludedSources((prev) => prev.filter((s) => s !== src))
  }

  function handleSaveSettings() {
    setSettingsError("")
    startSavingSettings(async () => {
      const value = defaultExcludedSources.join(",") || null
      const res = await setDefaultExcludedSourcesAction(value)
      if (!res.success) setSettingsError(res.error)
    })
  }

  const loadNewsView = useCallback((ws: Date) => {
    startLoading(async () => {
      const res = await getNewsViewAction(ws.toISOString())
      if (res.success) setViewData(res.data)
    })
  }, [])

  // weekStart 変化時に関連ニュースと factor 分析結果・サマリー・カテゴリ・アクションを再取得
  const prevWeekStart = useRef<number | null>(null)
  useEffect(() => {
    const t = weekStart.getTime()
    if (prevWeekStart.current !== null && prevWeekStart.current !== t) {
      loadNewsView(weekStart)
      setArticlesExpanded({})
      startRunningAnalysis(async () => {
        const [factorRes, summaryRes, selRes, advRes, actionRes] = await Promise.all([
          getWeeklyFactorAnalysesAction(weekStart.toISOString()),
          getWeeklyNewsSummariesAction(weekStart.toISOString()),
          getCategorySelectionsAction(weekStart.toISOString()),
          getWeeklyCategoryAdvicesAction(weekStart.toISOString()),
          getActionRecommendationsAction(weekStart.toISOString()),
        ])
        if (factorRes.success) setFactorAnalyses(factorRes.data)
        if (summaryRes.success) setNewsSummaries(summaryRes.data)
        if (selRes.success) setCategorySelections(selRes.data)
        if (advRes.success) setCategoryAdvices(advRes.data)
        if (actionRes.success) setInventoryActions(actionRes.data)
      })
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

  // ─── 影響要因分析ハンドラー ───────────────────────────────────────

  function handleAddFactorConfig(factorType: FactorType, queryGroupId: string) {
    startRunningAnalysis(async () => {
      const res = await addFactorConfigAction(factorType, queryGroupId)
      if (res.success) {
        const cfgRes = await getWeeklyFactorAnalysesAction(weekStart.toISOString())
        setFactorConfigs((prev) => {
          const exists = prev.some(
            (c) => c.factorType === factorType && c.queryGroupId === queryGroupId,
          )
          if (exists) return prev
          return [
            ...prev,
            { id: crypto.randomUUID(), factorType, queryGroupId, createdAt: new Date() },
          ]
        })
        if (cfgRes.success) setFactorAnalyses(cfgRes.data)
      }
    })
  }

  function handleRemoveFactorConfig(factorType: FactorType, queryGroupId: string) {
    startRunningAnalysis(async () => {
      const res = await removeFactorConfigAction(factorType, queryGroupId)
      if (res.success) {
        setFactorConfigs((prev) =>
          prev.filter((c) => !(c.factorType === factorType && c.queryGroupId === queryGroupId)),
        )
      }
    })
  }

  function handleRunAnalysis() {
    setAnalysisError(null)
    startRunningAnalysis(async () => {
      const res = await runWeeklyFactorAnalysisAction(weekStart.toISOString())
      if (res.success) {
        setFactorAnalyses(res.data)
      } else {
        console.error("[handleRunAnalysis] error:", res.error)
        setAnalysisError(res.error)
      }
    })
  }

  // ─── カテゴリ選択ハンドラー ───────────────────────────────────

  function handleToggleCategorySelection(categoryId: string, checked: boolean) {
    const iso = weekStart.toISOString()
    startUpdatingSelection(async () => {
      if (checked) {
        const res = await addCategorySelectionAction(iso, categoryId)
        if (res.success) {
          const selRes = await getCategorySelectionsAction(iso)
          if (selRes.success) setCategorySelections(selRes.data)
        }
      } else {
        const res = await removeCategorySelectionAction(iso, categoryId)
        if (res.success) {
          setCategorySelections((prev) => prev.filter((s) => s.categoryId !== categoryId))
          setCategoryAdvices((prev) => prev.filter((a) => a.categoryId !== categoryId))
        }
      }
    })
  }

  async function handleGenerateCategoryAdvice(categoryId: string) {
    setGeneratingCategories((prev) => new Set(prev).add(categoryId))
    setCategoryError((prev) => ({ ...prev, [categoryId]: "" }))
    const res = await generateWeeklyCategoryAdviceAction(weekStart.toISOString(), categoryId)
    if (res.success) {
      setCategoryAdvices((prev) => {
        const idx = prev.findIndex((a) => a.categoryId === categoryId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = res.data
          return next
        }
        return [...prev, res.data]
      })
    } else {
      setCategoryError((prev) => ({ ...prev, [categoryId]: res.error }))
    }
    setGeneratingCategories((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }

  function handleGenerateSummaries() {
    setSummaryError(null)
    startGeneratingSummaries(async () => {
      const res = await generateWeeklyNewsSummariesAction(weekStart.toISOString())
      if (res.success) {
        setNewsSummaries(res.data)
      } else {
        console.error("[handleGenerateSummaries] error:", res.error)
        setSummaryError(res.error)
      }
    })
  }

  function toggleArticlesExpanded(groupId: string) {
    setArticlesExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
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
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">週次レポート選択</span>
              </div>
              <WeekPicker weekStart={weekStart} onChange={setWeekStart} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-linear-to-r from-primary to-primary/80 text-white">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">{weekLabel}</h3>
                  {isCurrentWeek(weekStart) && (
                    <Badge className="bg-white/20 text-white hover:bg-white/30">今週</Badge>
                  )}
                </div>
                <p className="text-sm text-white/70">{weekDateRange}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── カテゴリ別動向 ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">カテゴリ別動向</h3>
            <Popover open={categorySelectOpen} onOpenChange={setCategorySelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdatingSelection}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  カテゴリを管理
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                {allCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-1">
                    カテゴリが登録されていません
                  </p>
                ) : (
                  <div className="space-y-1">
                    {allCategories.map((cat) => {
                      const selected = categorySelections.some((s) => s.categoryId === cat.id)
                      return (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked: boolean | "indeterminate") =>
                              handleToggleCategorySelection(cat.id, checked === true)
                            }
                          />
                          <span className="text-sm leading-none">{cat.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {categorySelections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              「カテゴリを管理」からカテゴリを選択してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categorySelections.map((sel) => {
                const advice = categoryAdvices.find((a) => a.categoryId === sel.categoryId)
                const isGenerating = generatingCategories.has(sel.categoryId)
                const error = categoryError[sel.categoryId]

                return (
                  <Card key={sel.categoryId}>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shirt className="w-4 h-4 text-primary" />
                          <span className="font-bold text-sm">{sel.categoryName}</span>
                        </div>
                        {advice && (
                          <Badge
                            className={cn(
                              "text-[11px]",
                              advice.trend === "up"
                                ? "bg-green-100 text-green-700"
                                : advice.trend === "down"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {advice.trend === "up" ? "↑ 上昇" : advice.trend === "down" ? "↓ 下降" : "→ 安定"}
                          </Badge>
                        )}
                      </div>

                      {isGenerating ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          グラウンディング中...
                        </div>
                      ) : advice ? (
                        <>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{advice.content}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(advice.generatedAt).toLocaleString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}生成
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleGenerateCategoryAdvice(sel.categoryId)}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              再生成
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Gemini がグラウンディングで最新情報を収集します。
                          </p>
                          {error && <p className="text-xs text-destructive">{error}</p>}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleGenerateCategoryAdvice(sel.categoryId)}
                          >
                            <Bot className="w-3.5 h-3.5 mr-1.5" />
                            動向を分析
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">影響要因分析</CardTitle>
              {(!isCurrentWeek(weekStart) || flexibleAnalysis) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunAnalysis}
                  disabled={isRunningAnalysis}
                >
                  {isRunningAnalysis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-1.5" />
                      AI分析を実行
                    </>
                  )}
                </Button>
              )}
            </div>
            {isCurrentWeek(weekStart) && !flexibleAnalysis && (
              <p className="text-xs text-muted-foreground mt-1">
                週終了後にAI分析を実行できます。現在ニュースデータを収集中です。
              </p>
            )}
            {isCurrentWeek(weekStart) && flexibleAnalysis && (
              <p className="text-xs text-muted-foreground mt-1">
                5件以上のニュースが収集されると分析を実行できます。
              </p>
            )}
            {analysisError && (
              <p className="text-xs text-destructive mt-1">{analysisError}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FACTOR_DEFS.map(({ type, icon: Icon, title }) => {
                const analysis = factorAnalyses.find((a) => a.factorType === type)
                const selectedGroupIds = factorConfigs
                  .filter((c) => c.factorType === type)
                  .map((c) => c.queryGroupId)

                return (
                  <div key={type} className="space-y-2">
                    <FactorFilterSelect
                      queries={queries}
                      selectedGroupIds={selectedGroupIds}
                      onAdd={(gid) => handleAddFactorConfig(type, gid)}
                      onRemove={(gid) => handleRemoveFactorConfig(type, gid)}
                    />
                    {isCurrentWeek(weekStart) && !flexibleAnalysis ? (
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5 text-blue-500" />
                          <span className="font-medium text-blue-900">{title}</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          十分なデータが集まっていないため分析を実行できません。
                        </p>
                      </div>
                    ) : analysis ? (
                      <div
                        className={cn(
                          "p-4 rounded-xl border",
                          analysis.impact === "high"
                            ? "border-red-200 bg-red-50"
                            : analysis.impact === "medium"
                              ? "border-yellow-200 bg-yellow-50"
                              : "border-green-200 bg-green-50",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon
                            className={cn(
                              "w-5 h-5",
                              analysis.impact === "high"
                                ? "text-red-600"
                                : analysis.impact === "medium"
                                  ? "text-yellow-600"
                                  : "text-green-600",
                            )}
                          />
                          <span className="font-medium">{title}</span>
                          <Badge
                            className={cn(
                              "text-[11px] ml-auto",
                              analysis.impact === "high"
                                ? "bg-red-100 text-red-700"
                                : analysis.impact === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700",
                            )}
                          >
                            影響度: {analysis.impact === "high" ? "高" : analysis.impact === "medium" ? "中" : "低"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{analysis.content}</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">{title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          フィルターを選択して「AI分析を実行」をクリックしてください。
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  在庫データ分析からのアドバイス
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  在庫・売上データとニュース要約をもとに、今週の経営アクション候補を3件生成します。
                </p>
              </div>
              <a
                href="/advice/actions"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                最適アクション候補ページ
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 生成コントロール */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 在庫データ期間 */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">在庫・売上データ期間</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={inventoryPeriodFrom}
                      onChange={(e) => setInventoryPeriodFrom(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">〜</span>
                    <input
                      type="month"
                      value={inventoryPeriodTo}
                      onChange={(e) => setInventoryPeriodTo(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm flex-1"
                    />
                  </div>
                </div>

                {/* ニュース要約フィルター */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">参照するニュース要約</p>
                  <Popover open={summaryFilterOpen} onOpenChange={setSummaryFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between text-left font-normal h-8">
                        <span className={cn("text-sm", selectedSummaryGroupIds.length === 0 && "text-muted-foreground")}>
                          {selectedSummaryGroupIds.length === 0
                            ? "全フィルターを使用"
                            : `${selectedSummaryGroupIds.length}件選択中`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      {newsSummaries.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-2 py-1">
                          この週の要約レポートがありません
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer">
                            <Checkbox
                              checked={selectedSummaryGroupIds.length === 0}
                              onCheckedChange={(checked: boolean | "indeterminate") => {
                                if (checked === true) setSelectedSummaryGroupIds([])
                              }}
                            />
                            <span className="text-sm leading-none text-muted-foreground">全て使用</span>
                          </label>
                          {newsSummaries.map((s) => (
                            <label
                              key={s.queryGroupId}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedSummaryGroupIds.includes(s.queryGroupId)}
                                onCheckedChange={(checked: boolean | "indeterminate") => {
                                  if (checked === true) {
                                    setSelectedSummaryGroupIds((prev) => [...prev, s.queryGroupId])
                                  } else {
                                    setSelectedSummaryGroupIds((prev) => prev.filter((id) => id !== s.queryGroupId))
                                  }
                                }}
                              />
                              <span className="text-sm leading-none">{s.queryName}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleGenerateInventoryActions}
                disabled={isGeneratingActions || !inventoryPeriodFrom || !inventoryPeriodTo}
                className="w-full sm:w-auto"
              >
                {isGeneratingActions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    アクション候補を生成
                  </>
                )}
              </Button>
              {actionError && <p className="text-xs text-destructive">{actionError}</p>}
            </div>

            {/* アクションカード */}
            {inventoryActions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                期間とフィルターを選択して「アクション候補を生成」をクリックしてください。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {inventoryActions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-border/70 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[11px]"
                      >
                        {action.actionType === "procurement" ? "発注・仕入"
                          : action.actionType === "sales_promotion" ? "販促・値引"
                          : action.actionType === "inventory" ? "在庫調整"
                          : action.actionType === "finance" ? "財務・資金"
                          : "カテゴリ戦略"}
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
                    <p className="font-semibold text-foreground text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
                    {action.sources.length > 0 && (
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                        根拠: {action.sources.map((s) => s.evidence).filter(Boolean).join(" / ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen((v) => !v)}
              className={cn(settingsOpen && "bg-muted")}
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              共通設定
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetch}
              disabled={isFetching || queries.length === 0}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", isFetching && "animate-spin")} />
              {isFetching ? "取得中..." : "最新ニュースを取得"}
            </Button>
            {(!isCurrentWeek(weekStart) || flexibleAnalysis) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummaries}
                disabled={isGeneratingSummaries || queries.length === 0}
              >
                {isGeneratingSummaries ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    要約生成中...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-1.5" />
                    要約レポートを生成
                  </>
                )}
              </Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              検索フィルターを追加
            </Button>
          </div>
          {summaryError && (
            <p className="w-full text-xs text-destructive text-right">{summaryError}</p>
          )}
        </div>

        {/* 共通設定パネル */}
        {settingsOpen && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">共通設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">デフォルト除外ソース</p>
                <p className="text-xs text-muted-foreground">
                  「除外するソースを指定」または指定なしのフィルターに自動で適用されます。「含むソースを指定」のフィルターには適用されません。
                </p>
                <div className="flex gap-2">
                  <Input
                    value={defaultSourceInput}
                    onChange={(e) => setDefaultSourceInput(e.target.value)}
                    placeholder="例: nhk.or.jp"
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDefaultExcludedSource())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addDefaultExcludedSource}>
                    追加
                  </Button>
                </div>
                {defaultExcludedSources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {defaultExcludedSources.map((src) => (
                      <Badge key={src} variant="outline" className="gap-1 opacity-80">
                        {src}
                        <button onClick={() => removeDefaultExcludedSource(src)} className="hover:opacity-70">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {settingsError && <p className="text-xs text-destructive">{settingsError}</p>}
              <Button size="sm" onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? "保存中..." : "保存"}
              </Button>
            </CardContent>
          </Card>
        )}

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
            const summary = newsSummaries.find((s) => s.queryGroupId === group.queryGroupId)
            // サマリーがある場合はデフォルトで記事を折りたたむ
            const articlesDefaultCollapsed = !!summary
            const isArticlesExpanded = articlesExpanded[group.queryGroupId] ?? !articlesDefaultCollapsed

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
                  {/* 週次要約レポート */}
                  {summary && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-primary">週次要約レポート</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(summary.generatedAt).toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}生成
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary.content}</p>
                    </div>
                  )}

                  {/* 記事一覧トグル */}
                  {group.articles.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground hover:text-foreground justify-between"
                      onClick={() => toggleArticlesExpanded(group.queryGroupId)}
                    >
                      <span>ニュース記事 ({group.articles.length} 件)</span>
                      {isArticlesExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {group.articles.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      この週のニュースはありません。「最新ニュースを取得」ボタンで取得できます。
                    </p>
                  ) : isArticlesExpanded ? (
                    <>
                      {visibleArticles.map((article) => (
                        <div
                          key={article.id}
                          className={cn(
                            "p-3 rounded-xl border border-border/70 hover:border-primary/60 hover:shadow-sm transition-colors",
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
                  ) : null}
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
