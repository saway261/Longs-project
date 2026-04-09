"use client"

import { type ReactNode, useMemo, useState } from "react"
import {
  Shirt,
  Building2,
  Target,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

type CustomerMatrixCustomer = {
  name: string
  sales: number
  grossMargin: number
  grossProfit: number
  manager: string
}

type ProductMatrixProduct = {
  name: string
  sales: number
  grossMargin: number
  grossProfit: number
  category: string
  brand: string
}

type QuadrantKey = "highSalesHighMargin" | "highSalesLowMargin" | "lowSalesHighMargin" | "lowSalesLowMargin"

type QuadrantDefinition = {
  key: QuadrantKey
  title: string
  axisLabel: string
  description: string
  badgeClassName: string
  borderClassName: string
  dotColor: string
}

type MatrixPoint<T extends { sales: number; grossMargin: number }> = T & { quadrantKey: QuadrantKey; color: string }

const createCustomer = (name: string, sales: number, grossMargin: number, manager: string): CustomerMatrixCustomer => ({
  name,
  sales,
  grossMargin,
  grossProfit: Math.round((sales * grossMargin) / 100),
  manager,
})

const highSalesHighMarginCustomers = [
  createCustomer("銀座百貨店", 6480000, 44.2, "山本"),
  createCustomer("南青山セレクト", 5920000, 41.8, "佐藤"),
  createCustomer("表参道コンセプト", 5610000, 39.6, "田中"),
  createCustomer("阪神ラグジュアリー", 5340000, 43.5, "高橋"),
  createCustomer("名古屋プレミアム", 5080000, 38.9, "森"),
  createCustomer("京都百貨街", 4870000, 46.1, "伊藤"),
  createCustomer("横浜駅前館", 4730000, 37.8, "吉田"),
  createCustomer("札幌フラッグシップ", 4520000, 42.7, "小林"),
  createCustomer("博多メゾン", 4380000, 40.9, "中村"),
  createCustomer("神戸プレイス", 4210000, 47.4, "加藤"),
  createCustomer("大宮シティ館", 4090000, 36.8, "藤井"),
]

const highSalesLowMarginCustomers = [
  createCustomer("関西チェーン", 6240000, 23.4, "高橋"),
  createCustomer("ECモール本店", 6010000, 21.2, "森"),
  createCustomer("都心駅ビル", 5780000, 27.8, "田中"),
  createCustomer("郊外量販店A", 5560000, 24.7, "清水"),
  createCustomer("ファミリーモール東", 5370000, 19.8, "佐々木"),
  createCustomer("アウトレット首都圏", 5190000, 26.3, "松本"),
  createCustomer("ロードサイド北", 4970000, 18.5, "石井"),
  createCustomer("ショッピングパーク西", 4830000, 28.9, "岡田"),
  createCustomer("広域チェーン中部", 4620000, 22.6, "林"),
  createCustomer("大型量販モール", 4410000, 25.9, "近藤"),
  createCustomer("駅前ディスカウント", 4190000, 29.4, "阿部"),
]

const lowSalesHighMarginCustomers = [
  createCustomer("北陸専門店", 2890000, 39.6, "伊藤"),
  createCustomer("軽井沢ブティック", 2510000, 46.2, "吉田"),
  createCustomer("九州ギャラリー", 2380000, 36.8, "小林"),
  createCustomer("地方編集店A", 2240000, 41.3, "中村"),
  createCustomer("デザイナーズ神楽坂", 2110000, 48.1, "加藤"),
  createCustomer("温泉街セレクト", 1960000, 37.4, "藤井"),
  createCustomer("空港ギフト店", 1840000, 35.9, "清水"),
  createCustomer("歴史街路面店", 1710000, 44.7, "佐々木"),
  createCustomer("リゾートホテル売店", 1590000, 38.8, "松本"),
  createCustomer("美術館ミュージアム店", 1380000, 49.2, "石井"),
  createCustomer("離島セレクト", 1120000, 42.6, "岡田"),
]

const lowSalesLowMarginCustomers = [
  createCustomer("アウトレット西", 2760000, 18.9, "加藤"),
  createCustomer("地方百貨店", 2640000, 28.5, "藤井"),
  createCustomer("商店街量販店", 2480000, 22.4, "清水"),
  createCustomer("ロードサイド南", 2310000, 24.1, "佐々木"),
  createCustomer("地域スーパー衣料館", 2140000, 17.6, "松本"),
  createCustomer("イベント催事店", 1930000, 29.1, "石井"),
  createCustomer("観光地土産量販", 1740000, 16.2, "岡田"),
  createCustomer("地方GMS館", 1520000, 21.9, "林"),
  createCustomer("短期ポップアップ群", 1280000, 14.8, "近藤"),
  createCustomer("倉庫併設店舗", 970000, 19.5, "阿部"),
  createCustomer("旧来取引先A", 760000, 13.8, "木村"),
]

const customerMatrixData: CustomerMatrixCustomer[] = [
  ...highSalesHighMarginCustomers,
  ...highSalesLowMarginCustomers,
  ...lowSalesHighMarginCustomers,
  ...lowSalesLowMarginCustomers,
]

const quadrantDefinitions: QuadrantDefinition[] = [
  {
    key: "highSalesHighMargin",
    title: "優良店舗",
    axisLabel: "売上 高 × 粗利 高",
    description: "現状の主力であり、関係強化や手厚いフォローが必要な店舗。",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    borderClassName: "border-emerald-200 bg-emerald-50/80",
    dotColor: "#059669",
  },
  {
    key: "highSalesLowMargin",
    title: "薄利多売・牽引店舗",
    axisLabel: "売上 高 × 粗利 低",
    description:
      "ボリュームは稼いでくれるが利益率が悪い。値引き販売が常態化していないか、商品構成を見直せないか交渉の余地あり。",
    badgeClassName: "bg-amber-100 text-amber-700",
    borderClassName: "border-amber-200 bg-amber-50/80",
    dotColor: "#d97706",
  },
  {
    key: "lowSalesHighMargin",
    title: "高収益・ニッチ店舗",
    axisLabel: "売上 低 × 粗利 高",
    description:
      "売上規模は小さいが利益貢献度が高い。高単価商材が売れている可能性があるため、成功事例を他店に横展開できないか探る。",
    badgeClassName: "bg-sky-100 text-sky-700",
    borderClassName: "border-sky-200 bg-sky-50/80",
    dotColor: "#0284c7",
  },
  {
    key: "lowSalesLowMargin",
    title: "課題店舗",
    axisLabel: "売上 低 × 粗利 低",
    description:
      "取引コスト（営業工数や物流費）に見合っていない可能性があるため、テコ入れや取引条件の見直しが必要。",
    badgeClassName: "bg-rose-100 text-rose-700",
    borderClassName: "border-rose-200 bg-rose-50/80",
    dotColor: "#e11d48",
  },
]

const createProduct = (
  name: string,
  sales: number,
  grossMargin: number,
  category: string,
  brand: string,
): ProductMatrixProduct => ({
  name,
  sales,
  grossMargin,
  grossProfit: Math.round((sales * grossMargin) / 100),
  category,
  brand,
})

const productMatrixData: ProductMatrixProduct[] = [
  createProduct("プレミアムウールコート", 6840000, 45.6, "アウター", "LuxeCoat"),
  createProduct("シグネチャーダウン", 6420000, 42.8, "アウター", "WinterMode"),
  createProduct("カシミヤハイネックニット", 5980000, 40.4, "トップス", "KnitLab"),
  createProduct("上質テーパードパンツ", 5710000, 38.7, "ボトムス", "UrbanLine"),
  createProduct("レザーミニバッグ", 5480000, 47.1, "バッグ", "AtelierForm"),
  createProduct("シルクブレンドジャケット", 5230000, 39.5, "アウター", "MaisonEdge"),
  createProduct("センタープレスワイドパンツ", 4970000, 41.2, "ボトムス", "UrbanLine"),
  createProduct("ラムレザーブルゾン", 4810000, 43.9, "アウター", "BlackLabel"),
  createProduct("プレミアムセットアップ", 4660000, 37.8, "セットアップ", "ModernFrame"),
  createProduct("カシミヤストール定番", 4520000, 49.3, "アクセサリー", "SoftThread"),
  createProduct("撥水ステンカラーコート", 4380000, 36.6, "アウター", "MetroWear"),
  createProduct("ベーシックTシャツ3枚組", 6920000, 18.4, "トップス", "BasicWear"),
  createProduct("デイリーロゴスウェット", 6480000, 24.2, "トップス", "StreetCore"),
  createProduct("定番デニムパンツ", 6210000, 27.6, "ボトムス", "DenimCo"),
  createProduct("軽量ナイロンパーカ", 5870000, 22.3, "アウター", "RunStudio"),
  createProduct("ノベルティ付きトート", 5640000, 16.9, "バッグ", "PromoLine"),
  createProduct("量販向けシャツセット", 5420000, 21.5, "トップス", "ValueFit"),
  createProduct("カジュアルソックス5足組", 5190000, 19.4, "レッグウェア", "DailyFit"),
  createProduct("シーズンセールニット", 5030000, 28.1, "トップス", "KnitLab"),
  createProduct("アウトレット向けフーディ", 4870000, 23.6, "トップス", "StreetCore"),
  createProduct("定番キャンバススニーカー", 4620000, 26.8, "シューズ", "StepForward"),
  createProduct("パックインナーシリーズ", 4410000, 20.7, "インナー", "BasicWear"),
  createProduct("限定カシミヤベスト", 2760000, 46.8, "トップス", "KnitLab"),
  createProduct("職人仕立てレザーベルト", 2540000, 43.7, "アクセサリー", "ClassicLeather"),
  createProduct("国産シルクスカーフ", 2390000, 51.2, "アクセサリー", "SoftThread"),
  createProduct("プレミアムリネンシャツ", 2240000, 38.9, "トップス", "UrbanLine"),
  createProduct("手染めデニムジャケット", 2110000, 44.6, "アウター", "DenimCo"),
  createProduct("和紙混カーディガン", 1980000, 41.4, "トップス", "MaisonEdge"),
  createProduct("限定レザーサンダル", 1860000, 39.8, "シューズ", "StepForward"),
  createProduct("ハンドメイドミニポーチ", 1720000, 48.3, "バッグ", "AtelierForm"),
  createProduct("ニッチ柄プリーツスカート", 1580000, 37.6, "ボトムス", "ModernFrame"),
  createProduct("高単価セットアップベスト", 1430000, 45.1, "セットアップ", "LuxeCoat"),
  createProduct("ミュージアム限定Tシャツ", 1180000, 42.4, "トップス", "ArchiveLab"),
  createProduct("型落ちプリントT", 2840000, 15.2, "トップス", "StreetCore"),
  createProduct("旧モデル中綿ベスト", 2630000, 19.6, "アウター", "WinterMode"),
  createProduct("在庫処分カーゴパンツ", 2410000, 22.1, "ボトムス", "UrbanLine"),
  createProduct("催事用ロゴキャップ", 2190000, 17.4, "アクセサリー", "PromoLine"),
  createProduct("セール向け薄手ニット", 2010000, 24.8, "トップス", "KnitLab"),
  createProduct("値下げ定番スニーカー", 1840000, 18.9, "シューズ", "StepForward"),
  createProduct("過年度チェックシャツ", 1670000, 21.7, "トップス", "BasicWear"),
  createProduct("アウトレット雑貨セット", 1490000, 16.1, "アクセサリー", "DailyFit"),
  createProduct("短期企画プリントパーカ", 1260000, 13.9, "トップス", "StreetCore"),
  createProduct("旧仕様キャンバストート", 940000, 19.2, "バッグ", "PromoLine"),
]

const productQuadrantDefinitions: QuadrantDefinition[] = [
  {
    key: "highSalesHighMargin",
    title: "優良商品",
    axisLabel: "売上 高 × 粗利 高",
    description: "現状の主力商品。欠品回避と販促強化で、売上と利益の両方を取りにいく対象です。",
    badgeClassName: "bg-emerald-100 text-emerald-700",
    borderClassName: "border-emerald-200 bg-emerald-50/80",
    dotColor: "#059669",
  },
  {
    key: "highSalesLowMargin",
    title: "薄利多売・牽引商品",
    axisLabel: "売上 高 × 粗利 低",
    description: "販売数量は大きい一方で利益率が低い商品。値引き依存や原価設定の見直し余地があります。",
    badgeClassName: "bg-amber-100 text-amber-700",
    borderClassName: "border-amber-200 bg-amber-50/80",
    dotColor: "#d97706",
  },
  {
    key: "lowSalesHighMargin",
    title: "高収益・ニッチ商品",
    axisLabel: "売上 低 × 粗利 高",
    description: "売上規模は小さいが利益貢献度が高い商品。販路拡大や類似商品の横展開候補です。",
    badgeClassName: "bg-sky-100 text-sky-700",
    borderClassName: "border-sky-200 bg-sky-50/80",
    dotColor: "#0284c7",
  },
  {
    key: "lowSalesLowMargin",
    title: "課題商品",
    axisLabel: "売上 低 × 粗利 低",
    description: "売上も利益も弱い商品。継続採用の是非、SKU圧縮、価格条件の見直しが必要です。",
    badgeClassName: "bg-rose-100 text-rose-700",
    borderClassName: "border-rose-200 bg-rose-50/80",
    dotColor: "#e11d48",
  },
]

function buildQuadrantMatrix<T extends { sales: number; grossMargin: number }>(
  data: T[],
  definitions: QuadrantDefinition[],
) {
  const averageSales = data.reduce((sum, item) => sum + item.sales, 0) / data.length
  const averageGrossMargin = data.reduce((sum, item) => sum + item.grossMargin, 0) / data.length

  const quadrants = definitions.map((definition) => ({
    ...definition,
    customers: [] as MatrixPoint<T>[],
  }))

  const points = data.map((item) => {
    const quadrantKey =
      item.sales >= averageSales
        ? item.grossMargin >= averageGrossMargin
          ? "highSalesHighMargin"
          : "highSalesLowMargin"
        : item.grossMargin >= averageGrossMargin
          ? "lowSalesHighMargin"
          : "lowSalesLowMargin"

    const definition = definitions.find((current) => current.key === quadrantKey)!
    const point: MatrixPoint<T> = { ...item, quadrantKey, color: definition.dotColor }
    quadrants.find((current) => current.key === quadrantKey)?.customers.push(point)
    return point
  })

  return {
    averageSales,
    averageGrossMargin,
    points,
    quadrants,
    xMax: Math.max(...points.map((point) => point.sales)) * 1.15,
    yMax: Math.max(...points.map((point) => point.grossMargin)) * 1.15,
  }
}

const formatCurrency = (value: number) =>
  `¥${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(value)}`

const formatCompactCurrency = (value: number) =>
  `¥${new Intl.NumberFormat("ja-JP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`

const formatPercent = (value: number) => `${value.toFixed(1)}%`

type MatrixTableColumn<T extends { sales: number; grossMargin: number }> = {
  label: string
  render: (item: MatrixPoint<T>) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

type QuadrantMatrixPageProps<T extends { name: string; sales: number; grossMargin: number; grossProfit: number }> = {
  eyebrow?: string
  title: string
  description: string
  icon: LucideIcon
  headerGradientClassName: string
  matrix: ReturnType<typeof buildQuadrantMatrix<T>>
  selectedQuadrantKey: QuadrantKey
  setSelectedQuadrantKey: (key: QuadrantKey) => void
  selectedQuadrantPage: number
  setSelectedQuadrantPage: (page: number) => void
  summaryLabel: string
  listTitle: string
  listUnit: string
  tableColumns: MatrixTableColumn<T>[]
  metaRenderer: (item: MatrixPoint<T>) => string
}

function getQuadrantAreaOpacity(selectedKey: QuadrantKey, quadrantKey: QuadrantKey) {
  return selectedKey === quadrantKey ? 0.62 : 0.16
}

function getPointOpacity(selectedKey: QuadrantKey, quadrantKey: QuadrantKey) {
  return selectedKey === quadrantKey ? 0.95 : 0.2
}

function QuadrantMatrixPage<T extends { name: string; sales: number; grossMargin: number; grossProfit: number }>({
  eyebrow,
  title,
  description,
  icon,
  headerGradientClassName,
  matrix,
  selectedQuadrantKey,
  setSelectedQuadrantKey,
  selectedQuadrantPage,
  setSelectedQuadrantPage,
  summaryLabel,
  listTitle,
  listUnit,
  tableColumns,
  metaRenderer,
}: QuadrantMatrixPageProps<T>) {
  const selectedQuadrant = matrix.quadrants.find((quadrant) => quadrant.key === selectedQuadrantKey) ?? matrix.quadrants[0]
  const sortedItems = useMemo(
    () => [...selectedQuadrant.customers].sort((a, b) => b.grossProfit - a.grossProfit),
    [selectedQuadrant],
  )
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage))
  const currentPage = Math.min(selectedQuadrantPage, totalPages)
  const pagedItems = sortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const Icon = icon

  return (
    <div className="p-6">
      <PageHeader
        eyebrow={eyebrow ?? "Inventory"}
        title={title}
        description={description}
        icon={icon}
      />

      <Card className="mb-6 overflow-hidden">
        <CardHeader className={cn("border-b border-border/60", headerGradientClassName)}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#345fe1]" />
                {title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">平均売上: {formatCompactCurrency(matrix.averageSales)}</Badge>
              <Badge variant="outline">平均粗利率: {formatPercent(matrix.averageGrossMargin)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matrix.quadrants.map((quadrant) => {
                const quadrantItems = [...quadrant.customers].sort((a, b) => b.grossProfit - a.grossProfit)

                return (
                  <div key={quadrant.key} className={cn("rounded-2xl border p-5", quadrant.borderClassName)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={quadrant.badgeClassName}>{quadrant.title}</Badge>
                          <span className="text-xs text-muted-foreground">{quadrant.axisLabel}</span>
                        </div>
                        <p className="mt-3 text-sm text-foreground/90">{quadrant.description}</p>
                      </div>
                      <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                        {quadrant.customers.length}
                        {listUnit}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-xs font-medium text-muted-foreground">{summaryLabel}</p>
                        <p className="mt-2 text-sm text-foreground">
                          {quadrantItems.slice(0, 3).map((item) => item.name).join(" / ") || "該当なし"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-xs font-medium text-muted-foreground">平均売上額</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {formatCompactCurrency(
                            quadrantItems.reduce((sum, item) => sum + item.sales, 0) / Math.max(quadrantItems.length, 1),
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-xs font-medium text-muted-foreground">平均粗利率</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {formatPercent(
                            quadrantItems.reduce((sum, item) => sum + item.grossMargin, 0) / Math.max(quadrantItems.length, 1),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="h-[560px] w-full rounded-2xl border border-border/70 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 28, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
                  <ReferenceArea
                    x1={matrix.averageSales}
                    x2={matrix.xMax}
                    y1={matrix.averageGrossMargin}
                    y2={matrix.yMax}
                    fill="#dcfce7"
                    fillOpacity={getQuadrantAreaOpacity(selectedQuadrantKey, "highSalesHighMargin")}
                  />
                  <ReferenceArea
                    x1={matrix.averageSales}
                    x2={matrix.xMax}
                    y1={0}
                    y2={matrix.averageGrossMargin}
                    fill="#fef3c7"
                    fillOpacity={getQuadrantAreaOpacity(selectedQuadrantKey, "highSalesLowMargin")}
                  />
                  <ReferenceArea
                    x1={0}
                    x2={matrix.averageSales}
                    y1={matrix.averageGrossMargin}
                    y2={matrix.yMax}
                    fill="#e0f2fe"
                    fillOpacity={getQuadrantAreaOpacity(selectedQuadrantKey, "lowSalesHighMargin")}
                  />
                  <ReferenceArea
                    x1={0}
                    x2={matrix.averageSales}
                    y1={0}
                    y2={matrix.averageGrossMargin}
                    fill="#ffe4e6"
                    fillOpacity={getQuadrantAreaOpacity(selectedQuadrantKey, "lowSalesLowMargin")}
                  />
                  <XAxis
                    type="number"
                    dataKey="sales"
                    domain={[0, matrix.xMax]}
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "売上額", position: "insideBottom", offset: -8, fill: "#475569" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="grossMargin"
                    domain={[0, matrix.yMax]}
                    tickFormatter={formatPercent}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                    label={{ value: "粗利率", angle: -90, position: "insideLeft", fill: "#475569" }}
                  />
                  <ZAxis type="number" dataKey="grossProfit" range={[120, 560]} />
                  <ReferenceLine
                    x={matrix.averageSales}
                    stroke="#345fe1"
                    strokeDasharray="6 6"
                    label={{
                      value: `平均売上 ${formatCompactCurrency(matrix.averageSales)}`,
                      position: "top",
                      fill: "#345fe1",
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine
                    y={matrix.averageGrossMargin}
                    stroke="#345fe1"
                    strokeDasharray="6 6"
                    label={{
                      value: `平均粗利率 ${formatPercent(matrix.averageGrossMargin)}`,
                      position: "right",
                      fill: "#345fe1",
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0]?.payload as MatrixPoint<T>
                      return (
                        <div className="min-w-[240px] rounded-xl border border-border/70 bg-background p-3 shadow-xl">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{metaRenderer(item)}</p>
                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">売上額</span>
                              <span className="font-medium text-foreground">{formatCurrency(item.sales)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">粗利率</span>
                              <span className="font-medium text-foreground">{formatPercent(item.grossMargin)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">粗利額</span>
                              <span className="font-medium text-foreground">{formatCurrency(item.grossProfit)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={matrix.points}>
                    {matrix.points.map((point) => (
                      <Cell
                        key={point.name}
                        fill={point.color}
                        stroke={point.color}
                        fillOpacity={getPointOpacity(selectedQuadrantKey, point.quadrantKey)}
                        strokeOpacity={getPointOpacity(selectedQuadrantKey, point.quadrantKey)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 border-t border-border/60 pt-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {matrix.quadrants.map((quadrant) => (
                <Button
                  key={quadrant.key}
                  variant={selectedQuadrantKey === quadrant.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    selectedQuadrantKey === quadrant.key
                      ? "bg-[#345fe1] text-white hover:bg-[#2a4bb3]"
                      : "bg-transparent hover:border-[#345fe1]/50",
                  )}
                  onClick={() => {
                    setSelectedQuadrantKey(quadrant.key)
                    setSelectedQuadrantPage(1)
                  }}
                >
                  {quadrant.title}
                  <span className="ml-2 text-xs opacity-80">
                    {quadrant.customers.length}
                    {listUnit}
                  </span>
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#345fe1]" />
                  {listTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  選択中: {selectedQuadrant.title}。1ページあたり10{listUnit}ずつ表示します。
                </p>
              </div>
              <Badge className={selectedQuadrant.badgeClassName}>{selectedQuadrant.axisLabel}</Badge>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border/70 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">No.</th>
                    {tableColumns.map((column) => (
                      <th
                        key={column.label}
                        className={cn("px-4 py-3 font-medium text-muted-foreground", column.headerClassName)}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item, index) => (
                    <tr key={`${selectedQuadrant.key}-${item.name}`} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-3 text-muted-foreground">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      {tableColumns.map((column) => (
                        <td key={column.label} className={cn("px-4 py-3", column.cellClassName)}>
                          {column.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {sortedItems.length}
                {listUnit}中 {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, sortedItems.length)}
                {listUnit}を表示
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  onClick={() => setSelectedQuadrantPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  onClick={() => setSelectedQuadrantPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CustomerQuadrant() {
  const [selectedQuadrantKey, setSelectedQuadrantKey] = useState<QuadrantKey>("highSalesHighMargin")
  const [selectedQuadrantPage, setSelectedQuadrantPage] = useState(1)
  const matrix = useMemo(() => buildQuadrantMatrix(customerMatrixData, quadrantDefinitions), [])

  return (
    <QuadrantMatrixPage
      title="得意先4象限マトリクス"
      description="売上額と粗利率の2軸で得意先企業を配置し、重点フォロー先と条件見直し先を切り分けます。"
      icon={Building2}
      headerGradientClassName="bg-linear-to-r from-[#345fe1]/6 via-white to-emerald-50"
      matrix={matrix}
      selectedQuadrantKey={selectedQuadrantKey}
      setSelectedQuadrantKey={setSelectedQuadrantKey}
      selectedQuadrantPage={selectedQuadrantPage}
      setSelectedQuadrantPage={setSelectedQuadrantPage}
      summaryLabel="主な得意先"
      listTitle="象限別企業一覧"
      listUnit="社"
      metaRenderer={(item) => `担当: ${item.manager}`}
      tableColumns={[
        { label: "企業名", render: (item) => <span className="font-medium text-foreground">{item.name}</span> },
        { label: "担当", render: (item) => <span className="text-muted-foreground">{item.manager}</span> },
        {
          label: "売上額",
          headerClassName: "text-right",
          cellClassName: "text-right font-medium text-foreground",
          render: (item) => formatCurrency(item.sales),
        },
        {
          label: "粗利率",
          headerClassName: "text-right",
          cellClassName: "text-right text-foreground",
          render: (item) => formatPercent(item.grossMargin),
        },
        {
          label: "粗利額",
          headerClassName: "text-right",
          cellClassName: "text-right text-foreground",
          render: (item) => formatCurrency(item.grossProfit),
        },
      ]}
    />
  )
}

export function ProductQuadrant() {
  const [selectedQuadrantKey, setSelectedQuadrantKey] = useState<QuadrantKey>("highSalesHighMargin")
  const [selectedQuadrantPage, setSelectedQuadrantPage] = useState(1)
  const matrix = useMemo(() => buildQuadrantMatrix(productMatrixData, productQuadrantDefinitions), [])

  return (
    <QuadrantMatrixPage
      title="商品4象限マトリクス"
      description="売上額と粗利率の2軸で商品を配置し、主力SKUと見直し対象SKUを切り分けます。"
      icon={Shirt}
      headerGradientClassName="bg-linear-to-r from-[#345fe1]/6 via-white to-sky-50"
      matrix={matrix}
      selectedQuadrantKey={selectedQuadrantKey}
      setSelectedQuadrantKey={setSelectedQuadrantKey}
      selectedQuadrantPage={selectedQuadrantPage}
      setSelectedQuadrantPage={setSelectedQuadrantPage}
      summaryLabel="主な商品"
      listTitle="象限別商品一覧"
      listUnit="点"
      metaRenderer={(item) => `${item.category} / ${item.brand}`}
      tableColumns={[
        { label: "商品名", render: (item) => <span className="font-medium text-foreground">{item.name}</span> },
        { label: "カテゴリ", render: (item) => <span className="text-muted-foreground">{item.category}</span> },
        { label: "ブランド", render: (item) => <span className="text-muted-foreground">{item.brand}</span> },
        {
          label: "売上額",
          headerClassName: "text-right",
          cellClassName: "text-right font-medium text-foreground",
          render: (item) => formatCurrency(item.sales),
        },
        {
          label: "粗利率",
          headerClassName: "text-right",
          cellClassName: "text-right text-foreground",
          render: (item) => formatPercent(item.grossMargin),
        },
        {
          label: "粗利額",
          headerClassName: "text-right",
          cellClassName: "text-right text-foreground",
          render: (item) => formatCurrency(item.grossProfit),
        },
      ]}
    />
  )
}