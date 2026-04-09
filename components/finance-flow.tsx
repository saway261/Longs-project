"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getGanttEntriesAction,
  getFinanceOverviewStatsAction,
  getReservePoliciesAction,
  updateReservePolicyAction,
  updateTotalAssetsYenAction,
  type GanttEntryDTO,
  type ReservePolicyDTO,
} from "@/src/actions/finance-actions"
import type { FinanceOverviewStats } from "@/src/services/finance-service"
import {
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Smartphone,
  BarChart3,
  Building2,
  Pencil,
  Check,
  TrendingUp,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InventoryTable } from "@/components/inventory-table"

interface FinanceFlowProps {
  initialTab?: "overview" | "reserve" | "gantt"
}


type FlowType = "income" | "expense"

type RecurringEntry = GanttEntryDTO

type EntryOccurrence = {
  id: string
  entryId: string
  partner: string
  description: string
  amount: number
  type: FlowType
  category: string
  cycle: string
  dueDate: Date
  invoiceMonth: number
  tags?: string[]
}


const expandSchedules = (year: number, entries: RecurringEntry[]): EntryOccurrence[] => {
  const events: EntryOccurrence[] = []

  for (const schedule of entries) {
    if (schedule.invoiceDate) {
      // ファクトベースエントリ: invoiceDate + offsetMonths で支払日を1回生成
      const invoiceDate = new Date(schedule.invoiceDate + "T00:00:00")
      const invoiceMonth = invoiceDate.getMonth()
      const invoiceYear = invoiceDate.getFullYear()
      const dueMonth = invoiceMonth + schedule.offsetMonths
      const dueYear = invoiceYear + Math.floor(dueMonth / 12)
      const normalizedMonth = ((dueMonth % 12) + 12) % 12
      if (dueYear !== year) continue
      events.push({
        id: `${schedule.id}-${year}`,
        entryId: schedule.id,
        partner: schedule.partner,
        description: schedule.description,
        amount: schedule.amount,
        type: schedule.type,
        category: schedule.category,
        cycle: schedule.cycle,
        dueDate: new Date(dueYear, normalizedMonth, schedule.day),
        invoiceMonth,
        tags: schedule.tags.length > 0 ? schedule.tags : undefined,
      })
    } else {
      // 固定費エントリ: 毎月繰り返し
      for (let month = 0; month < 12; month++) {
        const dueMonth = month + schedule.offsetMonths
        const dueYear = year + Math.floor(dueMonth / 12)
        const normalizedMonth = ((dueMonth % 12) + 12) % 12
        if (dueYear !== year) continue
        const seasonalFactor = schedule.seasonality[month] ?? 1
        const amount = Math.round(schedule.amount * seasonalFactor)
        events.push({
          id: `${schedule.id}-${year}-${normalizedMonth + 1}`,
          entryId: schedule.id,
          partner: schedule.partner,
          description: schedule.description,
          amount,
          type: schedule.type,
          category: schedule.category,
          cycle: schedule.cycle,
          dueDate: new Date(dueYear, normalizedMonth, schedule.day),
          invoiceMonth: month,
          tags: schedule.tags.length > 0 ? schedule.tags : undefined,
        })
      }
    }
  }

  return events.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}


export function FinanceFlow({ initialTab = "overview" }: FinanceFlowProps) {
  const [totalAssets, setTotalAssets] = useState(15_000_000)
  const [editingTotalAssets, setEditingTotalAssets] = useState(false)
  const [totalAssetsInput, setTotalAssetsInput] = useState("")
  const [overviewStats, setOverviewStats] = useState<FinanceOverviewStats | null>(null)
  const [reservePolicies, setReservePolicies] = useState<ReservePolicyDTO[]>([])
  const [reserveSettings, setReserveSettings] = useState<Record<string, number>>({})
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [reserveLoading, setReserveLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [ganttMode, setGanttMode] = useState<"monthly" | "yearly">("monthly")
  const [selectedEvent, setSelectedEvent] = useState<EntryOccurrence | null>(null)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [newSale, setNewSale] = useState({ partner: "", amount: 0, cycle: "当月末払い" })
  const [schedules, setSchedules] = useState<RecurringEntry[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)

  useEffect(() => {
    getGanttEntriesAction().then((result) => {
      if (result.success) setSchedules(result.data)
      setSchedulesLoading(false)
    })
  }, [])

  useEffect(() => {
    getFinanceOverviewStatsAction().then((result) => {
      if (result.success) {
        setTotalAssets(result.data.totalAssetsYen)
        setOverviewStats(result.data)
      }
      setOverviewLoading(false)
    })
  }, [])

  useEffect(() => {
    getReservePoliciesAction().then((result) => {
      if (result.success) {
        setReservePolicies(result.data)
        setReserveSettings(Object.fromEntries(result.data.map((p) => [p.id, p.percent])))
      }
      setReserveLoading(false)
    })
  }, [])

  const totalReservePercent = Object.values(reserveSettings).reduce((a, b) => a + b, 0)
  const reserveAmount = Math.round(totalAssets * (totalReservePercent / 100))
  const disposableBudget = totalAssets - reserveAmount

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const startEditTotalAssets = () => {
    setTotalAssetsInput(String(totalAssets))
    setEditingTotalAssets(true)
  }

  const commitTotalAssets = async () => {
    const parsed = parseInt(totalAssetsInput.replace(/[^0-9]/g, ""), 10)
    if (!isNaN(parsed) && parsed >= 0) {
      setTotalAssets(parsed)
      await updateTotalAssetsYenAction(parsed)
    }
    setEditingTotalAssets(false)
  }

  const updateReserveSetting = (id: string, value: number) => {
    setReserveSettings((prev) => ({ ...prev, [id]: value }))
    updateReservePolicyAction(id, value)
  }

  const monthName = currentMonth.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })
  const yearLabel = `${viewYear}年`

  const prevMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(next)
    setViewYear(next.getFullYear())
  }

  const nextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(next)
    setViewYear(next.getFullYear())
  }

  const changeYear = (delta: number) => {
    const nextYear = viewYear + delta
    setViewYear(nextYear)
    setCurrentMonth(new Date(nextYear, currentMonth.getMonth(), 1))
  }

  const yearlyEvents = useMemo(() => expandSchedules(viewYear, schedules), [viewYear, schedules])

  const monthlyEvents = useMemo(
    () => yearlyEvents.filter((event) => event.dueDate.getMonth() === currentMonth.getMonth()),
    [yearlyEvents, currentMonth],
  )

  const monthlyEventsSorted = useMemo(
    () => [...monthlyEvents].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
    [monthlyEvents],
  )

  const monthlyTotals = useMemo(
    () =>
      monthlyEvents.reduce(
        (acc, event) => {
          if (event.type === "income") {
            acc.income += event.amount
          } else {
            acc.expense += event.amount
            if (event.category.includes("固定")) {
              acc.fixed += event.amount
            }
          }
          return acc
        },
        { income: 0, expense: 0, fixed: 0 },
      ),
    [monthlyEvents],
  )

  const yearlyTotals = useMemo(
    () =>
      yearlyEvents.reduce(
        (acc, event) => {
          if (event.type === "income") {
            acc.income += event.amount
          } else {
            acc.expense += event.amount
            if (event.category.includes("固定")) {
              acc.fixed += event.amount
            }
          }
          return acc
        },
        { income: 0, expense: 0, fixed: 0 },
      ),
    [yearlyEvents],
  )

  const monthlySummary = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => {
        const monthEvents = yearlyEvents.filter((event) => event.dueDate.getMonth() === month)
        const income = monthEvents.filter((e) => e.type === "income").reduce((sum, e) => sum + e.amount, 0)
        const expense = monthEvents.filter((e) => e.type === "expense").reduce((sum, e) => sum + e.amount, 0)
        const fixed = monthEvents
          .filter((e) => e.category.includes("固定"))
          .reduce((sum, e) => sum + e.amount, 0)

        return {
          month,
          income,
          expense,
          fixed,
          net: income - expense,
        }
      }),
    [yearlyEvents],
  )

  const cycleSummary = useMemo(() => {
    const summary: Record<string, { income: number; expense: number }> = {}
    monthlyEvents.forEach((event) => {
      if (!summary[event.cycle]) {
        summary[event.cycle] = { income: 0, expense: 0 }
      }
      if (event.type === "income") {
        summary[event.cycle].income += event.amount
      } else {
        summary[event.cycle].expense += event.amount
      }
    })
    return summary
  }, [monthlyEvents])

  const getPageTitle = () => {
    switch (initialTab) {
      case "reserve":
        return "内部留保設定"
      case "gantt":
        return "ガントチャート"
      default:
        return "ファイナンスフロー"
    }
  }

  const getPageDescription = () => {
    switch (initialTab) {
      case "reserve":
        return "詳細な内部留保の設定とカスタマイズ"
      case "gantt":
        return "月次/年間ガントで振込サイト・固定費を一目管理"
      default:
        return "キャッシュフロー管理と可処分予算計算"
    }
  }

  const fiscalYearLabel = overviewStats ? `今期(${overviewStats.fiscalYear}年度)` : "今期"
  const inventoryColumnSummaries = [
    {
      id: "sales",
      title: `${fiscalYearLabel} 売上/粗利`,
      value: overviewStats?.salesTotalYen ?? 6_170_000,
      description: `${fiscalYearLabel}の純売上金額合計 (view: 売上・粗利)`,
      icon: BarChart3,
    },
    {
      id: "payables",
      title: `${fiscalYearLabel} 仕入/支払`,
      value: overviewStats?.payablesTotalYen ?? 3_720_000,
      description: `${fiscalYearLabel}の支払額合計 (view: 仕入・支払)`,
      icon: Wallet,
    },
    {
      id: "receivables",
      title: `${fiscalYearLabel} 請求/入金`,
      value: overviewStats?.receivablesTotalYen ?? 7_850_000,
      description: `${fiscalYearLabel}の入金額合計 (view: 請求・入金)`,
      icon: Building2,
    },
  ]

  const reserveColors = ["#22c55e", "#f97316", "#a855f7", "#ec4899"]

  const assetDistributionData = [
    { name: "可処分予算", value: disposableBudget, color: "#345fe1" },
    ...reservePolicies.map((p, index) => ({
      name: p.name,
      value: Math.round(totalAssets * ((reserveSettings[p.id] ?? p.percent) / 100)),
      color: reserveColors[index] ?? "#94a3b8",
    })),
  ]

  const reserveBreakdownData = reservePolicies.map((p, index) => ({
    name: p.name,
    value: Math.round(totalAssets * ((reserveSettings[p.id] ?? p.percent) / 100)),
    percent: reserveSettings[p.id] ?? p.percent,
    color: ["#345fe1", "#22c55e", "#f97316", "#a855f7"][index],
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
          <p className="font-medium text-foreground">{payload[0].name}</p>
          <p className="text-[#345fe1] font-bold">{formatCurrency(payload[0].value)}</p>
          {payload[0].payload.percent && <p className="text-muted-foreground text-sm">{payload[0].payload.percent}%</p>}
        </div>
      )
    }
    return null
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#345fe1]" />
              資産配分
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {assetDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">総資産</p>
                {!editingTotalAssets && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditTotalAssets}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
              {editingTotalAssets ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="text-xl font-bold text-center"
                    value={totalAssetsInput}
                    onChange={(e) => setTotalAssetsInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitTotalAssets() }}
                    autoFocus
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={commitTotalAssets}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-foreground text-center">{formatCurrency(totalAssets)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reserve Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#345fe1]" />
              内部留保内訳
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reserveBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent}%`}
                    labelLine={false}
                  >
                    {reserveBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-muted/30 rounded-xl text-center">
                <p className="text-sm text-muted-foreground">内部留保合計</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(reserveAmount)}</p>
                <p className="text-sm text-[#345fe1]">{totalReservePercent}%</p>
              </div>
              <div className="p-3 bg-[#345fe1]/10 rounded-xl text-center">
                <p className="text-sm text-muted-foreground">可処分予算</p>
                <p className="text-xl font-bold text-[#345fe1]">{formatCurrency(disposableBudget)}</p>
                <p className="text-sm text-[#345fe1]">{100 - totalReservePercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Cash Flow Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              当月キャッシュイン/アウトの流れ
            </CardTitle>
            <span className="text-xs text-muted-foreground">{monthName}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            当月の入金・支払い・固定費・差引をひと目で把握できます。
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#345fe1]/30 bg-[#345fe1]/10 p-4">
              <p className="text-xs text-muted-foreground">当月入金</p>
              <p className="text-xl font-bold text-[#345fe1]">{formatCurrency(monthlyTotals.income)}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">当月支払い</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(monthlyTotals.expense)}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">固定費（PL）</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(monthlyTotals.fixed)}</p>
            </div>
            <div className="rounded-xl border border-[#345fe1]/30 bg-linear-to-br from-[#345fe1] to-[#2a4bb3] p-4 text-white">
              <p className="text-xs text-white/80">当月差引</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyTotals.income - monthlyTotals.expense)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <InventoryTable embedded />
    </div>
  )

  const renderReserve = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">内部留保の詳細設定</CardTitle>
      </CardHeader>
      <CardContent>
        {reserveLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : (
          <div className="space-y-6">
            {reservePolicies.map((cat) => (
              <div key={cat.id} className="p-4 border border-border rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#345fe1]">{reserveSettings[cat.id] ?? cat.percent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(Math.round(totalAssets * ((reserveSettings[cat.id] ?? cat.percent) / 100)))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[reserveSettings[cat.id] ?? cat.percent]}
                    onValueChange={(value: number[]) => updateReserveSetting(cat.id, value[0])}
                    max={30}
                    step={1}
                    className="flex-1 [&_[data-slot=slider-track]]:bg-[#345fe1]/15 [&_[data-slot=slider-range]]:bg-[#345fe1] [&_[data-slot=slider-thumb]]:border-[#345fe1] [&_[data-slot=slider-thumb]]:focus-visible:ring-[#345fe1]/30 [&_[data-slot=slider-thumb]]:hover:ring-[#345fe1]/20"
                  />
                  <Input
                    type="number"
                    value={reserveSettings[cat.id] ?? cat.percent}
                    onChange={(e) => updateReserveSetting(cat.id, Number(e.target.value))}
                    className="w-20 text-right"
                    min={0}
                    max={30}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            ))}

            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="font-medium">内部留保合計</p>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(reserveAmount)}</p>
                  <p className="text-sm text-muted-foreground">{totalReservePercent}%</p>
                </div>
              </div>
              <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden flex">
                {reservePolicies.map((cat, index) => (
                  <div
                    key={cat.id}
                    className={cn(
                      "h-full",
                      index === 0 && "bg-[#345fe1]",
                      index === 1 && "bg-[#22c55e]",
                      index === 2 && "bg-[#f97316]",
                      index === 3 && "bg-[#a855f7]",
                    )}
                    style={{ width: `${((reserveSettings[cat.id] ?? cat.percent) / totalReservePercent) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {reservePolicies.map((cat, index) => (
                  <div key={cat.id} className="flex items-center gap-2 text-xs">
                    <div
                      className={cn(
                        "w-3 h-3 rounded",
                        index === 0 && "bg-[#345fe1]",
                        index === 1 && "bg-[#22c55e]",
                        index === 2 && "bg-[#f97316]",
                        index === 3 && "bg-[#a855f7]",
                      )}
                    />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderGantt = () => {
    const yearlyRows = schedules.map((schedule) => ({
      ...schedule,
      events: yearlyEvents.filter((event) => event.entryId === schedule.id),
    }))

    // 年間テーブル用: (partner, type) で集約し、同一取引先が複数行にならないようにする
    type GroupedYearlyRow = {
      key: string
      partner: string
      type: "income" | "expense"
      category: string
      cycle: string
      isFixed: boolean
      monthData: Map<number, { amount: number; event: EntryOccurrence }>
    }
    const groupedYearlyRows: GroupedYearlyRow[] = []
    const groupedMap = new Map<string, GroupedYearlyRow>()
    for (const row of yearlyRows) {
      const key = `${row.partner}||${row.type}`
      if (!groupedMap.has(key)) {
        const g: GroupedYearlyRow = {
          key,
          partner: row.partner,
          type: row.type,
          category: row.category,
          cycle: row.cycle,
          isFixed: row.isFixed,
          monthData: new Map(),
        }
        groupedMap.set(key, g)
        groupedYearlyRows.push(g)
      }
      const g = groupedMap.get(key)!
      for (const event of row.events) {
        const month = event.dueDate.getMonth()
        const existing = g.monthData.get(month)
        if (existing) {
          existing.amount += event.amount
        } else {
          g.monthData.set(month, { amount: event.amount, event })
        }
      }
    }

    const monthlyLegend = (
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#345fe1]" />
          <span>入金</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>仕入・支払い</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>固定費</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          <span>横スクロールでスマホ確認</span>
        </div>
      </div>
    )

    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const checkpoints = [1, 5, 15, 20, 25, lastDayOfMonth]
      .filter((day, index, array) => array.indexOf(day) === index)
      .map((day, index, array) => ({
        day,
        label: index === array.length - 1 ? "月末" : `${day}日`,
      }))

    // 期初残高（totalAssets）＋ 前月末までの累積純収支 → 当月1日時点の繰越残高
    const currentMonthIndex = currentMonth.getMonth()
    const monthOpeningBalance =
      totalAssets +
      monthlySummary.slice(0, currentMonthIndex).reduce((sum, m) => sum + m.net, 0)

    const checkpointTotals = checkpoints.map(({ day }) =>
      monthlyEvents.reduce((sum, event) => {
        if (event.dueDate.getDate() <= day) {
          return sum + (event.type === "income" ? event.amount : -event.amount)
        }
        return sum
      }, monthOpeningBalance),
    )

    const checkpointRows = checkpoints.map((checkpoint, index) => ({
      ...checkpoint,
      total: checkpointTotals[index],
    }))

    const monthlyRows = (() => {
      if (monthlyEventsSorted.length === 0) {
        return checkpointRows.map((checkpoint) => ({ type: "checkpoint" as const, checkpoint }))
      }
      const rows: Array<
        | { type: "event"; event: EntryOccurrence }
        | { type: "checkpoint"; checkpoint: (typeof checkpointRows)[number] }
      > = []
      let checkpointIndex = 0
      monthlyEventsSorted.forEach((event) => {
        const day = event.dueDate.getDate()
        while (checkpointIndex < checkpointRows.length && day > checkpointRows[checkpointIndex].day) {
          rows.push({ type: "checkpoint", checkpoint: checkpointRows[checkpointIndex] })
          checkpointIndex += 1
        }
        rows.push({ type: "event", event })
      })
      while (checkpointIndex < checkpointRows.length) {
        rows.push({ type: "checkpoint", checkpoint: checkpointRows[checkpointIndex] })
        checkpointIndex += 1
      }
      return rows
    })()

    const renderMonthly = () => (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} className="bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm min-w-30 text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={nextMonth} className="bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <span>サイト {Object.keys(cycleSummary).length} パターン</span>
            <span className="mx-2">・</span>
            <span>取引 {monthlyEvents.length} 件</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="bg-[#345fe1]/10 border-none">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">当月入金（売掛）</p>
              <p className="text-xl font-bold text-[#345fe1]">{formatCurrency(monthlyTotals.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">当月支払い</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(monthlyTotals.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">固定費（PL）</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(monthlyTotals.fixed)}</p>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-[#345fe1] to-[#2a4bb3] text-white">
            <CardContent className="pt-4">
              <p className="text-xs text-white/80">当月差引</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyTotals.income - monthlyTotals.expense)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-28">日付</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-32">サイト</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">取引先 / 内容</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground w-24">種別</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground w-32">金額</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row, index) =>
                row.type === "checkpoint" ? (
                  <tr
                    key={`checkpoint-${row.checkpoint.label}-${index}`}
                    className="bg-[#345fe1]/5 border-t border-[#345fe1]/20"
                  >
                    <td colSpan={5} className="py-2 px-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{row.checkpoint.label} 時点残高</span>
                        <span
                          className={cn(
                            "font-semibold",
                            row.checkpoint.total >= 0 ? "text-[#345fe1]" : "text-red-600",
                          )}
                        >
                          {formatCurrency(row.checkpoint.total)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={row.event.id}
                    className="border-t border-border/70 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedEvent(row.event)}
                  >
                    <td className="py-3 px-4 text-muted-foreground">
                      {row.event.dueDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-foreground">{row.event.cycle}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{row.event.partner}</span>
                        <span className="text-xs text-muted-foreground">{row.event.description}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          row.event.type === "income"
                            ? "text-[#345fe1]"
                            : row.event.category.includes("固定")
                              ? "text-amber-700"
                              : "text-red-600",
                        )}
                      >
                        {row.event.type === "income" ? "入金" : row.event.category.includes("固定") ? "固定費" : "支払い"}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "py-3 px-4 text-right font-semibold",
                        row.event.type === "income"
                          ? "text-[#345fe1]"
                          : row.event.category.includes("固定")
                            ? "text-amber-700"
                            : "text-red-600",
                      )}
                    >
                      {row.event.type === "income" ? "+" : "-"}
                      {formatCurrency(row.event.amount)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        {monthlyLegend}
      </div>
    )

    const renderYearly = () => (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeYear(-1)} className="bg-transparent">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm min-w-30 text-center">{yearLabel}</span>
            <Button variant="outline" size="icon" onClick={() => changeYear(1)} className="bg-transparent">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <span>主要取引先 {groupedYearlyRows.filter((r) => !r.isFixed).length} 件</span>
            <span className="mx-2">・</span>
            <span>固定費 {groupedYearlyRows.filter((r) => r.isFixed).length} 件</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-[#345fe1]/10 border-none">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">年間入金予定</p>
              <p className="text-xl font-bold text-[#345fe1]">{formatCurrency(yearlyTotals.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">年間支払い予定</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(yearlyTotals.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">固定費合計</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(yearlyTotals.fixed)}</p>
            </CardContent>
          </Card>
          <Card className="bg-linear-to-br from-[#345fe1] to-[#2a4bb3] text-white">
            <CardContent className="pt-4">
              <p className="text-xs text-white/80">年間差引</p>
              <p className="text-xl font-bold">{formatCurrency(yearlyTotals.income - yearlyTotals.expense)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {monthlySummary.map((item) => (
            <div key={item.month} className="p-3 rounded-xl border bg-muted/40">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.month + 1}月</span>
                <span>{formatCurrency(item.net)}</span>
              </div>
              <div className="mt-2 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-[#345fe1]">
                  <span>入金</span>
                  <span className="font-semibold">{formatCurrency(item.income)}</span>
                </div>
                <div className="flex items-center justify-between text-red-500">
                  <span>支払い</span>
                  <span className="font-semibold">{formatCurrency(item.expense)}</span>
                </div>
                <div className="flex items-center justify-between text-amber-600">
                  <span>固定費</span>
                  <span className="font-semibold">{formatCurrency(item.fixed)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <div className="min-w-350">
            <div className="grid grid-cols-[220px_repeat(12,minmax(80px,1fr))] bg-muted/50 text-xs font-medium">
              <div className="p-3 text-left sticky left-0 z-20 bg-muted/80 border-r border-border">
                取引先 / サイト
              </div>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="p-3 text-center">
                  {i + 1}月
                </div>
              ))}
            </div>

            {groupedYearlyRows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[220px_repeat(12,minmax(80px,1fr))] border-t border-border/70"
              >
                <div className="p-3 space-y-1 sticky left-0 z-10 bg-white border-r border-border">
                  <div className="text-sm font-semibold text-foreground">{row.partner}</div>
                  <div className="text-xs text-muted-foreground">{row.cycle}</div>
                </div>
                {Array.from({ length: 12 }, (_, month) => {
                  const data = row.monthData.get(month)
                  const colorClass =
                    row.type === "income" ? "bg-[#345fe1]" : row.category.includes("固定") ? "bg-amber-500" : "bg-red-500"
                  return (
                    <button
                      key={`${row.key}-${month}`}
                      onClick={() => data && setSelectedEvent({ ...data.event, amount: data.amount })}
                      disabled={!data}
                      className={cn(
                        "min-h-16 p-1.5 text-left border-l border-border/40 hover:bg-muted/40 transition-colors",
                        !data && "bg-muted/20 text-muted-foreground cursor-default",
                      )}
                    >
                      {data ? (
                        <div className={cn("h-full rounded-lg px-2 py-1 text-white space-y-1", colorClass)}>
                          <div className="text-[11px] font-semibold leading-tight">{formatCurrency(data.amount)}</div>
                          <div className="text-[10px] leading-tight opacity-90">
                            {data.event.dueDate.getMonth() + 1} / {data.event.dueDate.getDate()} ｜ {row.cycle}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px]">-</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#345fe1]" />
            <span>入金サイト</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>仕入・支払いサイト</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span>固定費</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span>年間カレンダーは横スクロール対応</span>
          </div>
        </div>
      </div>
    )

    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                ガントチャート（振込・支払いサイト）
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setGanttMode("monthly")}
                  className={cn(
                    ganttMode === "monthly"
                      ? "bg-[#345fe1] text-white border-[#345fe1]"
                      : "bg-white text-muted-foreground",
                  )}
                >
                  月次
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setGanttMode("yearly")}
                  className={cn(
                    ganttMode === "yearly"
                      ? "bg-[#345fe1] text-white border-[#345fe1]"
                      : "bg-white text-muted-foreground",
                  )}
                >
                  年間
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              主要取引先と数百社の小口まとめ、固定費を含めて月次/年間で一目チェック。クリックで詳細も確認できます。
            </p>
          </CardHeader>
          <CardContent>{ganttMode === "monthly" ? renderMonthly() : renderYearly()}</CardContent>
        </Card>

        <Dialog open={!!selectedEvent} onOpenChange={(open: boolean) => !open && setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent?.partner}</DialogTitle>
              <DialogDescription>
                {selectedEvent?.cycle}｜{selectedEvent?.category}
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">入出金日</p>
                    <p className="font-semibold">
                      {selectedEvent.dueDate.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">請求月 / 種別</p>
                    <p className="font-semibold">
                      {selectedEvent.invoiceMonth + 1}月請求 ｜{" "}
                      {selectedEvent.type === "income" ? "入金" : selectedEvent.category.includes("固定") ? "固定費" : "支払い"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">金額</p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        selectedEvent.type === "income"
                          ? "text-[#345fe1]"
                          : selectedEvent.category.includes("固定")
                            ? "text-amber-700"
                            : "text-red-600",
                      )}
                    >
                      {selectedEvent.type === "income" ? "+" : "-"}
                      {formatCurrency(selectedEvent.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">区分</p>
                    <p className="font-semibold">{selectedEvent.category}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">メモ</p>
                  <p className="font-medium text-foreground">{selectedEvent.description}</p>
                </div>
                {selectedEvent.tags?.length ? (
                  <div className="text-xs text-muted-foreground">{selectedEvent.tags.join(" ・ ")}</div>
                ) : null}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showSalesModal} onOpenChange={setShowSalesModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>売上登録（ダミー入力）</DialogTitle>
              <DialogDescription>請求先とサイト、入金予定を登録します。</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">請求先</p>
                <Input
                  placeholder="例）南青山セレクト"
                  value={newSale.partner}
                  onChange={(e) => setNewSale((prev) => ({ ...prev, partner: e.target.value }))}
                /> 
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">入金額</p>
                <Input
                  type="number"
                  value={newSale.amount}
                  onChange={(e) => setNewSale((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">サイト</p>
                <Select
                  value={newSale.cycle}
                  onValueChange={(v: string) => setNewSale((prev) => ({ ...prev, cycle: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="当月末払い">当月末払い</SelectItem>
                    <SelectItem value="翌月末払い">翌月末払い</SelectItem>
                    <SelectItem value="翌々月15日払い">翌々月15日払い</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowSalesModal(false)} className="w-full bg-[#345fe1] hover:bg-[#2a4bb3] text-white">
                保存（ダミー）
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="Finance Flow"
        title={getPageTitle()}
        description={getPageDescription()}
        icon={initialTab === "gantt" ? Calendar : TrendingUp}
      />

      {/* Quick Stats - Only show on overview */}
      {initialTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-[#345fe1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">総資産</p>
                    {!editingTotalAssets && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditTotalAssets}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {editingTotalAssets ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        className="text-xl font-bold"
                        value={totalAssetsInput}
                        onChange={(e) => setTotalAssetsInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitTotalAssets() }}
                        autoFocus
                      />
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={commitTotalAssets}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAssets)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Settings className="w-6 h-6 text-[#345fe1]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">内部留保合計</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(reserveAmount)}</p>
                  <p className="text-sm text-[#345fe1]">{totalReservePercent}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-[#345fe1] to-[#2a4bb3] text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">可処分予算</p>
                  <p className="text-2xl font-bold">{formatCurrency(disposableBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {initialTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {inventoryColumnSummaries.map((summary) => {
            const Icon = summary.icon
            return (
              <Card key={summary.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{summary.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex items-center gap-3">
                  <Icon className="w-10 h-10 text-[#345fe1]" />
                  <div>
                    <p className="font-semibold text-lg">{formatCurrency(summary.value)}</p>
                    <p className="text-xs text-muted-foreground">{summary.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {initialTab === "overview" && renderOverview()}
      {initialTab === "reserve" && renderReserve()}
      {initialTab === "gantt" && renderGantt()}
    </div>
  )
}
