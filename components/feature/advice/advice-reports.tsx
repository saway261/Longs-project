"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, FileText, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/feature/page-header"
import { generateManagementReportAction, getManagementReportsAction } from "@/src/actions/advice-actions"
import type { ManagementReportDTO } from "@/src/actions/advice-actions"
import type { GroupPeriodRanges } from "@/src/types/report"

type ReportLens = {
  id: "balanced" | "cashflow" | "inventory" | "sales"
  label: string
  description: string
}

type ReportDataSource = {
  id: string
  label: string
  pageLabel: string
  group: "finance" | "inventory" | "data" | "advice"
}

const reportLenses: ReportLens[] = [
  { id: "balanced", label: "経営会議向け", description: "売上・粗利・資金・在庫を横断してバランス良く要約" },
  { id: "cashflow", label: "資金繰り重視", description: "キャッシュアウト時期と利益確保を優先して判断" },
  { id: "inventory", label: "在庫最適化重視", description: "回転率・過不足・SKU整理を中心に判断" },
  { id: "sales", label: "営業改善重視", description: "得意先・商品構成・単価改善を中心に判断" },
]

const reportDataSources: ReportDataSource[] = [
  { id: "finance-overview", label: "ファイナンス・サマリー", pageLabel: "ファイナンスフロー / ファイナンス・サマリー", group: "finance" },
  { id: "finance-cashflow", label: "入出金シミュレーション", pageLabel: "ファイナンスフロー / 入出金シミュレーション", group: "finance" },
  { id: "inventory-recommendations", label: "仕入れ提案", pageLabel: "在庫関連データ / 仕入れ提案", group: "inventory" },
  { id: "inventory-insights", label: "在庫データ分析", pageLabel: "在庫関連データ / 在庫データ分析", group: "inventory" },
  { id: "inventory-alerts", label: "在庫アラート", pageLabel: "在庫関連データ / 在庫アラート分析", group: "inventory" },
  { id: "inventory-plan", label: "在庫計画早見表", pageLabel: "在庫関連データ / 在庫計画早見表", group: "inventory" },
  { id: "inventory-customer-matrix", label: "得意先4象限", pageLabel: "在庫関連データ / 得意先4象限", group: "inventory" },
  { id: "inventory-product-matrix", label: "商品4象限", pageLabel: "在庫関連データ / 商品4象限", group: "inventory" },
  { id: "data-hub", label: "データ一覧", pageLabel: "データ / データ一覧", group: "data" },
  { id: "data-registration", label: "データ登録状況", pageLabel: "データ / データ登録", group: "data" },
  { id: "advice-weekly-news", label: "週次ニュース", pageLabel: "AIアドバイス / 週次ニュース", group: "advice" },
  { id: "advice-actions", label: "最適アクション候補", pageLabel: "AIアドバイス / 最適アクション候補", group: "advice" },
]

const defaultSourceIds: string[] = []

function buildDefaultPeriodRanges(): GroupPeriodRanges {
  const now = new Date()
  const to = now.toISOString().slice(0, 7)
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 7)
  const dow = now.getDay()
  const recentMonday = new Date(now)
  recentMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const fourWeeksAgo = new Date(recentMonday)
  fourWeeksAgo.setDate(recentMonday.getDate() - 28)
  return {
    finance: { from, to },
    inventory: { from, to },
    data: { from, to },
    advice: {
      from: fourWeeksAgo.toISOString().slice(0, 10),
      to: recentMonday.toISOString().slice(0, 10),
    },
  }
}

const sourceGroupLabels = {
  finance: "ファイナンスフロー",
  inventory: "在庫関連データ",
  data: "データ",
  advice: "AIアドバイス",
} as const

const timingColors: Record<string, string> = {
  今週中: "bg-red-50 text-red-700 border-red-200",
  今月中: "bg-amber-50 text-amber-700 border-amber-200",
  来月以降: "bg-slate-50 text-slate-600 border-slate-200",
}

export function AIAdviceManagementReport() {
  const [selectedLensId, setSelectedLensId] = useState<ReportLens["id"]>("balanced")
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(defaultSourceIds)
  const [customInstruction, setCustomInstruction] = useState("")
  const [periodRanges, setPeriodRanges] = useState<GroupPeriodRanges>(buildDefaultPeriodRanges)

  const [isGenerating, setIsGenerating] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportHistory, setReportHistory] = useState<ManagementReportDTO[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const reportData = reportHistory.find((r) => r.id === selectedReportId) ?? null

  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true)
      try {
        const result = await getManagementReportsAction()
        if (result.success && result.data.length > 0) {
          const done = result.data.filter((r) => r.status === "done")
          setReportHistory(done)
          setSelectedReportId(done[0]?.id ?? null)
        }
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadHistory()
  }, [])

  const groupedSources = useMemo(
    () => ({
      finance: reportDataSources.filter((s) => s.group === "finance"),
      inventory: reportDataSources.filter((s) => s.group === "inventory"),
      data: reportDataSources.filter((s) => s.group === "data"),
      advice: reportDataSources.filter((s) => s.group === "advice"),
    }),
    [],
  )

  const reportLens = reportLenses.find((l) => l.id === (reportData?.lensId ?? selectedLensId)) ?? reportLenses[0]

  const selectedIndex = reportHistory.findIndex((r) => r.id === selectedReportId)

  async function handleGenerate() {
    setIsGenerating(true)
    setReportError(null)
    try {
      const result = await generateManagementReportAction({
        lensId: selectedLensId,
        sourceIds: selectedSourceIds,
        customInstruction,
        periodRanges,
      })
      if (result.success) {
        setReportHistory((prev) => [result.data, ...prev])
        setSelectedReportId(result.data.id)
      } else {
        setReportError(result.error)
      }
    } catch {
      setReportError("レポートの生成中にエラーが発生しました。")
    } finally {
      setIsGenerating(false)
    }
  }

  function updatePeriod(group: keyof GroupPeriodRanges, field: "from" | "to", value: string) {
    setPeriodRanges((prev) => ({
      ...prev,
      [group]: { ...(prev[group] ?? {}), [field]: value },
    }))
  }

  const selectedSourcesInGroup = (group: keyof typeof groupedSources) =>
    selectedSourceIds.some((id) => groupedSources[group].some((s) => s.id === id))

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="AI Advice"
        title="AIレポート作成"
        description="考慮したいデータを選び、補足条件を加えて、AIに経営判断レポートを作成させます。"
        icon={FileText}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">レポート条件の設定</CardTitle>
          <p className="text-sm text-muted-foreground">
            まずレポートの視点を選び、その上で考慮したいデータをボタンで追加してください。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. レポートの視点 */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">1. レポートの視点</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {reportLenses.map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setSelectedLensId(lens.id)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all",
                    selectedLensId === lens.id
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border/70 hover:border-primary/40",
                  )}
                >
                  <p className="font-semibold text-foreground">{lens.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{lens.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. データソース選択 + 期間 */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">2. レポートに使うデータを選択</p>
                <p className="text-xs text-muted-foreground mt-1">
                  複数選択できます。選んだデータだけを根拠にレポートを組み立てます。
                </p>
              </div>
              <Badge variant="outline">選択中 {selectedSourceIds.length}件</Badge>
            </div>

            <div className="space-y-4">
              {(Object.entries(groupedSources) as Array<[keyof typeof groupedSources, ReportDataSource[]]>).map(
                ([groupKey, items]) => (
                  <div key={groupKey} className="rounded-2xl border border-border/70 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">{sourceGroupLabels[groupKey]}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => {
                        const isSelected = selectedSourceIds.includes(item.id)
                        return (
                          <Button
                            key={item.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              isSelected
                                ? "bg-primary text-white hover:bg-primary/80"
                                : "bg-transparent hover:border-primary/50",
                            )}
                            onClick={() =>
                              setSelectedSourceIds((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id],
                              )
                            }
                          >
                            {item.label}
                          </Button>
                        )
                      })}
                    </div>

                    {selectedSourcesInGroup(groupKey) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">対象期間:</p>
                        {groupKey === "advice" ? (
                          <>
                            <input
                              type="date"
                              value={periodRanges.advice?.from ?? ""}
                              onChange={(e) => updatePeriod("advice", "from", e.target.value)}
                              className="text-xs border border-border/70 rounded-lg px-2 py-1 bg-background"
                            />
                            <span className="text-xs text-muted-foreground">〜</span>
                            <input
                              type="date"
                              value={periodRanges.advice?.to ?? ""}
                              onChange={(e) => updatePeriod("advice", "to", e.target.value)}
                              className="text-xs border border-border/70 rounded-lg px-2 py-1 bg-background"
                            />
                          </>
                        ) : (
                          <>
                            <input
                              type="month"
                              value={periodRanges[groupKey]?.from ?? ""}
                              onChange={(e) => updatePeriod(groupKey, "from", e.target.value)}
                              className="text-xs border border-border/70 rounded-lg px-2 py-1 bg-background"
                            />
                            <span className="text-xs text-muted-foreground">〜</span>
                            <input
                              type="month"
                              value={periodRanges[groupKey]?.to ?? ""}
                              onChange={(e) => updatePeriod(groupKey, "to", e.target.value)}
                              className="text-xs border border-border/70 rounded-lg px-2 py-1 bg-background"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* 3. 追加指示 */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">3. AIに追加で考慮させたい条件</p>
            <Textarea
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="例: 今月はキャッシュを優先したい。値引き判断は慎重に。"
              className="min-h-28"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              推奨: ファイナンス + 在庫関連データ + AIアドバイスを横断選択すると判断精度が上がります。
            </p>
            <Button
              className="bg-primary hover:bg-primary/80 text-white"
              onClick={handleGenerate}
              disabled={isGenerating || selectedSourceIds.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  AIレポートを作成
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* レポート表示 */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-linear-to-r from-primary/6 via-white to-cyan-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">AI経営判断レポート</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {reportData
                  ? `レポート視点: ${reportLens.label} / 生成日時: ${reportData.generatedAt ? new Date(reportData.generatedAt).toLocaleString("ja-JP") : "-"}`
                  : isLoadingHistory
                    ? "過去のレポートを読み込んでいます..."
                    : "レポートを生成すると結果がここに表示されます"}
              </p>
            </div>
            {reportData && (
              <div className="flex flex-wrap gap-2">
                {reportData.sourceIds.map((id) => {
                  const src = reportDataSources.find((s) => s.id === id)
                  return src ? <Badge key={id} variant="outline">{src.label}</Badge> : null
                })}
              </div>
            )}
          </div>

          {reportHistory.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={selectedIndex <= 0}
                onClick={() => setSelectedReportId(reportHistory[selectedIndex - 1]?.id ?? null)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {reportHistory.map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className={cn(
                      "shrink-0 rounded-lg border px-2.5 py-1 text-xs transition-all whitespace-nowrap",
                      r.id === selectedReportId
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {i === 0 && <span className="mr-1 text-primary">最新</span>}
                    {r.generatedAt
                      ? new Date(r.generatedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : new Date(r.createdAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    &nbsp;{reportLenses.find((l) => l.id === r.lensId)?.label ?? r.lensId}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={selectedIndex >= reportHistory.length - 1}
                onClick={() => setSelectedReportId(reportHistory[selectedIndex + 1]?.id ?? null)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {selectedIndex + 1} / {reportHistory.length}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">データを収集してAIがレポートを生成しています...</p>
              <p className="text-xs">データ量によっては1〜2分かかる場合があります</p>
            </div>
          )}

          {!isGenerating && reportError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">レポートの生成に失敗しました</p>
                <p className="text-sm text-red-600 mt-1">{reportError}</p>
              </div>
            </div>
          )}

          {!isGenerating && !reportError && !reportData && isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">過去のレポートを読み込んでいます...</p>
            </div>
          )}

          {!isGenerating && !reportError && !reportData && !isLoadingHistory && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">条件を設定して「AIレポートを作成」を押してください</p>
            </div>
          )}

          {!isGenerating && reportData?.status === "done" && (
            <div className="space-y-6">
              {reportData.executiveSummary && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">エグゼクティブサマリー</p>
                  <p className="text-sm leading-7 text-foreground/90">{reportData.executiveSummary}</p>
                </div>
              )}

              {reportData.decisions && reportData.decisions.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {reportData.decisions.map((decision, i) => (
                    <div key={i} className="rounded-2xl border border-border/70 p-4">
                      <p className="text-sm font-semibold text-foreground">{decision.title}</p>
                      <p className="mt-2 text-sm text-foreground/90">{decision.body}</p>
                      <p className="mt-3 text-xs text-muted-foreground">根拠: {decision.source}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6">
                {reportData.actions && reportData.actions.length > 0 && (
                  <div className="rounded-2xl border border-border/70 p-5">
                    <p className="text-sm font-semibold text-foreground">優先アクション</p>
                    <div className="mt-4 space-y-3">
                      {reportData.actions.map((action, i) => (
                        <div key={i} className="flex gap-3 rounded-xl border border-border/60 p-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center shrink-0">
                            {action.priority}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground/90">{action.body}</p>
                            <span
                              className={cn(
                                "mt-2 inline-block text-xs px-2 py-0.5 rounded-full border",
                                timingColors[action.timing] ?? "bg-slate-50 text-slate-600 border-slate-200",
                              )}
                            >
                              {action.timing}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.riskNotes && reportData.riskNotes.length > 0 && (
                  <div className="rounded-2xl border border-border/70 p-5">
                    <p className="text-sm font-semibold text-foreground">レポート作成時の前提</p>
                    <div className="mt-4 space-y-3">
                      {reportData.riskNotes.map((note, i) => (
                        <div key={i} className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/80">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
