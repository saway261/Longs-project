"use client"

import { useEffect, useMemo, useState } from "react"
import { Package, BarChart2, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import {
  getSalesCompositionAction,
  getYearlyComparisonAction,
  getStockTurnoverAction,
  getSalesForecastAction,
  getTurnoverRankingAction,
  getCategoryAgingAction,
} from "@/src/actions/insights-actions"
import type {
  SalesCompositionData,
  YearlyComparisonData,
  StockTurnoverRow,
  SalesForecastData,
  TurnoverRankingRow,
  CategoryAgingRow,
} from "@/src/actions/insights-actions"

const RADIAN = Math.PI / 180

const renderCategoryLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, name, value } = props
  const radius = innerRadius + (outerRadius - innerRadius) * 0.75
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#1f2937">
      <tspan x={x} dy="-0.2em" fontWeight="bold">
        {name}
      </tspan>
      <tspan x={x} dy="1.2em" fontWeight="bold">
        {value}%
      </tspan>
    </text>
  )
}

export function InventoryInsights() {
  const [goodPage, setGoodPage] = useState(1)
  const [forecastCategory, setForecastCategory] = useState<string>("全体")
  const [compositionGroupBy, setCompositionGroupBy] = useState<"category" | "brand">("category")

  const [compositionData, setCompositionData] = useState<SalesCompositionData | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyComparisonData | null>(null)
  const [turnoverData, setTurnoverData] = useState<StockTurnoverRow[]>([])
  const [forecastData, setForecastData] = useState<SalesForecastData | null>(null)
  const [rankingData, setRankingData] = useState<TurnoverRankingRow[]>([])
  const [agingData, setAgingData] = useState<CategoryAgingRow[]>([])
  const [loading, setLoading] = useState(true)

  // 初回マウント時に全データを並行フェッチ
  useEffect(() => {
    Promise.allSettled([
      getSalesCompositionAction("category"),
      getYearlyComparisonAction(),
      getStockTurnoverAction(),
      getSalesForecastAction(null),
      getTurnoverRankingAction(),
      getCategoryAgingAction(),
    ])
      .then(([comp, yearly, turnover, forecast, ranking, aging]) => {
        if (comp.status === "fulfilled" && comp.value.success) setCompositionData(comp.value.data)
        if (yearly.status === "fulfilled" && yearly.value.success) setYearlyData(yearly.value.data)
        if (turnover.status === "fulfilled" && turnover.value.success) setTurnoverData(turnover.value.data)
        if (forecast.status === "fulfilled" && forecast.value.success) setForecastData(forecast.value.data)
        if (ranking.status === "fulfilled" && ranking.value.success) setRankingData(ranking.value.data)
        if (aging.status === "fulfilled" && aging.value.success) setAgingData(aging.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // カテゴリ別/ブランド別切り替え
  useEffect(() => {
    getSalesCompositionAction(compositionGroupBy).then((r) => {
      if (r.success) setCompositionData(r.data)
    })
  }, [compositionGroupBy])

  // 売上予測カテゴリ切り替え
  useEffect(() => {
    const cat = forecastCategory === "全体" ? null : forecastCategory
    getSalesForecastAction(cat).then((r) => {
      if (r.success)
        setForecastData((prev) => (prev ? { ...prev, rows: r.data.rows } : r.data))
    })
  }, [forecastCategory])

  // 予測需要をクライアント側で計算
  const salesForecastWithPrediction = useMemo(() => {
    if (!forecastData) return []
    const known = forecastData.rows.filter((r) => r.現在売上 !== null)
    const avgRatio =
      known.length > 0
        ? known.reduce(
            (s, r) => s + (r.過去売上 > 0 ? r.現在売上! / r.過去売上 : 1),
            0,
          ) / known.length
        : 1.05
    return forecastData.rows.map((r) => ({
      ...r,
      予測需要:
        r.現在売上 !== null ? r.現在売上 : Math.round(r.過去売上 * avgRatio),
    }))
  }, [forecastData])

  const goodItemsPerPage = 8
  const goodTotalPages = Math.max(1, Math.ceil(rankingData.length / goodItemsPerPage))
  const currentGoodPage = Math.min(goodPage, goodTotalPages)
  const goodStart = (currentGoodPage - 1) * goodItemsPerPage
  const goodEnd = goodStart + goodItemsPerPage
  const pagedGoodItems = rankingData.slice(goodStart, goodEnd)

  const forecastCategoryOptions = ["全体", ...(forecastData?.availableCategories ?? [])]

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Inventory</p>
        <h2 className="text-2xl font-bold text-foreground">在庫データ分析</h2>
        <p className="text-muted-foreground">
          カテゴリ構成・前年比較・回転率・在庫効率・アラート分析をまとめて確認できます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {/* 売上構成 */}
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-[#345fe1]" />
                売上構成
              </CardTitle>
              <div className="flex gap-1">
                {(["category", "brand"] as const).map((g) => (
                  <Button
                    key={g}
                    variant="outline"
                    size="sm"
                    onClick={() => setCompositionGroupBy(g)}
                    className={cn(
                      "h-6 px-2 rounded-full text-xs",
                      compositionGroupBy === g
                        ? "bg-[#345fe1] text-white border-transparent hover:bg-[#2a4bb3]"
                        : "bg-white text-muted-foreground",
                    )}
                  >
                    {g === "category" ? "カテゴリ別" : "ブランド別"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : !compositionData || compositionData.items.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  データがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compositionData.items}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={renderCategoryLabel}
                      labelLine={false}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {compositionData.items.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 前年比較 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#345fe1]" />
              前年比較
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 overflow-x-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : !yearlyData || yearlyData.rows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  データがありません
                </div>
              ) : (
                <div style={{ minWidth: 600, height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData.rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="昨年" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="今年" fill="#345fe1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 在庫回転率 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#345fe1]" />
              在庫回転率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : turnoverData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  データがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnoverData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={10} width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="回転率" fill="#345fe1" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="目標" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 売上推移 & 需要予測 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">売上推移 & 需要予測</CardTitle>
          <div className="flex flex-wrap gap-2">
            {forecastCategoryOptions.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => setForecastCategory(category)}
                className={cn(
                  "h-7 px-3 rounded-full text-xs",
                  forecastCategory === category
                    ? "bg-[#345fe1] text-white border-transparent hover:bg-[#2a4bb3]"
                    : "bg-white text-muted-foreground",
                )}
              >
                {category}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-75">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                読み込み中...
              </div>
            ) : salesForecastWithPrediction.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                データがありません
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesForecastWithPrediction}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="過去売上"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ fill: "#94a3b8" }}
                    name="過去売上（昨年）"
                  />
                  <Line
                    type="monotone"
                    dataKey="現在売上"
                    stroke="#345fe1"
                    strokeWidth={3}
                    dot={{ fill: "#345fe1" }}
                    name="現在売上（今年）"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="予測需要"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#22c55e" }}
                    name="予測需要"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 在庫効率分析 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-[#345fe1]" />
            在庫効率分析
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            優良在庫の回転ランキングと、売り切り目標の状況を確認できます。
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">優良在庫ランキング</p>
                <p className="text-xs text-muted-foreground">回転率の高い商品をランキング表示</p>
              </div>
              <Badge variant="outline" className="bg-muted/40">
                上位 {rankingData.length} 件
              </Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">読み込み中...</div>
              ) : rankingData.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">データがありません</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">順位</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">ブランド</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">カテゴリ</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">回転率</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">販売数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGoodItems.map((row, index) => (
                      <tr key={`${row.brand}-${index}`} className="border-t border-border/70">
                        <td className="px-3 py-2 text-xs text-muted-foreground">#{goodStart + index + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{row.brand}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.category}</td>
                        <td className="px-3 py-2 text-right font-semibold text-[#345fe1]">{row.rotation} 回</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{row.quantity} 点</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {rankingData.length === 0
                  ? "0 件"
                  : `${goodStart + 1}-${Math.min(goodEnd, rankingData.length)} 件 / ${rankingData.length} 件`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoodPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentGoodPage === 1}
                >
                  前へ
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentGoodPage} / {goodTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoodPage((prev) => Math.min(goodTotalPages, prev + 1))}
                  disabled={currentGoodPage === goodTotalPages}
                >
                  次へ
                </Button>
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">カテゴリ別 売り切り目標日数</p>
              {loading ? (
                <div className="text-sm text-muted-foreground text-center py-2">読み込み中...</div>
              ) : agingData.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-2">データがありません</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {agingData.map((cat, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border",
                        cat.status === "ok" && "border-green-200 bg-green-50",
                        cat.status === "warn" && "border-yellow-200 bg-yellow-50",
                        cat.status === "alert" && "border-red-200 bg-red-50",
                      )}
                    >
                      <p className="text-sm font-semibold">{cat.category}</p>
                      <p className="text-xs text-muted-foreground">
                        平均 {cat.days}日 / 目標 {cat.target}日
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
