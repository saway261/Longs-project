"use client"

import { useEffect, useRef, useState } from "react"
import {
  Upload,
  Download,
  Table,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Wallet,
  Plus,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { dataSets } from "@/lib/data-sets"
import { cn } from "@/lib/utils"
import {
  importDataAction,
  checkUnknownItemCodesAction,
  getImportHistoryByDatasetAction,
  downloadTemplateAction,
  type ImportHistoryDTO,
  type ImportResult,
  type UnknownItemInfo,
} from "@/src/actions/data-actions"
import {
  getFixedCostsAction,
  saveFixedCostsAction,
  type FixedCostDTO,
} from "@/src/actions/settings-actions"

type FixedCostDraftRow = Omit<FixedCostDTO, "id"> & { _key: string; id?: string }

type HistoryDialogState = {
  datasetId: string
  datasetName: string
  datasetDescription: string
  history: ImportHistoryDTO
}

type PendingImport = {
  datasetName: string
  targetId: string
  file: File
}

const statusLabels: Record<string, string> = {
  success: "取込完了",
  partial: "一部注意",
  failed: "失敗",
  processing: "処理中",
}

function IssueList({ items, emptyText }: { items: string[]; emptyText: string }) {
  const [showAll, setShowAll] = useState(false)
  const LIMIT = 5
  const visible = showAll ? items : items.slice(0, LIMIT)
  const remaining = items.length - LIMIT

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        {visible.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {!showAll && remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-[#345fe1] hover:underline flex items-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          残り{remaining}件を表示
        </button>
      )}
      {showAll && items.length > LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-2 text-xs text-[#345fe1] hover:underline flex items-center gap-1"
        >
          <ChevronUp className="w-3 h-3" />
          折りたたむ
        </button>
      )}
    </div>
  )
}

export function DataRegistration() {
  const [historyByDataset, setHistoryByDataset] = useState<Record<string, ImportHistoryDTO[]>>({})
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importTargetId, setImportTargetId] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [activeHistory, setActiveHistory] = useState<HistoryDialogState | null>(null)
  const [importFeedback, setImportFeedback] = useState<
    | { datasetName: string; result: ImportResult }
    | { datasetName: string; error: string }
    | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [unknownItems, setUnknownItems] = useState<UnknownItemInfo[]>([])
  const [categoryConfirmOpen, setCategoryConfirmOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

  // ── 固定費状態 ────────────────────────────────────────────────────────────
  const [fixedCosts, setFixedCosts] = useState<FixedCostDTO[]>([])
  const [fixedCostsDraft, setFixedCostsDraft] = useState<FixedCostDraftRow[]>([])
  const [isFixedEditing, setIsFixedEditing] = useState(false)
  const [fixedLoading, setFixedLoading] = useState(true)
  const [fixedSaving, setFixedSaving] = useState(false)
  const [fixedError, setFixedError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const res = await getFixedCostsAction()
      if (res.success) setFixedCosts(res.data)
      setFixedLoading(false)
    })()
  }, [])

  const handleFixedEdit = () => {
    setFixedCostsDraft(fixedCosts.map((i) => ({ ...i, _key: i.id })))
    setFixedError(null)
    setIsFixedEditing(true)
  }
  const handleFixedSave = async () => {
    setFixedSaving(true)
    setFixedError(null)
    const items = fixedCostsDraft.map((i) => ({ id: i.id, name: i.name, amountYen: i.amountYen, dueDay: i.dueDay }))
    const res = await saveFixedCostsAction(items)
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
    setFixedCostsDraft((prev) => [...prev, { _key: `new-${Date.now()}`, name: "新規項目", amountYen: 0, dueDay: 25, sortOrder: prev.length }])
  }

  const fetchHistory = async () => {
    const result = await getImportHistoryByDatasetAction()
    if (result.success) {
      setHistoryByDataset(result.data)
    }
    setIsLoadingHistory(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const formatValue = (value: string | number | undefined) => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("ja-JP").format(value)
    }
    return value ?? "-"
  }

  const activeImportSet = importTargetId ? dataSets.find((s) => s.id === importTargetId) : null

  const doImport = async (pending: PendingImport, handling: "add" | "use_other") => {
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append("file", pending.file)
      formData.append("dataset", pending.targetId)
      formData.append("unknownItemHandling", handling)
      const actionResult = await importDataAction(formData)
      await fetchHistory()
      if (actionResult.success) {
        setImportFeedback({ datasetName: pending.datasetName, result: actionResult.data })
      } else {
        setImportFeedback({ datasetName: pending.datasetName, error: actionResult.error })
      }
    } finally {
      setIsImporting(false)
      setImportFile(null)
      setPendingImport(null)
      setUnknownItems([])
    }
  }

  const handleImportConfirm = async () => {
    if (!importTargetId || !importFile) return
    const datasetName = activeImportSet?.name ?? importTargetId
    const targetId = importTargetId
    const pending: PendingImport = { datasetName, targetId, file: importFile }
    setImportTargetId(null)

    // sales データの場合は未登録カテゴリをチェック
    if (targetId === "sales") {
      setIsImporting(true)
      try {
        const checkForm = new FormData()
        checkForm.append("file", importFile)
        const checkResult = await checkUnknownItemCodesAction(checkForm)
        if (checkResult.success && checkResult.data.unknownItems.length > 0) {
          setPendingImport(pending)
          setUnknownItems(checkResult.data.unknownItems)
          setCategoryConfirmOpen(true)
          setIsImporting(false)
          return
        }
      } catch {
        // チェック失敗時はそのままインポート
      }
      setIsImporting(false)
    }

    await doImport(pending, "use_other")
  }

  const handleFileSelect = (file?: File | null) => {
    if (!file) return
    setImportFile(file)
  }

  const handleTemplateDownload = async (datasetId: string) => {
    const result = await downloadTemplateAction(datasetId)
    if (!result.success) return
    const { csvContent, fileName } = result.data
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#345fe1]" />
          データインポート
        </h2>
        <p className="text-muted-foreground">売上・仕入・請求・年度粗利データを個別にアップロード/編集できます。</p>
      </div>

      <div className="space-y-6">
        {dataSets.map((set) => {
          const histories = historyByDataset[set.id] ?? []
          const lastImportedAt = histories[0]?.importedAt ?? null
          return (
            <Card key={set.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Table className="w-4 h-4 text-[#345fe1]" />
                      {set.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{set.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {lastImportedAt && (
                      <span className="text-xs text-muted-foreground">最終アップロード {lastImportedAt}</span>
                    )}
                    <Button
                      variant="outline"
                      className="text-[#345fe1] border-[#345fe1]"
                      onClick={() => handleTemplateDownload(set.id)}
                    >
                      <Download className="w-4 h-4 mr-2 text-[#345fe1]" />
                      テンプレート
                    </Button>
                    <Button
                      onClick={() => {
                        setImportFile(null)
                        setImportTargetId(set.id)
                      }}
                      className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2 text-white" />
                      )}
                      {isImporting ? "取込中..." : "アップロード"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/70 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                    <p className="text-xs text-muted-foreground">アップロード履歴</p>
                    {isLoadingHistory ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : (
                      <p className="text-xs text-muted-foreground">履歴件数 {formatValue(histories.length)} 件</p>
                    )}
                  </div>
                  {isLoadingHistory ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">読み込み中...</div>
                  ) : histories.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">アップロード履歴がありません。</div>
                  ) : (
                    <div className="divide-y divide-border/70">
                      {histories.map((history) => (
                        <button
                          key={history.id}
                          type="button"
                          onClick={() =>
                            setActiveHistory({
                              datasetId: set.id,
                              datasetName: set.name,
                              datasetDescription: set.description,
                              history,
                            })
                          }
                          className="w-full text-left px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#345fe1]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{history.fileName}</p>
                              <p className="text-xs text-muted-foreground">{history.importedAt}</p>
                              {history.note && <p className="text-xs text-muted-foreground">{history.note}</p>}
                            </div>
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{formatValue(history.rows)} 行</p>
                                <p
                                  className={cn(
                                    "text-xs font-medium",
                                    history.status === "success"
                                      ? "text-[#345fe1]"
                                      : history.status === "partial"
                                        ? "text-amber-600"
                                        : "text-red-600",
                                  )}
                                >
                                  {statusLabels[history.status] ?? history.status}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-2">アップロード予定カラム</p>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {set.columns.map((col) => (
                      <span key={`${set.id}-${col}`} className="px-2 py-1 rounded-md bg-white">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── 固定費の設定 ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#345fe1]" />
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
                  <Button size="sm" className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white" onClick={handleFixedSave} disabled={fixedSaving}>
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
                  <div key={isFixedEditing ? (item as FixedCostDraftRow)._key : item.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {isFixedEditing ? (
                        <Input
                          value={fixedCostsDraft[index].name}
                          onChange={(e) =>
                            setFixedCostsDraft((prev) =>
                              prev.map((cost, idx) => (idx === index ? { ...cost, name: e.target.value } : cost)),
                            )
                          }
                        />
                      ) : (
                        <p className="text-sm font-semibold">{item.name}</p>
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
                            {new Intl.NumberFormat("ja-JP").format((item as FixedCostDTO).amountYen)} 円
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
                          <p className="text-lg font-bold text-foreground">{(item as FixedCostDTO).dueDay} 日</p>
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

      {/* ファイル選択ダイアログ */}
      <Dialog
        open={!!importTargetId}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setImportTargetId(null)
            setImportFile(null)
            setIsDragActive(false)
          }
        }}
      >
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>データをアップロード</DialogTitle>
            <DialogDescription>対象データにアップロードするファイルを選択してください。</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
            <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">{activeImportSet?.name ?? "データセット"}</p>
              <p className="text-xs text-muted-foreground">{activeImportSet?.description}</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragActive(true)
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragActive(false)
                  handleFileSelect(e.dataTransfer.files?.[0])
                }}
                className={cn(
                  "rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                  isDragActive ? "border-[#345fe1] bg-[#345fe1]/10" : "border-border bg-muted/20",
                )}
              >
                <Upload className="w-8 h-8 mx-auto text-[#345fe1] mb-2" />
                <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ</p>
                <p className="text-xs text-muted-foreground">またはクリックして選択</p>
                <label className="inline-flex mt-3">
                  <span className="px-3 py-1.5 text-xs rounded-full border border-[#345fe1] text-[#345fe1] cursor-pointer">
                    ファイルを選択
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </label>
              </div>
              {importFile && <p className="text-xs text-muted-foreground">選択中: {importFile.name}</p>}
              <p className="text-[11px] text-muted-foreground">CSV / XLSX 対応</p>
            </div>
            {activeImportSet && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-2">アップロード予定カラム</p>
                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {activeImportSet.columns.map((col) => (
                    <span key={col} className="px-2 py-1 rounded-md bg-white">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportTargetId(null)}>
                キャンセル
              </Button>
              <Button
                className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
                onClick={handleImportConfirm}
                disabled={!importFile || isImporting}
              >
                {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                アップロード開始
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 取込結果ダイアログ */}
      <Dialog
        open={!!importFeedback}
        onOpenChange={(open: boolean) => {
          if (!open) setImportFeedback(null)
        }}
      >
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>取込結果</DialogTitle>
            <DialogDescription>{importFeedback?.datasetName} のインポートが完了しました。</DialogDescription>
          </DialogHeader>
          {importFeedback && (
            <>
            <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
              {"error" in importFeedback ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">インポートに失敗しました</p>
                    <p className="text-sm text-red-600 mt-1">{importFeedback.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ステータスバナー */}
                  <div
                    className={cn(
                      "rounded-lg border p-4 flex items-start gap-3",
                      importFeedback.result.status === "success"
                        ? "border-blue-200 bg-blue-50"
                        : importFeedback.result.status === "partial"
                          ? "border-amber-200 bg-amber-50"
                          : "border-red-200 bg-red-50",
                    )}
                  >
                    {importFeedback.result.status === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-[#345fe1] mt-0.5 shrink-0" />
                    ) : importFeedback.result.status === "partial" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          importFeedback.result.status === "success"
                            ? "text-[#345fe1]"
                            : importFeedback.result.status === "partial"
                              ? "text-amber-700"
                              : "text-red-700",
                        )}
                      >
                        {statusLabels[importFeedback.result.status]}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">{importFeedback.result.summary}</p>
                    </div>
                  </div>

                  {/* 統計グリッド */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: "処理対象", value: importFeedback.result.rowsTotal, color: "" },
                      { label: "正常", value: importFeedback.result.rowsSuccess, color: "text-[#345fe1]" },
                      { label: "スキップ", value: importFeedback.result.rowsSkipped, color: "" },
                      { label: "注意", value: importFeedback.result.warningsCount, color: "text-amber-600" },
                      { label: "エラー", value: importFeedback.result.errorsCount, color: "text-red-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg border border-border p-3 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn("text-sm font-semibold text-foreground", color)}>{formatValue(value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* 警告・エラー詳細（どちらかに件数があれば表示） */}
                  {(importFeedback.result.warnings.length > 0 || importFeedback.result.errors.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <p className="text-sm font-semibold text-foreground">注意 / 警告</p>
                        </div>
                        <IssueList items={importFeedback.result.warnings} emptyText="注意事項はありません。" />
                      </div>
                      <div className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <p className="text-sm font-semibold text-foreground">エラー詳細</p>
                        </div>
                        <IssueList items={importFeedback.result.errors} emptyText="エラーはありません。" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="shrink-0 flex justify-end pt-4">
              <Button variant="outline" onClick={() => setImportFeedback(null)}>
                閉じる
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* カテゴリ未登録確認ダイアログ */}
      <Dialog
        open={categoryConfirmOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCategoryConfirmOpen(false)
            setPendingImport(null)
            setUnknownItems([])
            setImportFile(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>未登録カテゴリの確認</DialogTitle>
            <DialogDescription>
              以下のアイテムに対応するカテゴリが登録されていません。新規カテゴリとして追加しますか？
              追加しない場合は「その他」カテゴリとして取り込まれます。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-52 overflow-y-auto rounded-md border border-border p-2 space-y-1">
            {unknownItems.map((item) => (
              <div key={item.itemCode} className="flex items-center gap-3 text-sm py-0.5">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">{item.itemCode}</span>
                <span className="text-foreground">{item.itemName || "（アイテム名なし）"}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              disabled={isImporting}
              onClick={async () => {
                setCategoryConfirmOpen(false)
                if (pendingImport) await doImport(pendingImport, "use_other")
              }}
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              「その他」として取込む
            </Button>
            <Button
              className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
              disabled={isImporting}
              onClick={async () => {
                setCategoryConfirmOpen(false)
                if (pendingImport) await doImport(pendingImport, "add")
              }}
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              カテゴリを追加して取込む
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 履歴詳細ダイアログ */}
      <Dialog
        open={!!activeHistory}
        onOpenChange={(open: boolean) => {
          if (!open) setActiveHistory(null)
        }}
      >
        <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>アップロード履歴の詳細</DialogTitle>
            <DialogDescription>
              {activeHistory?.datasetName} / {activeHistory?.history.fileName}
              {activeHistory?.datasetDescription ? ` • ${activeHistory.datasetDescription}` : ""}
            </DialogDescription>
          </DialogHeader>
          {activeHistory && (
            <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">アップロード日時</p>
                    <p className="text-sm font-medium text-foreground">{activeHistory.history.importedAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ステータス</p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        activeHistory.history.status === "success"
                          ? "text-[#345fe1]"
                          : activeHistory.history.status === "partial"
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {statusLabels[activeHistory.history.status] ?? activeHistory.history.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">取込行数</p>
                    <p className="text-sm font-semibold text-foreground">{formatValue(activeHistory.history.rows)} 行</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">概要</p>
                  <p className="text-sm text-foreground">{activeHistory.history.summary}</p>
                  {activeHistory.history.note && (
                    <p className="text-xs text-muted-foreground mt-1">補足: {activeHistory.history.note}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: "処理対象", value: activeHistory.history.stats.processed, color: "" },
                  { label: "正常", value: activeHistory.history.stats.success, color: "text-[#345fe1]" },
                  { label: "スキップ", value: activeHistory.history.stats.skipped, color: "" },
                  { label: "注意", value: activeHistory.history.stats.warnings, color: "text-amber-600" },
                  { label: "エラー", value: activeHistory.history.stats.errors, color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={cn("text-sm font-semibold text-foreground", color)}>{formatValue(value)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-foreground">注意 / 警告</p>
                  </div>
                  <IssueList items={activeHistory.history.warnings ?? []} emptyText="注意事項はありません。" />
                </div>
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-semibold text-foreground">エラー詳細</p>
                  </div>
                  <IssueList items={activeHistory.history.errors ?? []} emptyText="エラーはありません。" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
