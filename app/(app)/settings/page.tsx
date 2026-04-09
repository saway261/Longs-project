"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Settings2, Plus, Trash2, Loader2, RefreshCcw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getInventoryTurnoverPeriodAction,
  setInventoryTurnoverPeriodAction,
  getReservePoliciesAction,
  saveReservePoliciesAction,
} from "@/src/actions/settings-actions"
import type { CategoryDTO, ReservePolicyDTO } from "@/src/actions/settings-actions"

// ── 在庫回転率の計算期間選択肢 ──────────────────────────────────────────────
const TURNOVER_PERIOD_OPTIONS = [
  { value: 1, label: "1ヶ月" },
  { value: 3, label: "3ヶ月" },
  { value: 6, label: "6ヶ月" },
  { value: 12, label: "12ヶ月（1年）" },
]

// ── カテゴリ編集用の行型（新規追加行は id が未定） ────────────────────────
type DraftRow = { key: string; id?: string; categoryCode: string; name: string; sellThroughDays: number }

export default function SettingsPage() {
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

  // ── 在庫回転率計算期間: DBから初期値ロード ────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const res = await getInventoryTurnoverPeriodAction()
      if (res.success) setTurnoverPeriod(res.months)
      setTurnoverLoading(false)
    })()
  }, [])

  // ── 内部留保: DBから初期値ロード ──────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const res = await getReservePoliciesAction()
      if (res.success) setReservePolicies(res.data)
      setReserveLoading(false)
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

  // ── カテゴリ取得 ──────────────────────────────────────────────────────────
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

  // ── カテゴリ編集開始 ──────────────────────────────────────────────────────
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

  // ── カテゴリ保存 ──────────────────────────────────────────────────────────
  const handleCategorySave = async () => {
    const errors: string[] = []
    const updated: CategoryDTO[] = []

    for (const row of draft) {
      if (row.id) {
        // 既存カテゴリ: 変更があれば更新
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
        // 新規カテゴリ
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

  // ── カテゴリ追加（ドラフト行） ────────────────────────────────────────────
  const handleAddDraftRow = () => {
    setDraft((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, categoryCode: "", name: "", sellThroughDays: 60 },
    ])
  }

  // ── カテゴリ削除 ──────────────────────────────────────────────────────────
  const handleDeleteCategory = async (row: DraftRow) => {
    if (!row.id) {
      // まだ保存されていない新規行はドラフトから除くだけ
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

  // ── 内部留保ハンドラ ──────────────────────────────────────────────────────
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

  const reserveView = isReserveEditing ? reserveDraft : reservePolicies
  const reserveTotal = reserveView.reduce((sum, item) => sum + item.percent, 0)

  const displayRows = isCategoryEditing ? draft : categories.map((c) => ({ key: c.id, id: c.id, categoryCode: c.categoryCode ?? "", name: c.name, sellThroughDays: c.sellThroughDays }))

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <PageHeader
          eyebrow="Settings"
          title="システム設定"
          description="カテゴリ別の売り切り期限など、基本設定を管理します。"
        />

        {/* ── カテゴリ別 売り切り期限設定 ── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#345fe1]" />
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
                      className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
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
                <RefreshCcw className="w-5 h-5 text-[#345fe1]" />
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
                      className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
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
                        ? "border-[#345fe1] bg-[#345fe1]/5 text-[#345fe1]"
                        : "border-border bg-background text-foreground",
                      isTurnoverEditing && !active
                        ? "hover:border-[#345fe1]/50 hover:bg-[#345fe1]/5 cursor-pointer"
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
                <Settings2 className="w-5 h-5 text-[#345fe1]" />
                内部留保の設定
              </CardTitle>
              <div className="flex items-center gap-2">
                {isReserveEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleReserveCancel} disabled={reserveSaving}>
                      キャンセル
                    </Button>
                    <Button size="sm" className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white" onClick={handleReserveSave} disabled={reserveSaving}>
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
                          className="[&_[data-slot=slider-track]]:bg-[#345fe1]/15 [&_[data-slot=slider-range]]:bg-[#345fe1] [&_[data-slot=slider-thumb]]:border-[#345fe1] [&_[data-slot=slider-thumb]]:focus-visible:ring-[#345fe1]/30 [&_[data-slot=slider-thumb]]:hover:ring-[#345fe1]/20"
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
                    <p className="text-lg font-bold text-[#345fe1]">{Math.max(0, 100 - reserveTotal)}%</p>
                  </div>
                  {reserveTotal > 100 && (
                    <p className="text-xs text-red-500">合計が100%を超えています。</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
