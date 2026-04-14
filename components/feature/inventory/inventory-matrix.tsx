"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  Shirt,
  Building2,
  Target,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/feature/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  getCustomerMatrixAction,
  getProductMatrixAction,
  type CustomerMatrixRow,
  type ProductMatrixRow,
} from "@/src/actions/matrix-actions"

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
  const averageSales = data.length > 0 ? data.reduce((sum, item) => sum + item.sales, 0) / data.length : 0
  const averageGrossMargin = data.length > 0 ? data.reduce((sum, item) => sum + item.grossMargin, 0) / data.length : 0

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

  const salesValues = points.map((p) => p.sales)
  const marginValues = points.map((p) => p.grossMargin)

  return {
    averageSales,
    averageGrossMargin,
    points,
    quadrants,
    xMax: salesValues.length > 0 ? Math.max(...salesValues) * 1.15 : 100,
    yMax: marginValues.length > 0 ? Math.max(...marginValues) * 1.15 : 100,
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
  isLoading: boolean
  periodFrom: string
  setPeriodFrom: (v: string) => void
  periodTo: string
  setPeriodTo: (v: string) => void
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
  isLoading,
  periodFrom,
  setPeriodFrom,
  periodTo,
  setPeriodTo,
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
                <span className="text-muted-foreground text-sm">〜</span>
                <Input
                  type="month"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">平均売上: {formatCompactCurrency(matrix.averageSales)}</Badge>
                <Badge variant="outline">平均粗利率: {formatPercent(matrix.averageGrossMargin)}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              読み込み中...
            </div>
          ) : matrix.points.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              データがありません
            </div>
          ) : (
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
          )}

          {!isLoading && matrix.points.length > 0 && (
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
                      <tr key={`${selectedQuadrant.key}-${index}-${item.name}`} className="border-b border-border/60 last:border-b-0">
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function CustomerQuadrant() {
  const [data, setData] = useState<CustomerMatrixRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [selectedQuadrantKey, setSelectedQuadrantKey] = useState<QuadrantKey>("highSalesHighMargin")
  const [selectedQuadrantPage, setSelectedQuadrantPage] = useState(1)

  useEffect(() => {
    setIsLoading(true)
    getCustomerMatrixAction({
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
    }).then((res) => {
      if (res.success) {
        setData(res.data)
        setSelectedQuadrantPage(1)
      }
      setIsLoading(false)
    })
  }, [periodFrom, periodTo])

  const matrix = useMemo(() => buildQuadrantMatrix(data, quadrantDefinitions), [data])

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
      isLoading={isLoading}
      periodFrom={periodFrom}
      setPeriodFrom={setPeriodFrom}
      periodTo={periodTo}
      setPeriodTo={setPeriodTo}
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
  const [data, setData] = useState<ProductMatrixRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [periodFrom, setPeriodFrom] = useState("")
  const [periodTo, setPeriodTo] = useState("")
  const [selectedQuadrantKey, setSelectedQuadrantKey] = useState<QuadrantKey>("highSalesHighMargin")
  const [selectedQuadrantPage, setSelectedQuadrantPage] = useState(1)

  useEffect(() => {
    setIsLoading(true)
    getProductMatrixAction({
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
    }).then((res) => {
      if (res.success) {
        setData(res.data)
        setSelectedQuadrantPage(1)
      }
      setIsLoading(false)
    })
  }, [periodFrom, periodTo])

  const matrix = useMemo(() => buildQuadrantMatrix(data, productQuadrantDefinitions), [data])

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
      isLoading={isLoading}
      periodFrom={periodFrom}
      setPeriodFrom={setPeriodFrom}
      periodTo={periodTo}
      setPeriodTo={setPeriodTo}
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
