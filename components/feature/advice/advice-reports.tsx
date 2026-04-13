"use client"

import {useMemo, useState } from "react"
import {
  Bot,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/feature/page-header"

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
  insight: string
  decision: string
  action: string
}

const reportLenses: ReportLens[] = [
  { id: "balanced", label: "経営会議向け", description: "売上・粗利・資金・在庫を横断してバランス良く要約" },
  { id: "cashflow", label: "資金繰り重視", description: "キャッシュアウト時期と利益確保を優先して判断" },
  { id: "inventory", label: "在庫最適化重視", description: "回転率・過不足・SKU整理を中心に判断" },
  { id: "sales", label: "営業改善重視", description: "得意先・商品構成・単価改善を中心に判断" },
]

const reportDataSources: ReportDataSource[] = [
  {
    id: "finance-overview",
    label: "キャッシュフロー",
    pageLabel: "ファイナンスフロー / ファイナンス・サマリー",
    group: "finance",
    insight: "支払集中月と資金余力のズレを把握できるため、投資タイミングの前倒し・後ろ倒し判断に有効。",
    decision: "資金余力が薄い期間は追加仕入れよりも回収優先で運転資金を確保する。",
    action: "翌月の支払集中期間に合わせて、販促と回収計画を前倒しで組み直す。",
  },
  {
    id: "finance-cashflow",
    label: "入出金シミュレーション",
    pageLabel: "ファイナンスフロー / 入出金シミュレーション",
    group: "finance",
    insight: "支払日・固定費・仕入支払の山谷が見えるため、資金ショート回避に直結する。",
    decision: "支払が重なる週は発注条件の分散交渉を優先する。",
    action: "支払集中週を避けて追加発注日程と入金回収施策を再配置する。",
  },
  {
    id: "inventory-recommendations",
    label: "仕入れ提案",
    pageLabel: "在庫関連データ / 仕入れ提案",
    group: "inventory",
    insight: "需要予測と回転数を起点に、追加仕入れと抑制対象を切り分けられる。",
    decision: "高需要カテゴリへ仕入れを寄せ、鈍化カテゴリは追加投資を抑える。",
    action: "需要上昇が続くSKUだけを抽出し、今週の仕入れ枠を再配分する。",
  },
  {
    id: "inventory-insights",
    label: "在庫データ分析",
    pageLabel: "在庫関連データ / 在庫データ分析",
    group: "inventory",
    insight: "カテゴリ構成、回転率、需要予測から在庫効率の偏りを把握できる。",
    decision: "回転率が弱いカテゴリは売り切り施策を優先し、強いカテゴリは欠品回避を重視する。",
    action: "アウターとボトムスの投資配分を見直し、回転率目標と紐づける。",
  },
  {
    id: "inventory-alerts",
    label: "在庫アラート",
    pageLabel: "在庫関連データ / 在庫アラート分析",
    group: "inventory",
    insight: "在庫不足・過剰・廃品リスクをSKU単位で把握でき、即時対応の優先順位が立つ。",
    decision: "不足SKUは即補充、過剰SKUは値引きか販路移管で早期消化する。",
    action: "在庫不足SKUの補充判断と、過剰在庫SKUの値引き指示を同時に出す。",
  },
  {
    id: "inventory-plan",
    label: "在庫計画早見表",
    pageLabel: "在庫関連データ / 在庫計画早見表",
    group: "inventory",
    insight: "目標粗利率と出荷粗利を見比べ、投資対効果の低い計画を把握できる。",
    decision: "粗利率目標に届かない計画は数量より単価・構成の見直しを優先する。",
    action: "粗利率が目標未達のカテゴリだけ、発注量と販売価格の前提を再設計する。",
  },
  {
    id: "inventory-customer-matrix",
    label: "得意先4象限",
    pageLabel: "在庫関連データ / 得意先4象限",
    group: "inventory",
    insight: "売上と粗利率の両面から、重点深耕先と条件見直し先を仕分けできる。",
    decision: "優良得意先は関係強化、薄利多売先は条件交渉を進める。",
    action: "優良店舗への重点提案と、課題店舗への条件見直し面談を並行実施する。",
  },
  {
    id: "inventory-product-matrix",
    label: "商品4象限",
    pageLabel: "在庫関連データ / 商品4象限",
    group: "inventory",
    insight: "優良商品と課題商品を分けて、SKU投資と縮小の意思決定ができる。",
    decision: "高収益商品は販路拡大し、課題商品は縮小または終売判断を進める。",
    action: "主力SKUの増産候補と、整理対象SKUの棚卸し候補を同時に抽出する。",
  },
  {
    id: "data-hub",
    label: "データ一覧",
    pageLabel: "データ / データ一覧",
    group: "data",
    insight: "売上・仕入・請求の揃い具合を見て、判断の前提となるデータ品質を確認できる。",
    decision: "データ欠損がある領域は断定判断を避け、追加確認を前提にする。",
    action: "不足データの洗い出しと、来週のレポート前までの補完依頼を行う。",
  },
  {
    id: "data-registration",
    label: "データ登録状況",
    pageLabel: "データ / データ登録",
    group: "data",
    insight: "最新アップロード状況から、レポートが最新実績に基づくかを判断できる。",
    decision: "更新が遅れているデータは速報値扱いにし、最終判断は保留する。",
    action: "売上・請求・年度粗利データの更新締切を明確にする。",
  },
  {
    id: "advice-weekly-news",
    label: "週次ニュース",
    pageLabel: "AIアドバイス / 週次ニュース",
    group: "advice",
    insight: "天候やトレンド変化を短期の販売施策へ反映できる。",
    decision: "週次トレンドが強いカテゴリは追加販促と在庫確保を優先する。",
    action: "今週の販促テーマを天候・需要の強いカテゴリへ寄せる。",
  },
  {
    id: "advice-business-news",
    label: "経営判断ニュース",
    pageLabel: "AIアドバイス / 経営判断ニュース",
    group: "advice",
    insight: "為替・原材料・物流・競合の変化を見て、中期の原価と価格戦略を見直せる。",
    decision: "原価上昇リスクが高い商材は、先回りで価格・仕入条件を調整する。",
    action: "値上げ余地のある重点商材を先に選定し、価格改定シミュレーションを行う。",
  },
  {
    id: "advice-actions",
    label: "最適アクション候補",
    pageLabel: "AIアドバイス / 最適アクション候補",
    group: "advice",
    insight: "ニュースを起点とした実行候補が整理されており、優先順位づけに使える。",
    decision: "今月着手すべき打ち手を3件までに絞り、実行速度を優先する。",
    action: "即時対応・今月対応・次月対応に分けて担当をアサインする。",
  },
]

const defaultReportSourceIds = [
  "finance-overview",
  "inventory-insights",
  "inventory-alerts",
  "inventory-customer-matrix",
  "advice-business-news",
  "advice-actions",
]

export function AIAdviceManagementReport() {
  const [selectedLensId, setSelectedLensId] = useState<ReportLens["id"]>("balanced")
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(defaultReportSourceIds)
  const [customInstruction, setCustomInstruction] = useState(
    "来週の経営会議で使う前提で、優先順位と理由が分かるようにまとめてください。",
  )
  const [generatedReport, setGeneratedReport] = useState(() => ({
    lensId: "balanced" as ReportLens["id"],
    selectedSourceIds: defaultReportSourceIds,
    customInstruction: "来週の経営会議で使う前提で、優先順位と理由が分かるようにまとめてください。",
    generatedAt: new Date().toLocaleString("ja-JP"),
  }))

  const groupedSources = useMemo(
    () => ({
      finance: reportDataSources.filter((item) => item.group === "finance"),
      inventory: reportDataSources.filter((item) => item.group === "inventory"),
      data: reportDataSources.filter((item) => item.group === "data"),
      advice: reportDataSources.filter((item) => item.group === "advice"),
    }),
    [],
  )

  const reportSnapshotSources = useMemo(
    () => reportDataSources.filter((item) => generatedReport.selectedSourceIds.includes(item.id)),
    [generatedReport],
  )

  const reportLens = reportLenses.find((item) => item.id === generatedReport.lensId) ?? reportLenses[0]

  const reportSummary = useMemo(() => {
    const sources = reportSnapshotSources
    const financeSelected = sources.some((item) => item.group === "finance")
    const inventorySelected = sources.some((item) => item.group === "inventory")
    const dataSelected = sources.some((item) => item.group === "data")
    const adviceSelected = sources.some((item) => item.group === "advice")

    const executiveSummary = [
      financeSelected
        ? "資金面では、支払集中時期と投資判断を連動させ、キャッシュを先に守る運営が必要です。"
        : "資金データの選択が薄いため、追加投資判断は保守的に扱うべきです。",
      inventorySelected
        ? "在庫面では、回転率・アラート・4象限マトリクスをもとに、主力強化と整理対象の線引きを進めるべきです。"
        : "在庫データの選択が限定的なため、SKUや得意先の整理は補足確認が前提です。",
      adviceSelected
        ? "外部環境では、ニュース起点の原価・価格変動を踏まえ、短期の販促と中期の価格政策を同時に見直す必要があります。"
        : "外部環境要因の反映が薄いため、価格改定や販促判断は市場変化も補完して見るべきです。",
    ].join("")

    const decisions = sources.slice(0, 4).map((item, index) => ({
      title: `判断 ${index + 1}`,
      body: item.decision,
      source: item.pageLabel,
    }))

    const actions = sources.slice(0, 5).map((item) => item.action)

    const riskNotes = [
      dataSelected
        ? "データ更新状況も考慮済みのため、速報値と確定値の差分管理を前提に運用してください。"
        : "データ更新状況を未選択のため、レポート数値は最新反映 여부を別途確認してください。",
      generatedReport.customInstruction
        ? `追加条件: ${generatedReport.customInstruction}`
        : "追加条件は指定されていません。",
    ]

    return { executiveSummary, decisions, actions, riskNotes }
  }, [generatedReport, reportSnapshotSources])

  const sourceGroupLabels = {
    finance: "ファイナンスフロー",
    inventory: "在庫関連データ",
    data: "データ",
    advice: "AIアドバイス",
  } as const

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
                      ? "border-[#345fe1] bg-[#345fe1]/8 shadow-sm"
                      : "border-border/70 hover:border-[#345fe1]/40",
                  )}
                >
                  <p className="font-semibold text-foreground">{lens.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{lens.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">2. レポートに使うデータを選択</p>
                <p className="text-xs text-muted-foreground mt-1">複数選択できます。選んだデータだけを根拠にレポートを組み立てます。</p>
              </div>
              <Badge variant="outline">選択中 {selectedSourceIds.length}件</Badge>
            </div>

            <div className="space-y-4">
              {(Object.entries(groupedSources) as Array<[keyof typeof groupedSources, ReportDataSource[]]>).map(([groupKey, items]) => (
                <div key={groupKey} className="rounded-2xl border border-border/70 p-4">
                  <p className="text-sm font-semibold text-foreground">{sourceGroupLabels[groupKey]}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                              ? "bg-[#345fe1] text-white hover:bg-[#2a4bb3]"
                              : "bg-transparent hover:border-[#345fe1]/50",
                          )}
                          onClick={() =>
                            setSelectedSourceIds((prev) =>
                              prev.includes(item.id) ? prev.filter((sourceId) => sourceId !== item.id) : [...prev, item.id],
                            )
                          }
                        >
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">3. AIに追加で考慮させたい条件</p>
            <Textarea
              value={customInstruction}
              onChange={(event) => setCustomInstruction(event.target.value)}
              placeholder="例: 今月はキャッシュを優先したい。値引き判断は慎重に。関西チェーン向けの提案も盛り込んでほしい。"
              className="min-h-28"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">推奨: ファイナンス + 在庫関連データ + AIアドバイスを横断選択すると判断精度が上がります。</p>
            <Button
              className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
              onClick={() =>
                setGeneratedReport({
                  lensId: selectedLensId,
                  selectedSourceIds,
                  customInstruction,
                  generatedAt: new Date().toLocaleString("ja-JP"),
                })
              }
            >
              <Bot className="w-4 h-4 mr-2" />
              AIレポートを作成
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-linear-to-r from-[#345fe1]/6 via-white to-cyan-50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">AI経営判断レポート</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                レポート視点: {reportLens.label} / 生成時刻: {generatedReport.generatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reportSnapshotSources.map((item) => (
                <Badge key={item.id} variant="outline">
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="rounded-2xl border border-[#345fe1]/20 bg-[#345fe1]/5 p-5">
            <p className="text-sm font-semibold text-foreground mb-2">エグゼクティブサマリー</p>
            <p className="text-sm leading-7 text-foreground/90">{reportSummary.executiveSummary}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reportSummary.decisions.map((decision) => (
              <div key={decision.title} className="rounded-2xl border border-border/70 p-4">
                <p className="text-sm font-semibold text-foreground">{decision.title}</p>
                <p className="mt-2 text-sm text-foreground/90">{decision.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">根拠: {decision.source}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-6">
            <div className="rounded-2xl border border-border/70 p-5">
              <p className="text-sm font-semibold text-foreground">優先アクション</p>
              <div className="mt-4 space-y-3">
                {reportSummary.actions.map((action, index) => (
                  <div key={`${action}-${index}`} className="flex gap-3 rounded-xl border border-border/60 p-3">
                    <div className="w-6 h-6 rounded-full bg-[#345fe1] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground/90">{action}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 p-5">
              <p className="text-sm font-semibold text-foreground">レポート作成時の前提</p>
              <div className="mt-4 space-y-3">
                {reportSummary.riskNotes.map((note, index) => (
                  <div key={`${note}-${index}`} className="rounded-xl bg-muted/40 p-3 text-sm text-foreground/80">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 p-5">
            <p className="text-sm font-semibold text-foreground">参照データと判断への反映</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportSnapshotSources.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <Badge variant="outline">{item.pageLabel}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{item.insight}</p>
                  <p className="mt-3 text-sm text-foreground/90">判断反映: {item.decision}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}