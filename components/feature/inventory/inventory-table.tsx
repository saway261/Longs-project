"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Search, Download, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getInventoryHubDataAction } from "@/src/actions/finance-actions"
import type { InventoryHubData } from "@/src/actions/finance-actions"

type PeriodOption = "3m" | "6m" | "1y"

const PERIOD_LABELS: Record<PeriodOption, string> = {
  "3m": "直近3ヶ月",
  "6m": "直近6ヶ月",
  "1y": "直近1年",
}

// ─── 売上ツリー型 ────────────────────────────────────────
type Agg = { netQty: number; netSalesYen: number; grossProfitYen: number }

type ProductNode = Agg & { name: string; grossProfitRate: number }
type BrandNode   = Agg & { name: string; grossProfitRate: number; products: ProductNode[] }
type CustomerNode = Agg & { name: string; grossProfitRate: number; brands: BrandNode[] }

// ─── 集計済み行型 ────────────────────────────────────────
type AggPayablesRow = {
  vendorShort: string
  prevBalanceYen: number
  paymentYen: number
  netPurchaseYen: number
  purchaseTaxInYen: number
  monthEndBalanceYen: number
}

type AggReceivablesRow = {
  customerShort: string
  staffName: string
  receivedYen: number
  netSalesYen: number
  salesTaxInYen: number
  monthEndBalanceYen: number
  creditLimitBalanceYen: number
}

// ─── ヘルパー ────────────────────────────────────────────

const calcRate = (a: Agg) =>
  a.netSalesYen > 0 ? (a.grossProfitYen / a.netSalesYen) * 100 : 0

function buildSalesTree(rows: InventoryHubData["sales"]): CustomerNode[] {
  const customerMap = new Map<string, Map<string, Map<string, Agg>>>()

  for (const r of rows) {
    const customer = r.customerCategory1Name ?? "(不明)"
    const brand    = r.brandName   ?? "(不明)"
    const product  = r.productName1 ?? "(不明)"

    if (!customerMap.has(customer)) customerMap.set(customer, new Map())
    const brandMap = customerMap.get(customer)!
    if (!brandMap.has(brand)) brandMap.set(brand, new Map())
    const productMap = brandMap.get(brand)!

    const ex = productMap.get(product)
    if (ex) {
      ex.netQty        += r.netQty        ?? 0
      ex.netSalesYen   += r.netSalesYen   ?? 0
      ex.grossProfitYen += r.grossProfitYen ?? 0
    } else {
      productMap.set(product, {
        netQty:        r.netQty        ?? 0,
        netSalesYen:   r.netSalesYen   ?? 0,
        grossProfitYen: r.grossProfitYen ?? 0,
      })
    }
  }

  const sumAgg = (items: Agg[]): Agg =>
    items.reduce((a, b) => ({
      netQty:        a.netQty        + b.netQty,
      netSalesYen:   a.netSalesYen   + b.netSalesYen,
      grossProfitYen: a.grossProfitYen + b.grossProfitYen,
    }), { netQty: 0, netSalesYen: 0, grossProfitYen: 0 })

  return Array.from(customerMap.entries()).map(([customer, brandMap]) => {
    const brands: BrandNode[] = Array.from(brandMap.entries()).map(([brand, productMap]) => {
      const products: ProductNode[] = Array.from(productMap.entries()).map(([product, agg]) => ({
        name: product, ...agg, grossProfitRate: calcRate(agg),
      }))
      const agg = sumAgg(products)
      return { name: brand, ...agg, grossProfitRate: calcRate(agg), products }
    })
    const agg = sumAgg(brands)
    return { name: customer, ...agg, grossProfitRate: calcRate(agg), brands }
  })
}

/** 取引フロー金額はSUM、残高は最新月（先頭）の値を使用 */
function aggregatePayables(rows: InventoryHubData["payables"]): AggPayablesRow[] {
  const map = new Map<string, AggPayablesRow>()
  for (const r of rows) {
    const key = r.vendorShort ?? "(不明)"
    const ex = map.get(key)
    if (ex) {
      ex.paymentYen      += r.paymentYen      ?? 0
      ex.netPurchaseYen  += r.netPurchaseYen  ?? 0
      ex.purchaseTaxInYen += r.purchaseTaxInYen ?? 0
    } else {
      map.set(key, {
        vendorShort:       key,
        prevBalanceYen:    r.prevBalanceYen    ?? 0,
        paymentYen:        r.paymentYen        ?? 0,
        netPurchaseYen:    r.netPurchaseYen    ?? 0,
        purchaseTaxInYen:  r.purchaseTaxInYen  ?? 0,
        monthEndBalanceYen: r.monthEndBalanceYen ?? 0,
      })
    }
  }
  return Array.from(map.values())
}

function aggregateReceivables(rows: InventoryHubData["receivables"]): AggReceivablesRow[] {
  const map = new Map<string, AggReceivablesRow>()
  for (const r of rows) {
    const key = r.customerShort ?? "(不明)"
    const ex = map.get(key)
    if (ex) {
      ex.receivedYen  += r.receivedYen  ?? 0
      ex.netSalesYen  += r.netSalesYen  ?? 0
      ex.salesTaxInYen += r.salesTaxInYen ?? 0
    } else {
      map.set(key, {
        customerShort:        key,
        staffName:            r.staffName            ?? "-",
        receivedYen:          r.receivedYen          ?? 0,
        netSalesYen:          r.netSalesYen          ?? 0,
        salesTaxInYen:        r.salesTaxInYen        ?? 0,
        monthEndBalanceYen:   r.monthEndBalanceYen   ?? 0,
        creditLimitBalanceYen: r.creditLimitBalanceYen ?? 0,
      })
    }
  }
  return Array.from(map.values())
}

const fmt  = (n: number) => new Intl.NumberFormat("ja-JP").format(n)
const fmtY = (n: number) => `¥${fmt(n)}`
const fmtR = (n: number) => `${n.toFixed(1)}%`

// ─── コンポーネント ──────────────────────────────────────
type InventoryTableProps = { embedded?: boolean }

export function InventoryTable({ embedded = false }: InventoryTableProps) {
  const [period, setPeriod]   = useState<PeriodOption>("3m")
  const [loading, setLoading] = useState(true)
  const [hubData, setHubData] = useState<InventoryHubData | null>(null)
  const [search,  setSearch]  = useState("")
  const [activeView, setActiveView] = useState<"sales" | "payables" | "receivables">("sales")
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [expandedBrands,    setExpandedBrands]    = useState<Set<string>>(new Set())

  // 期間変更でデータ取得
  useEffect(() => {
    setLoading(true)
    getInventoryHubDataAction(period).then((res) => {
      if (res.success) setHubData(res.data)
      setLoading(false)
    })
  }, [period])

  // ビュー切り替えで展開状態リセット
  useEffect(() => {
    setExpandedCustomers(new Set())
    setExpandedBrands(new Set())
  }, [activeView, period])

  // 売上ツリー（検索フィルタ適用後）
  const filteredSalesRows = useMemo(() => {
    if (!hubData) return []
    const q = search.toLowerCase()
    if (!q) return hubData.sales
    return hubData.sales.filter((r) =>
      [r.customerCategory1Name, r.brandName, r.itemName, r.productName1, r.staffName]
        .some((v) => v?.toLowerCase().includes(q)),
    )
  }, [hubData, search])

  const salesTree = useMemo(() => buildSalesTree(filteredSalesRows), [filteredSalesRows])

  // 支払・入金（集計）
  const filteredPayables = useMemo(() => {
    if (!hubData) return []
    const q = search.toLowerCase()
    const rows = q
      ? hubData.payables.filter((r) => r.vendorShort?.toLowerCase().includes(q))
      : hubData.payables
    return aggregatePayables(rows)
  }, [hubData, search])

  const filteredReceivables = useMemo(() => {
    if (!hubData) return []
    const q = search.toLowerCase()
    const rows = q
      ? hubData.receivables.filter((r) =>
          [r.customerShort, r.staffName].some((v) => v?.toLowerCase().includes(q)),
        )
      : hubData.receivables
    return aggregateReceivables(rows)
  }, [hubData, search])

  // サマリー合計
  const salesTotals = useMemo(
    () => salesTree.reduce((a, c) => ({ netSalesYen: a.netSalesYen + c.netSalesYen, grossProfitYen: a.grossProfitYen + c.grossProfitYen }), { netSalesYen: 0, grossProfitYen: 0 }),
    [salesTree],
  )
  const payTotals = useMemo(
    () => filteredPayables.reduce((a, r) => ({ paymentYen: a.paymentYen + r.paymentYen, purchaseTaxInYen: a.purchaseTaxInYen + r.purchaseTaxInYen }), { paymentYen: 0, purchaseTaxInYen: 0 }),
    [filteredPayables],
  )
  const recTotals = useMemo(
    () => filteredReceivables.reduce((a, r) => ({ receivedYen: a.receivedYen + r.receivedYen, salesTaxInYen: a.salesTaxInYen + r.salesTaxInYen }), { receivedYen: 0, salesTaxInYen: 0 }),
    [filteredReceivables],
  )

  const hasData =
    activeView === "sales"       ? salesTree.length > 0
    : activeView === "payables"  ? filteredPayables.length > 0
    : filteredReceivables.length > 0

  const toggleCustomer = (name: string) =>
    setExpandedCustomers((prev) => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s })

  const toggleBrand = (cName: string, bName: string) => {
    const key = `${cName}::${bName}`
    setExpandedBrands((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })
  }

  const VIEW_TABS = [
    { key: "sales"       as const, label: "売上・粗利 (得意先/ブランド軸)" },
    { key: "payables"    as const, label: "仕入・支払 (支払先別)" },
    { key: "receivables" as const, label: "請求・入金 (請求先別)" },
  ]

  return (
    <div className={cn("space-y-6", embedded ? "" : "p-6")}>
      {/* ── ヘッダー ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Inventory</p>
          <h2 className="text-2xl font-bold text-foreground">在庫サマリー</h2>
          <p className="text-muted-foreground text-sm">
            取得カラムに合わせて売上・仕入・請求を切り替え。取引先・ブランド単位で実績を確認できます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 集計期間 */}
          <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
            {(["3m", "6m", "1y"] as PeriodOption[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  p === period
                    ? "bg-[#345fe1] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            CSV出力
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <CardTitle className="text-base">
            {VIEW_TABS.find((v) => v.key === activeView)?.label}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {VIEW_TABS.map((view) => (
              <Button
                key={view.key}
                variant={view.key === activeView ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView(view.key)}
                className={cn(
                  view.key === activeView && "bg-[#345fe1] text-white hover:bg-[#2a4bb3] border-transparent",
                )}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                activeView === "sales"       ? "得意先 / ブランド / 商品名 で検索"
                : activeView === "payables"  ? "支払先で検索"
                : "請求先 / 担当者で検索"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* サマリーカード */}
          {!loading && hasData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeView === "sales" && (
                <>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">純売上金額合計</p>
                    <p className="text-lg font-bold">{fmtY(salesTotals.netSalesYen)}</p>
                  </CardContent></Card>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">粗利金額合計</p>
                    <p className="text-lg font-bold">{fmtY(salesTotals.grossProfitYen)}</p>
                  </CardContent></Card>
                </>
              )}
              {activeView === "payables" && (
                <>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">支払額合計</p>
                    <p className="text-lg font-bold">{fmtY(payTotals.paymentYen)}</p>
                  </CardContent></Card>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">税込仕入金額合計</p>
                    <p className="text-lg font-bold">{fmtY(payTotals.purchaseTaxInYen)}</p>
                  </CardContent></Card>
                </>
              )}
              {activeView === "receivables" && (
                <>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">入金額合計</p>
                    <p className="text-lg font-bold">{fmtY(recTotals.receivedYen)}</p>
                  </CardContent></Card>
                  <Card className="bg-muted/40"><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">税込売上金額合計</p>
                    <p className="text-lg font-bold">{fmtY(recTotals.salesTaxInYen)}</p>
                  </CardContent></Card>
                </>
              )}
            </div>
          )}

          {/* テーブル */}
          <div className="overflow-x-auto rounded-lg border">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                読み込み中...
              </div>
            ) : !hasData ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                {PERIOD_LABELS[period]}のデータがありません
              </div>

            ) : activeView === "sales" ? (
              /* ── 売上ツリーテーブル ── */
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">名称</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">純売上数量</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">純売上金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">粗利金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">粗利率(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {salesTree.map((customer) => {
                    const isCustOpen = expandedCustomers.has(customer.name)
                    return (
                      <Fragment key={`c-${customer.name}`}>
                        {/* 得意先行 */}
                        <tr className="border-t border-border/70 bg-muted/10 hover:bg-muted/30">
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleCustomer(customer.name)}
                              className="flex items-center gap-1.5 text-left font-semibold text-foreground hover:text-[#345fe1] transition-colors"
                            >
                              {isCustOpen
                                ? <ChevronDown  className="w-4 h-4 shrink-0 text-[#345fe1]" />
                                : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                              }
                              {customer.name}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">{fmt(customer.netQty)}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">{fmtY(customer.netSalesYen)}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">{fmtY(customer.grossProfitYen)}</td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap font-medium">{fmtR(customer.grossProfitRate)}</td>
                        </tr>

                        {/* ブランド行 */}
                        {isCustOpen && customer.brands.map((brand) => {
                          const brandKey  = `${customer.name}::${brand.name}`
                          const isBrandOpen = expandedBrands.has(brandKey)
                          return (
                            <Fragment key={`b-${brandKey}`}>
                              <tr className="border-t border-border/50 hover:bg-muted/20">
                                <td className="pl-10 pr-4 py-2 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => toggleBrand(customer.name, brand.name)}
                                    className="flex items-center gap-1.5 text-left text-foreground hover:text-[#345fe1] transition-colors"
                                  >
                                    {isBrandOpen
                                      ? <ChevronDown  className="w-3.5 h-3.5 shrink-0 text-[#345fe1]" />
                                      : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                    }
                                    {brand.name}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-right whitespace-nowrap text-muted-foreground">{fmt(brand.netQty)}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap text-muted-foreground">{fmtY(brand.netSalesYen)}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap text-muted-foreground">{fmtY(brand.grossProfitYen)}</td>
                                <td className="px-4 py-2 text-right whitespace-nowrap text-muted-foreground">{fmtR(brand.grossProfitRate)}</td>
                              </tr>

                              {/* 商品行 */}
                              {isBrandOpen && brand.products.map((product, pi) => (
                                <tr key={`p-${brandKey}-${pi}`} className="border-t border-border/30 hover:bg-muted/10">
                                  <td className="pl-[4.5rem] pr-4 py-1.5 whitespace-nowrap text-xs text-muted-foreground">{product.name}</td>
                                  <td className="px-4 py-1.5 text-right whitespace-nowrap text-xs text-muted-foreground">{fmt(product.netQty)}</td>
                                  <td className="px-4 py-1.5 text-right whitespace-nowrap text-xs text-muted-foreground">{fmtY(product.netSalesYen)}</td>
                                  <td className="px-4 py-1.5 text-right whitespace-nowrap text-xs text-muted-foreground">{fmtY(product.grossProfitYen)}</td>
                                  <td className="px-4 py-1.5 text-right whitespace-nowrap text-xs text-muted-foreground">{fmtR(product.grossProfitRate)}</td>
                                </tr>
                              ))}
                            </Fragment>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>

            ) : activeView === "payables" ? (
              /* ── 仕入・支払テーブル ── */
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">支払先</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">前月末残高</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">支払額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">純仕入金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">税込仕入金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">当月末残高</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayables.map((row, i) => (
                    <tr key={i} className="border-t border-border/70 hover:bg-muted/40">
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">{row.vendorShort}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.prevBalanceYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.paymentYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.netPurchaseYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.purchaseTaxInYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.monthEndBalanceYen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            ) : (
              /* ── 請求・入金テーブル ── */
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">請求先</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">担当者</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">入金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">純売上金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">税込売上金額</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">当月末残高</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">与信枠残高</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceivables.map((row, i) => (
                    <tr key={i} className="border-t border-border/70 hover:bg-muted/40">
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">{row.customerShort}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{row.staffName}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.receivedYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.netSalesYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.salesTaxInYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.monthEndBalanceYen)}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">{fmtY(row.creditLimitBalanceYen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
