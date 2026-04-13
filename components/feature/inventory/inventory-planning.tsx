"use client"

import { useState, useEffect } from "react"
import { Download, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Package, DollarSign, Maximize2, Minimize2, BarChart3 } from "lucide-react"
import { PageHeader } from "@/components/feature/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  getAvailableFiscalYearsAction,
  getInventoryPlanAction,
  saveInventoryPlanAction,
} from "@/src/actions/inventory-planning-actions"
import type { InventoryPlanMonthDTO, PlanMonthInput } from "@/src/actions/inventory-planning-actions"

type BulkRowKey =
  | "purchaseBudget"
  | "shipmentAmount"
  | "shipmentGrossProfitRate"
  | "shipmentCost"
  | "waste"
  | "monthEndInventory"
  | "inventoryPlan"

export function InventoryPlanning() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [showComparison, setShowComparison] = useState(true)
  const [planDraft, setPlanDraft] = useState<Record<number, InventoryPlanMonthDTO[]>>({})
  const [isBulkPlanOpen, setIsBulkPlanOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 初回マウント: 年度一覧取得
  useEffect(() => {
    getAvailableFiscalYearsAction().then((res) => {
      if (res.success && res.data.length > 0) {
        setAvailableYears(res.data)
        setSelectedYear(res.data[0])
      } else {
        setIsLoading(false)
      }
    })
  }, [])

  // 年度変更時: 計画データ取得（キャッシュ済みならスキップ）
  useEffect(() => {
    if (selectedYear === null) return
    if (planDraft[selectedYear]) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    getInventoryPlanAction(selectedYear).then((res) => {
      if (res.success) {
        setPlanDraft((prev) => ({ ...prev, [selectedYear]: res.data }))
      }
      setIsLoading(false)
    })
  }, [selectedYear]) // eslint-disable-line react-hooks/exhaustive-deps

  const data = selectedYear !== null ? (planDraft[selectedYear] ?? []) : []

  const yearIndex = availableYears.indexOf(selectedYear ?? 0)

  const handleDownload = () => {
    if (data.length === 0 || selectedYear === null) return

    const columns: { label: string; getValue: (row: InventoryPlanMonthDTO) => string }[] = [
      { label: "月", getValue: (r) => r.month },
      { label: "仕入れ予算(円)", getValue: (r) => String(r.purchaseBudget) },
      { label: "出荷金額(円)", getValue: (r) => String(r.shipmentAmount) },
      { label: "出荷粗利益率(%)", getValue: (r) => r.shipmentGrossProfitRate.toFixed(1) },
      { label: "出荷原価(円)", getValue: (r) => String(r.shipmentCost) },
      { label: "廃品(円)", getValue: (r) => String(r.waste) },
      { label: "月末在庫金額(円)", getValue: (r) => String(r.monthEndInventory) },
      { label: "在庫計画(円)", getValue: (r) => String(r.inventoryPlan) },
      { label: "計画差(円)", getValue: (r) => String(r.planDiff) },
      { label: "昨年在庫実績(円)", getValue: (r) => String(r.lastYearInventory) },
    ]

    const header = columns.map((c) => `"${c.label}"`).join(",")
    const rows = data.map((row) => columns.map((c) => `"${c.getValue(row)}"`).join(","))
    const csv = "\uFEFF" + [header, ...rows].join("\r\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `在庫計画早見表_${selectedYear}年度.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      purchaseBudget: acc.purchaseBudget + item.purchaseBudget,
      shipmentAmount: acc.shipmentAmount + item.shipmentAmount,
      shipmentCost: acc.shipmentCost + item.shipmentCost,
      waste: acc.waste + item.waste,
    }),
    { purchaseBudget: 0, shipmentAmount: 0, shipmentCost: 0, waste: 0 },
  )

  const totalsLastYear = data.reduce(
    (acc, item) => ({
      purchaseBudget: acc.purchaseBudget + item.purchaseBudgetLastYear,
      shipmentAmount: acc.shipmentAmount + item.shipmentAmountLastYear,
      shipmentCost: acc.shipmentCost + item.shipmentCostLastYear,
      waste: acc.waste + item.wasteLastYear,
    }),
    { purchaseBudget: 0, shipmentAmount: 0, shipmentCost: 0, waste: 0 },
  )

  const totalsBudget = data.reduce(
    (acc, item) => ({
      purchaseBudget: acc.purchaseBudget + item.purchaseBudgetPrediction,
      shipmentAmount: acc.shipmentAmount + item.shipmentAmountPrediction,
      shipmentCost: acc.shipmentCost + item.shipmentCostPrediction,
      waste: acc.waste + item.wastePrediction,
    }),
    { purchaseBudget: 0, shipmentAmount: 0, shipmentCost: 0, waste: 0 },
  )

  const avgGrossProfitRate =
    data.length > 0 ? data.reduce((acc, item) => acc + item.shipmentGrossProfitRate, 0) / data.length : 0
  const avgGrossProfitRateLastYear =
    data.length > 0 ? data.reduce((acc, item) => acc + item.shipmentGrossProfitRateLastYear, 0) / data.length : 0
  const avgGrossProfitRateBudget =
    data.length > 0 ? data.reduce((acc, item) => acc + item.shipmentGrossProfitRatePrediction, 0) / data.length : 0

  const avgMonthEndInventory =
    data.length > 0 ? data.reduce((acc, item) => acc + item.monthEndInventory, 0) / data.length : 0
  const avgMonthEndInventoryLastYear =
    data.length > 0 ? data.reduce((acc, item) => acc + item.monthEndInventoryLastYear, 0) / data.length : 0
  const avgMonthEndInventoryBudget =
    data.length > 0 ? data.reduce((acc, item) => acc + item.monthEndInventoryPrediction, 0) / data.length : 0
  const totalPlanDiff = data.reduce((acc, item) => acc + item.planDiff, 0)

  const calcDiffPercent = (value: number, base: number) => {
    if (base === 0) return null
    return ((value - base) / Math.abs(base)) * 100
  }

  const formatDiffPercent = (value: number | null) => {
    if (value === null) return "-"
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  const renderComparisonMeta = (value: number, lastYear: number, budget: number) => {
    if (!showComparison) return null
    const yoy = calcDiffPercent(value, lastYear)
    const budgetRatio = calcDiffPercent(value, budget)
    return (
      <div className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center justify-end gap-1">
        <span className="text-gray-400">昨年比 {formatDiffPercent(yoy)}</span>
        <span className="mx-1 text-gray-300">|</span>
        <span className="text-[#345fe1]">予算比 {formatDiffPercent(budgetRatio)}</span>
      </div>
    )
  }

  const renderCellWithComparison = (
    value: number,
    lastYear: number,
    budget: number,
    isCurrency = true,
    isPercent = false,
  ) => {
    const format = isPercent ? formatPercent : isCurrency ? formatCurrency : (v: number) => v.toString()
    return (
      <div className="text-right">
        <div className="font-mono font-medium">{format(value)}</div>
        {renderComparisonMeta(value, lastYear, budget)}
      </div>
    )
  }

  const renderTotalCell = (
    value: number,
    lastYear: number,
    budget: number,
    isCurrency = true,
    isPercent = false,
    suffix?: string,
  ) => {
    const format = isPercent ? formatPercent : isCurrency ? formatCurrency : (v: number) => v.toString()
    return (
      <div className="text-right">
        <div className="font-mono font-bold">
          {format(value)}
          {suffix && <span className="text-xs text-muted-foreground font-normal ml-1">{suffix}</span>}
        </div>
        {renderComparisonMeta(value, lastYear, budget)}
      </div>
    )
  }

  type BulkRow = {
    key: BulkRowKey
    label: string
    step?: number
  }

  const bulkMonths = (selectedYear !== null ? planDraft[selectedYear] : null)?.map((row) => row.month) ?? []
  const bulkRows: BulkRow[] = [
    { key: "purchaseBudget", label: "仕入れ予算" },
    { key: "shipmentAmount", label: "出荷金額" },
    { key: "shipmentGrossProfitRate", label: "目標粗利率(%)", step: 0.1 },
    { key: "shipmentCost", label: "出荷原価" },
    { key: "waste", label: "廃品" },
    { key: "monthEndInventory", label: "月末在庫金額" },
    { key: "inventoryPlan", label: "在庫計画" },
  ]

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="Inventory"
        title="在庫計画早見表"
        description="月次の在庫計画と実績の比較"
        icon={BarChart3}
      />

      <Dialog open={isBulkPlanOpen} onOpenChange={(open: boolean) => { setIsBulkPlanOpen(open); if (!open) setIsFullscreen(false) }}>
        <DialogContent
          fullscreen={isFullscreen}
          className={cn(
            "flex flex-col",
            !isFullscreen && "max-w-400 w-[80vw] h-[85vh]"
          )}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle>{selectedYear}年度 計画一括入力</DialogTitle>
                <DialogDescription>在庫計画早見表と同じ並びで入力できます。</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 mt-0.5"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "通常表示に戻す" : "全画面表示"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#345fe1] text-white">
                  <th className="text-left py-3 px-4 sticky left-0 z-30 bg-[#345fe1] min-w-40 border-r border-white/20">
                    項目
                  </th>
                  {bulkMonths.map((month) => (
                    <th key={month} className="text-center py-3 px-3 font-semibold min-w-[9rem]">
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((rowDef, rowIndex) => (
                  <tr
                    key={rowDef.key}
                    className={cn(
                      "border-b border-border/60",
                      rowIndex % 2 === 1 && "bg-muted/20",
                    )}
                  >
                    <td className="py-3 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      {rowDef.label}
                    </td>
                    {bulkMonths.map((_, idx) => (
                      <td key={`${rowDef.key}-${idx}`} className="py-2 px-3 min-w-[9rem]">
                        <Input
                          type="number"
                          step={rowDef.step ?? 1}
                          value={selectedYear !== null ? (planDraft[selectedYear]?.[idx]?.[rowDef.key] ?? 0) : 0}
                          onChange={(e) => {
                            if (selectedYear === null) return
                            setPlanDraft((prev) => {
                              const yearData = [...(prev[selectedYear] ?? [])]
                              yearData[idx] = { ...yearData[idx], [rowDef.key]: Number(e.target.value) }
                              return { ...prev, [selectedYear]: yearData }
                            })
                          }}
                          className="h-9 text-right tabular-nums w-[9rem] min-w-[9rem]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-3">
            <Button
              className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
              disabled={isSaving || selectedYear === null}
              onClick={async () => {
                if (selectedYear === null || !planDraft[selectedYear]) return
                setIsSaving(true)
                const months: PlanMonthInput[] = planDraft[selectedYear].map((row) => ({
                  monthDate: row.monthDate,
                  purchaseBudget: row.purchaseBudget,
                  shipmentAmount: row.shipmentAmount,
                  shipmentGrossProfitRate: row.shipmentGrossProfitRate,
                  shipmentCost: row.shipmentCost,
                  waste: row.waste,
                  monthEndInventory: row.monthEndInventory,
                  inventoryPlan: row.inventoryPlan,
                }))
                await saveInventoryPlanAction(selectedYear, months)
                setIsSaving(false)
                setIsBulkPlanOpen(false)
              }}
            >
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#345fe1] text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/70">年間仕入れ予算</p>
                <p className="text-lg font-bold">{formatCurrency(totals.purchaseBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#345fe1]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">年間出荷金額</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totals.shipmentAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#345fe1]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">平均在庫金額</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(avgMonthEndInventory)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                {totalPlanDiff >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-[#345fe1]" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-[#345fe1]" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">年間計画差</p>
                <p className={cn("text-lg font-bold", totalPlanDiff >= 0 ? "text-green-600" : "text-red-600")}>
                  {totalPlanDiff >= 0 ? "+" : ""}
                  {formatCurrency(totalPlanDiff)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planning Table - Improved with comparison data */}
      <Card>
        <CardHeader className="border-b border-border space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{selectedYear}年度 在庫計画早見表</CardTitle>
              <p className="text-sm text-muted-foreground">月次の在庫計画と実績の比較</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={yearIndex >= availableYears.length - 1}
                onClick={() => {
                  if (yearIndex < availableYears.length - 1) setSelectedYear(availableYears[yearIndex + 1])
                }}
                className="bg-transparent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select
                value={selectedYear !== null ? String(selectedYear) : ""}
                onValueChange={(v: string) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}年度
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                disabled={yearIndex <= 0}
                onClick={() => {
                  if (yearIndex > 0) setSelectedYear(availableYears[yearIndex - 1])
                }}
                className="bg-transparent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant={showComparison ? "default" : "outline"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className={cn(showComparison ? "bg-[#345fe1] hover:bg-[#2a4bb3] text-white" : "bg-transparent")}
              >
                {showComparison ? "比較表示 ON" : "比較表示 OFF"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">年度の切り替え・計画登録・ダウンロードをまとめて操作</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-transparent text-[#345fe1] border-[#345fe1]" onClick={handleDownload} disabled={data.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                ダウンロード
              </Button>
              <Button className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white" onClick={() => setIsBulkPlanOpen(true)}>
                計画登録/修正
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">読み込み中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#345fe1]">
                    <th className="text-left py-4 px-4 text-white font-semibold sticky left-0 z-30 bg-[#345fe1] min-w-40 border-r border-white/20 shadow-[2px_0_0_rgba(255,255,255,0.18)]">
                      項目
                    </th>
                    {data.map((item) => (
                      <th key={item.month} className="text-center py-4 px-3 text-white font-semibold min-w-30">
                        {item.month}
                      </th>
                    ))}
                    <th className="text-center py-4 px-4 bg-[#2a4bb3] text-white font-bold min-w-35">合計/平均</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Purchase Budget Row */}
                  <tr className="border-b border-border hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#345fe1]" />
                        仕入れ予算
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        {renderCellWithComparison(
                          item.purchaseBudget,
                          item.purchaseBudgetLastYear,
                          item.purchaseBudgetPrediction,
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border">
                      {renderTotalCell(totals.purchaseBudget, totalsLastYear.purchaseBudget, totalsBudget.purchaseBudget)}
                    </td>
                  </tr>

                  {/* Shipment Amount Row */}
                  <tr className="border-b border-border bg-muted/20 hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        出荷金額
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        {renderCellWithComparison(
                          item.shipmentAmount,
                          item.shipmentAmountLastYear,
                          item.shipmentAmountPrediction,
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border">
                      {renderTotalCell(totals.shipmentAmount, totalsLastYear.shipmentAmount, totalsBudget.shipmentAmount)}
                    </td>
                  </tr>

                  {/* Shipment Gross Profit Rate Row */}
                  <tr className="border-b border-border hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        出荷粗利益率
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        <div className="text-right">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-semibold",
                              item.shipmentGrossProfitRate >= 35
                                ? "bg-green-100 text-green-700"
                                : item.shipmentGrossProfitRate < 30
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {formatPercent(item.shipmentGrossProfitRate)}
                          </span>
                          {renderComparisonMeta(
                            item.shipmentGrossProfitRate,
                            item.shipmentGrossProfitRateLastYear,
                            item.shipmentGrossProfitRatePrediction,
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border">
                      <div className="text-right">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#345fe1]/10 text-[#345fe1]">
                          {formatPercent(avgGrossProfitRate)}
                        </span>
                        {renderComparisonMeta(avgGrossProfitRate, avgGrossProfitRateLastYear, avgGrossProfitRateBudget)}
                      </div>
                    </td>
                  </tr>

                  {/* Shipment Cost Row */}
                  <tr className="border-b border-border bg-muted/20 hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        出荷原価
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        {renderCellWithComparison(
                          item.shipmentCost,
                          item.shipmentCostLastYear,
                          item.shipmentCostPrediction,
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border">
                      {renderTotalCell(totals.shipmentCost, totalsLastYear.shipmentCost, totalsBudget.shipmentCost)}
                    </td>
                  </tr>

                  {/* Waste Row */}
                  <tr className="border-b border-border hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        廃品
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        <div className="text-right text-red-600">
                          <div className="font-mono font-medium">{formatCurrency(item.waste)}</div>
                          {renderComparisonMeta(item.waste, item.wasteLastYear, item.wastePrediction)}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border text-red-600">
                      <div className="text-right">
                        <div className="font-mono font-bold">{formatCurrency(totals.waste)}</div>
                        {renderComparisonMeta(totals.waste, totalsLastYear.waste, totalsBudget.waste)}
                      </div>
                    </td>
                  </tr>

                  {/* Month End Inventory Row */}
                  <tr className="border-b border-border bg-muted/20 hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        月末在庫金額
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3">
                        {renderCellWithComparison(
                          item.monthEndInventory,
                          item.monthEndInventoryLastYear,
                          item.monthEndInventoryPrediction,
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-4 bg-muted/50 border-l border-border">
                      {renderTotalCell(
                        avgMonthEndInventory,
                        avgMonthEndInventoryLastYear,
                        avgMonthEndInventoryBudget,
                        true,
                        false,
                        "(平均)",
                      )}
                    </td>
                  </tr>

                  {/* Inventory Plan Row */}
                  <tr className="border-b border-border hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        在庫計画
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3 text-right font-mono">
                        {formatCurrency(item.inventoryPlan)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold font-mono bg-muted/50 border-l border-border">-</td>
                  </tr>

                  {/* Plan Diff Row */}
                  <tr className="border-b border-border bg-muted/20 hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        計画差
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3 text-right font-mono">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-semibold",
                            item.planDiff > 0
                              ? "bg-green-100 text-green-700"
                              : item.planDiff < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {item.planDiff >= 0 ? "+" : ""}
                          {formatCurrency(item.planDiff)}
                        </span>
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold font-mono bg-muted/50 border-l border-border">
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-semibold",
                          totalPlanDiff > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                        )}
                      >
                        {totalPlanDiff >= 0 ? "+" : ""}
                        {formatCurrency(totalPlanDiff)}
                      </span>
                    </td>
                  </tr>

                  {/* Last Year Inventory Row */}
                  <tr className="hover:bg-[#345fe1]/5 transition-colors">
                    <td className="py-4 px-4 font-medium bg-white sticky left-0 z-20 border-r border-border shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        昨年在庫実績
                      </div>
                    </td>
                    {data.map((item) => (
                      <td key={item.month} className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(item.lastYearInventory)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold font-mono bg-muted/50 border-l border-border text-muted-foreground">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
