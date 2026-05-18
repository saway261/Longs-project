"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Settings2, Plus, Trash2, Loader2, RefreshCcw, SlidersHorizontal, Wallet, Store } from "lucide-react"
import { PageHeader } from "@/components/feature/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getInventoryTurnoverPeriodAction,
  setInventoryTurnoverPeriodAction,
  getReservePoliciesAction,
  saveReservePoliciesAction,
  getRecurringEntriesAction,
  saveRecurringEntriesAction,
} from "@/src/actions/settings-actions"
import type { CategoryDTO, ReservePolicyDTO, RecurringEntryDTO } from "@/src/actions/settings-actions"
import {
  getSuppliersAction,
  updateSupplierPaymentTermsAction,
  getCustomersAction,
  updateCustomerCollectionTermsAction,
  type SupplierDTO,
  type CustomerDTO,
} from "@/src/actions/partner-actions"

const TURNOVER_PERIOD_OPTIONS = [
  { value: 1, label: "1ヶ月" },
  { value: 3, label: "3ヶ月" },
  { value: 6, label: "6ヶ月" },
  { value: 12, label: "12ヶ月（1年）" },
]

const CLOSING_DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `${i + 1}日` })),
  { value: 31, label: "末日" },
]
const MONTH_OFFSET_OPTIONS = [
  { value: 0, label: "当月" },
  { value: 1, label: "翌月" },
  { value: 2, label: "翌々月" },
]
const PAYMENT_DAY_OPTIONS = CLOSING_DAY_OPTIONS

type DraftRow = { key: string; id?: string; categoryCode: string; name: string; sellThroughDays: number }
type RecurringEntryDraftRow = Omit<RecurringEntryDTO, "id"> & { _key: string; id?: string }

export default function CalculationRulesPage() {
  // ── カテゴリ状態 ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryDTO[]>([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [isCategoryEditing, setIsCategoryEditing] = useState(false)
  const [draft, setDraft] = useState<DraftRow[]>([])
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({})

  // ── 在庫回転率計算期間状態 ────────────────────────────────────────────────
  const [turnoverPeriod, setTurnoverPeriod] = useState<number>(12)
  const [turnoverPeriodDraft, setTurnoverPeriodDraft] = useState<number>(12)
  const [isTurnoverEditing, setIsTurnoverEditing] = useState(false)
  const [turnoverLoading, setTurnoverLoading] = useState(true)
  const [turnoverSaving, setTurnoverSaving] = useState(false)
  const [turnoverError, setTurnoverError] = useState<string | null>(null)

  // ── 内部留保状態 ──────────────────────────────────────────────────────────
  const [reservePolicies, setReservePolicies] = useState<ReservePolicyDTO[]>([])
  const [reserveDraft, setReserveDraft] = useState<ReservePolicyDTO[]>([])
  const [isReserveEditing, setIsReserveEditing] = useState(false)
  const [reserveLoading, setReserveLoading] = useState(true)
  const [reserveSaving, setReserveSaving] = useState(false)
  const [reserveError, setReserveError] = useState<string | null>(null)

  // ── 固定費状態 ────────────────────────────────────────────────────────────
  const [fixedCosts, setFixedCosts] = useState<RecurringEntryDTO[]>([])
  const [fixedCostsDraft, setFixedCostsDraft] = useState<RecurringEntryDraftRow[]>([])
  const [isFixedEditing, setIsFixedEditing] = useState(false)
  const [fixedLoading, setFixedLoading] = useState(true)
  const [fixedSaving, setFixedSaving] = useState(false)
  const [fixedError, setFixedError] = useState<string | null>(null)

  // ── 取引先状態 ────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([])
  const [customers, setCustomers] = useState<CustomerDTO[]>([])
  const [partnersLoading, setPartnersLoading] = useState(true)
  const [savingPartnerId, setSavingPartnerId] = useState<string | null>(null)
  const [partnerError, setPartnerError] = useState<string | null>(null)
  const [supplierDrafts, setSupplierDrafts] = useState<Record<string, Partial<SupplierDTO>>>({})
  const [customerDrafts, setCustomerDrafts] = useState<Record<string, Partial<CustomerDTO>>>({})

  useEffect(() => {
    ;(async () => {
      const res = await getInventoryTurnoverPeriodAction()
      if (res.success) setTurnoverPeriod(res.months)
      setTurnoverLoading(false)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const res = await getReservePoliciesAction()
      if (res.success) setReservePolicies(res.data)
      setReserveLoading(false)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const res = await getRecurringEntriesAction()
      if (res.success) setFixedCosts(res.data)
      setFixedLoading(false)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      const [suppRes, custRes] = await Promise.all([getSuppliersAction(), getCustomersAction()])
      if (suppRes.success) setSuppliers(suppRes.data)
      if (custRes.success) setCustomers(custRes.data)
      setPartnersLoading(false)
    })()
  }, [])

  const handleTurnoverEdit = () => { setTurnoverPeriodDraft(turnoverPeriod); setTurnoverError(null); setIsTurnoverEditing(true) }
  const handleTurnoverSave = async () => {
    setTurnoverSaving(true)
    const res = await setInventoryTurnoverPeriodAction(turnoverPeriodDraft)
    setTurnoverSaving(false)
    if (res.success) {
      setTurnoverPeriod(turnoverPeriodDraft)
      setIsTurnoverEditing(false)
      setTurnoverError(null)
    } else {
      setTurnoverError(res.error)
    }
  }
  const handleTurnoverCancel = () => { setTurnoverPeriodDraft(turnoverPeriod); setTurnoverError(null); setIsTurnoverEditing(false) }

  const fetchCategories = useCallback(async () => {
    setCategoryLoading(true)
    setCategoryError(null)
    const res = await getCategoriesAction()
    if (res.success) {
      setCategories(res.data)
    } else {
      setCategoryError(res.error)
    }
    setCategoryLoading(false)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCategoryEdit = () => {
    setDraft(
      categories.map((c) => ({ key: c.id, id: c.id, categoryCode: c.categoryCode ?? "", name: c.name, sellThroughDays: c.sellThroughDays })),
    )
    setDeleteErrors({})
    setIsCategoryEditing(true)
  }

  const handleCategoryCancel = () => {
    setIsCategoryEditing(false)
    setDraft([])
    setDeleteErrors({})
  }

  const handleCategorySave = async () => {
    const errors: string[] = []
    const updated: CategoryDTO[] = []

    for (const row of draft) {
      if (row.id) {
        const original = categories.find((c) => c.id === row.id)
        if (original && original.name === row.name && original.sellThroughDays === row.sellThroughDays && (original.categoryCode ?? "") === row.categoryCode) {
          updated.push(original)
          continue
        }
        setSavingIds((s) => new Set(s).add(row.key))
        const res = await updateCategoryAction(row.id, row.name, row.sellThroughDays, row.categoryCode || null)
        setSavingIds((s) => { const n = new Set(s); n.delete(row.key); return n })
        if (res.success) {
          updated.push(res.data)
        } else {
          errors.push(`「${row.name}」: ${res.error}`)
          updated.push(original ?? { id: row.id, categoryCode: row.categoryCode || null, name: row.name, sellThroughDays: row.sellThroughDays })
        }
      } else {
        setSavingIds((s) => new Set(s).add(row.key))
        const res = await createCategoryAction(row.name, row.sellThroughDays, row.categoryCode || null)
        setSavingIds((s) => { const n = new Set(s); n.delete(row.key); return n })
        if (res.success) {
          updated.push(res.data)
        } else {
          errors.push(`「${row.name}」: ${res.error}`)
        }
      }
    }

    setCategories(updated)

    if (errors.length > 0) {
      setCategoryError(errors.join("\n"))
    } else {
      setCategoryError(null)
      setIsCategoryEditing(false)
      setDraft([])
    }
  }

  const handleAddDraftRow = () => {
    setDraft((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, categoryCode: "", name: "", sellThroughDays: 60 },
    ])
  }

  const handleDeleteCategory = async (row: DraftRow) => {
    if (!row.id) {
      setDraft((prev) => prev.filter((r) => r.key !== row.key))
      return
    }
    setSavingIds((s) => new Set(s).add(row.key))
    const res = await deleteCategoryAction(row.id)
    setSavingIds((s) => { const n = new Set(s); n.delete(row.key); return n })
    if (res.success) {
      setDraft((prev) => prev.filter((r) => r.key !== row.key))
      setCategories((prev) => prev.filter((c) => c.id !== row.id))
      setDeleteErrors((prev) => { const n = { ...prev }; delete n[row.key]; return n })
    } else {
      setDeleteErrors((prev) => ({ ...prev, [row.key]: res.error ?? "削除に失敗しました" }))
    }
  }

  const handleReserveEdit = () => { setReserveDraft(reservePolicies.map((i) => ({ ...i }))); setReserveError(null); setIsReserveEditing(true) }
  const handleReserveSave = async () => {
    setReserveSaving(true)
    setReserveError(null)
    const items = reserveDraft.map((i) => ({ id: i.id, percent: i.percent }))
    const res = await saveReservePoliciesAction(items)
    setReserveSaving(false)
    if (res.success) {
      setReservePolicies(res.data)
      setIsReserveEditing(false)
    } else {
      setReserveError(res.error)
    }
  }
  const handleReserveCancel = () => { setReserveDraft(reservePolicies.map((i) => ({ ...i }))); setReserveError(null); setIsReserveEditing(false) }

  const handleFixedEdit = () => {
    setFixedCostsDraft(fixedCosts.map((i) => ({ ...i, _key: i.id })))
    setFixedError(null)
    setIsFixedEditing(true)
  }
  const handleFixedSave = async () => {
    setFixedSaving(true)
    setFixedError(null)
    const items = fixedCostsDraft.map((i) => ({ id: i.id, description: i.description ?? "", amountYen: i.amountYen, dueDay: i.dueDay }))
    const res = await saveRecurringEntriesAction(items)
    setFixedSaving(false)
    if (res.success) {
      setFixedCosts(res.data)
      setIsFixedEditing(false)
    } else {
      setFixedError(res.error)
    }
  }
  const handleFixedCancel = () => {
    setFixedCostsDraft(fixedCosts.map((i) => ({ ...i, _key: i.id })))
    setFixedError(null)
    setIsFixedEditing(false)
  }
  const handleAddFixedCost = () => {
    setFixedCostsDraft((prev) => [...prev, { _key: `new-${Date.now()}`, description: "新規項目", amountYen: 0, category: "固定費", dueDay: 25, sortOrder: prev.length }])
  }

  const reserveView = isReserveEditing ? reserveDraft : reservePolicies
  const reserveTotal = reserveView.reduce((sum, item) => sum + item.percent, 0)

  const displayRows = isCategoryEditing ? draft : categories.map((c) => ({ key: c.id, id: c.id, categoryCode: c.categoryCode ?? "", name: c.name, sellThroughDays: c.sellThroughDays }))

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="ルール管理"
          description="カテゴリ別の売り切り期限や在庫回転率の計算期間など、計算ルールを管理します。"
          icon={SlidersHorizontal}
        />

        {/* ── カテゴリ別 売り切り期限設定 ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                カテゴリ別 売り切り期限設定
              </CardTitle>
              <div className="flex items-center gap-2">
                {isCategoryEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddDraftRow}>
                    <Plus className="w-4 h-4 mr-1" />
                    カテゴリを追加
                  </Button>
                )}
                {isCategoryEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCategoryCancel}>
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/80 text-white"
                      onClick={handleCategorySave}
                      disabled={savingIds.size > 0}
                    >
                      {savingIds.size > 0 && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      保存
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleCategoryEdit} disabled={categoryLoading}>
                    編集
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <>
                {categoryError && (
                  <p className="text-xs text-red-500 mb-3 whitespace-pre-line">{categoryError}</p>
                )}
                {displayRows.length === 0 && !isCategoryEditing && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    カテゴリがありません。「編集」→「カテゴリを追加」から追加してください。
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayRows.map((row) => (
                    <div key={row.key} className="p-3 border border-border rounded-lg space-y-2">
                      {isCategoryEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="カテゴリ名"
                              value={row.name}
                              onChange={(e) =>
                                setDraft((prev) =>
                                  prev.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)),
                                )
                              }
                              className="flex-1 text-sm font-semibold"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={savingIds.has(row.key)}
                              onClick={() => handleDeleteCategory(row)}
                            >
                              {savingIds.has(row.key) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-500" />
                              )}
                            </Button>
                          </div>
                          {deleteErrors[row.key] && (
                            <p className="text-xs text-red-500">{deleteErrors[row.key]}</p>
                          )}
                          <div>
                            <Input
                              placeholder="カテゴリコード（例: TOP, BOT）"
                              value={row.categoryCode}
                              onChange={(e) =>
                                setDraft((prev) =>
                                  prev.map((r) => (r.key === row.key ? { ...r, categoryCode: e.target.value } : r)),
                                )
                              }
                              className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">カテゴリコード（省略可）</p>
                          </div>
                          <div>
                            <Input
                              type="number"
                              min={1}
                              value={row.sellThroughDays}
                              onChange={(e) =>
                                setDraft((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, sellThroughDays: Number(e.target.value) } : r,
                                  ),
                                )
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">売り切り目標日数</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{row.name}</p>
                            {row.categoryCode && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                {row.categoryCode}
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-foreground">{row.sellThroughDays} 日</p>
                          <p className="text-xs text-muted-foreground">売り切り目標日数</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── 在庫回転率の計算期間設定 ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-primary" />
                在庫回転率の計算期間設定
              </CardTitle>
              <div className="flex items-center gap-2">
                {isTurnoverEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleTurnoverCancel} disabled={turnoverSaving}>
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/80 text-white"
                      onClick={handleTurnoverSave}
                      disabled={turnoverSaving}
                    >
                      {turnoverSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      保存
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleTurnoverEdit} disabled={turnoverLoading}>
                    編集
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              在庫回転率の算出に使用する基準期間を設定します。売上原価や平均在庫金額の集計範囲に反映されます。
            </p>
            {turnoverLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
            <>
            {turnoverError && <p className="text-xs text-red-500">{turnoverError}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TURNOVER_PERIOD_OPTIONS.map((option) => {
                const active = isTurnoverEditing
                  ? turnoverPeriodDraft === option.value
                  : turnoverPeriod === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!isTurnoverEditing}
                    onClick={() => isTurnoverEditing && setTurnoverPeriodDraft(option.value)}
                    className={[
                      "rounded-lg border p-4 text-center transition-colors",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground",
                      isTurnoverEditing && !active
                        ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                        : "",
                      !isTurnoverEditing ? "cursor-default" : "",
                    ].join(" ")}
                  >
                    <p className="text-lg font-bold">{option.label}</p>
                    {option.value === 12 && (
                      <p className="text-xs text-muted-foreground mt-1">デフォルト</p>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">現在の設定</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {TURNOVER_PERIOD_OPTIONS.find((o) => o.value === turnoverPeriod)?.label ?? `${turnoverPeriod}ヶ月`}
              </p>
            </div>
            </>
            )}
          </CardContent>
        </Card>

        {/* ── 内部留保の設定 ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                内部留保の設定
              </CardTitle>
              <div className="flex items-center gap-2">
                {isReserveEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleReserveCancel} disabled={reserveSaving}>
                      キャンセル
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/80 text-white" onClick={handleReserveSave} disabled={reserveSaving}>
                      {reserveSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      保存
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleReserveEdit} disabled={reserveLoading}>
                    編集
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reserveLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <>
                {reserveError && <p className="text-xs text-red-500 mb-3">{reserveError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reserveView.map((item, index) => (
                    <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        {isReserveEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={reserveDraft[index].percent}
                              onChange={(e) =>
                                setReserveDraft((prev) =>
                                  prev.map((row, idx) =>
                                    idx === index ? { ...row, percent: Number(e.target.value) } : row,
                                  ),
                                )
                              }
                              className="w-20 text-right"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-foreground">{item.percent}%</p>
                        )}
                      </div>
                      {isReserveEditing && (
                        <Slider
                          value={[reserveDraft[index].percent]}
                          onValueChange={(value: number[]) =>
                            setReserveDraft((prev) =>
                              prev.map((row, idx) => (idx === index ? { ...row, percent: value[0] } : row)),
                            )
                          }
                          max={100}
                          step={1}
                          className="[&_[data-slot=slider-track]]:bg-primary/15 [&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary [&_[data-slot=slider-thumb]]:focus-visible:ring-primary/30 [&_[data-slot=slider-thumb]]:hover:ring-primary/20"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">内部留保合計</p>
                    <p className="text-lg font-bold text-foreground">{reserveTotal}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">可処分予算目安</p>
                    <p className="text-lg font-bold text-primary">{Math.max(0, 100 - reserveTotal)}%</p>
                  </div>
                  {reserveTotal > 100 && (
                    <p className="text-xs text-red-500">合計が100%を超えています。</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── 固定費の設定 ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                固定費の設定
              </CardTitle>
              <div className="flex items-center gap-2">
                {isFixedEditing && (
                  <Button variant="outline" size="sm" onClick={handleAddFixedCost}>
                    <Plus className="w-4 h-4 mr-1" />
                    項目追加
                  </Button>
                )}
                {isFixedEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleFixedCancel} disabled={fixedSaving}>
                      キャンセル
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/80 text-white" onClick={handleFixedSave} disabled={fixedSaving}>
                      {fixedSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      保存
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleFixedEdit} disabled={fixedLoading}>
                    編集
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixedLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <>
                {fixedError && <p className="text-xs text-red-500 mb-3">{fixedError}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(isFixedEditing ? fixedCostsDraft : fixedCosts).map((item, index) => (
                    <div key={isFixedEditing ? (item as RecurringEntryDraftRow)._key : item.id} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {isFixedEditing ? (
                          <Input
                            value={fixedCostsDraft[index].description ?? ""}
                            onChange={(e) =>
                              setFixedCostsDraft((prev) =>
                                prev.map((cost, idx) => (idx === index ? { ...cost, description: e.target.value } : cost)),
                              )
                            }
                          />
                        ) : (
                          <p className="text-sm font-semibold">{item.description}</p>
                        )}
                        {isFixedEditing && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setFixedCostsDraft((prev) => prev.filter((_, idx) => idx !== index))}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">月額</p>
                          {isFixedEditing ? (
                            <Input
                              type="number"
                              value={fixedCostsDraft[index].amountYen}
                              onChange={(e) =>
                                setFixedCostsDraft((prev) =>
                                  prev.map((cost, idx) =>
                                    idx === index ? { ...cost, amountYen: Number(e.target.value) } : cost,
                                  ),
                                )
                              }
                            />
                          ) : (
                            <p className="text-lg font-bold text-foreground">
                              {new Intl.NumberFormat("ja-JP").format((item as RecurringEntryDTO).amountYen)} 円
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">支払日</p>
                          {isFixedEditing ? (
                            <Input
                              type="number"
                              value={fixedCostsDraft[index].dueDay}
                              onChange={(e) =>
                                setFixedCostsDraft((prev) =>
                                  prev.map((cost, idx) => (idx === index ? { ...cost, dueDay: Number(e.target.value) } : cost)),
                                )
                              }
                            />
                          ) : (
                            <p className="text-lg font-bold text-foreground">{(item as RecurringEntryDTO).dueDay} 日</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!isFixedEditing && fixedCosts.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-4">
                      固定費が登録されていません。「編集」→「項目追加」から追加してください。
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── 取引先設定 ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              取引先設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            {partnerError && <p className="text-xs text-red-500 mb-3">{partnerError}</p>}
            {partnersLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">読み込み中...</span>
              </div>
            ) : (
              <Tabs defaultValue="suppliers">
                <TabsList className="mb-4">
                  <TabsTrigger value="suppliers">仕入先</TabsTrigger>
                  <TabsTrigger value="customers">得意先</TabsTrigger>
                </TabsList>

                <TabsContent value="suppliers">
                  {suppliers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">仕入先が登録されていません。</p>
                  ) : (
                    <div className="rounded-md border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 text-xs text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">仕入先名</th>
                            <th className="px-3 py-2 text-left font-medium">締め日</th>
                            <th className="px-3 py-2 text-left font-medium">支払月</th>
                            <th className="px-3 py-2 text-left font-medium">支払日</th>
                            <th className="px-3 py-2 text-left font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {suppliers.map((s) => {
                            const sdraft = supplierDrafts[s.businessPartnerId] ?? {}
                            const closingDay = sdraft.closingDay ?? s.closingDay
                            const paymentMonthOffset = sdraft.paymentMonthOffset ?? s.paymentMonthOffset
                            const paymentDay = sdraft.paymentDay ?? s.paymentDay
                            const isSaving = savingPartnerId === s.businessPartnerId
                            const isDirty =
                              sdraft.closingDay !== undefined ||
                              sdraft.paymentMonthOffset !== undefined ||
                              sdraft.paymentDay !== undefined
                            return (
                              <tr key={s.businessPartnerId} className="hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">{s.name}</td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(closingDay)}
                                    onValueChange={(v: string) =>
                                      setSupplierDrafts((prev) => ({
                                        ...prev,
                                        [s.businessPartnerId]: { ...prev[s.businessPartnerId], closingDay: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CLOSING_DAY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(paymentMonthOffset)}
                                    onValueChange={(v: string) =>
                                      setSupplierDrafts((prev) => ({
                                        ...prev,
                                        [s.businessPartnerId]: { ...prev[s.businessPartnerId], paymentMonthOffset: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTH_OFFSET_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(paymentDay)}
                                    onValueChange={(v: string) =>
                                      setSupplierDrafts((prev) => ({
                                        ...prev,
                                        [s.businessPartnerId]: { ...prev[s.businessPartnerId], paymentDay: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PAYMENT_DAY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-primary hover:bg-primary/80 text-white"
                                    disabled={!isDirty || isSaving}
                                    onClick={async () => {
                                      setSavingPartnerId(s.businessPartnerId)
                                      setPartnerError(null)
                                      const res = await updateSupplierPaymentTermsAction(s.businessPartnerId, {
                                        closingDay,
                                        paymentMonthOffset,
                                        paymentDay,
                                      })
                                      setSavingPartnerId(null)
                                      if (res.success) {
                                        setSuppliers((prev) => prev.map((x) => (x.businessPartnerId === s.businessPartnerId ? res.data : x)))
                                        setSupplierDrafts((prev) => {
                                          const next = { ...prev }
                                          delete next[s.businessPartnerId]
                                          return next
                                        })
                                      } else {
                                        setPartnerError(res.error)
                                      }
                                    }}
                                  >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "保存"}
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="customers">
                  {customers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">得意先が登録されていません。</p>
                  ) : (
                    <div className="rounded-md border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/40 text-xs text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">得意先名</th>
                            <th className="px-3 py-2 text-left font-medium">締め日</th>
                            <th className="px-3 py-2 text-left font-medium">回収月</th>
                            <th className="px-3 py-2 text-left font-medium">回収日</th>
                            <th className="px-3 py-2 text-left font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/70">
                          {customers.map((c) => {
                            const cdraft = customerDrafts[c.businessPartnerId] ?? {}
                            const closingDay = cdraft.closingDay ?? c.closingDay
                            const collectionMonthOffset = cdraft.collectionMonthOffset ?? c.collectionMonthOffset
                            const collectionDay = cdraft.collectionDay ?? c.collectionDay
                            const isSaving = savingPartnerId === c.businessPartnerId
                            const isDirty =
                              cdraft.closingDay !== undefined ||
                              cdraft.collectionMonthOffset !== undefined ||
                              cdraft.collectionDay !== undefined
                            return (
                              <tr key={c.businessPartnerId} className="hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">{c.name}</td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(closingDay)}
                                    onValueChange={(v: string) =>
                                      setCustomerDrafts((prev) => ({
                                        ...prev,
                                        [c.businessPartnerId]: { ...prev[c.businessPartnerId], closingDay: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CLOSING_DAY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(collectionMonthOffset)}
                                    onValueChange={(v: string) =>
                                      setCustomerDrafts((prev) => ({
                                        ...prev,
                                        [c.businessPartnerId]: { ...prev[c.businessPartnerId], collectionMonthOffset: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTH_OFFSET_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={String(collectionDay)}
                                    onValueChange={(v: string) =>
                                      setCustomerDrafts((prev) => ({
                                        ...prev,
                                        [c.businessPartnerId]: { ...prev[c.businessPartnerId], collectionDay: Number(v) },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-24 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PAYMENT_DAY_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-primary hover:bg-primary/80 text-white"
                                    disabled={!isDirty || isSaving}
                                    onClick={async () => {
                                      setSavingPartnerId(c.businessPartnerId)
                                      setPartnerError(null)
                                      const res = await updateCustomerCollectionTermsAction(c.businessPartnerId, {
                                        closingDay,
                                        collectionMonthOffset,
                                        collectionDay,
                                      })
                                      setSavingPartnerId(null)
                                      if (res.success) {
                                        setCustomers((prev) => prev.map((x) => (x.businessPartnerId === c.businessPartnerId ? res.data : x)))
                                        setCustomerDrafts((prev) => {
                                          const next = { ...prev }
                                          delete next[c.businessPartnerId]
                                          return next
                                        })
                                      } else {
                                        setPartnerError(res.error)
                                      }
                                    }}
                                  >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "保存"}
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
