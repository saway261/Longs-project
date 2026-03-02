"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, FileText, Loader2, Table } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dataSets } from "@/lib/data-sets"
import { cn } from "@/lib/utils"
import {
  getDatasetRowsAction,
  updateDataRowAction,
  deleteDataRowAction,
  exportDatasetAction,
  type DisplayRow,
} from "@/src/actions/data-actions"

export function DataHub() {
  const [activeDatasetId, setActiveDatasetId] = useState(dataSets[0]?.id ?? "")
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [datasetTotals, setDatasetTotals] = useState<Record<string, number>>({})

  const dataSetMap = useMemo(() => Object.fromEntries(dataSets.map((set) => [set.id, set])), [])
  const activeDataSet = dataSetMap[activeDatasetId]

  const [searchTerm, setSearchTerm] = useState("")
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)

  const [editing, setEditing] = useState<{ rowId: string; datasetId: string } | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const formatValue = (value: string | number | undefined) => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("ja-JP").format(value)
    }
    return value ?? "-"
  }

  const fetchRows = useCallback(
    async (dataset: string, search: string, p: number, size: number) => {
      setIsLoading(true)
      const result = await getDatasetRowsAction({ dataset, search: search || undefined, page: p, pageSize: size })
      if (result.success) {
        setRows(result.data.rows)
        setTotal(result.data.total)
        setDatasetTotals((prev) => ({ ...prev, [dataset]: result.data.total }))
      }
      setIsLoading(false)
    },
    [],
  )

  useEffect(() => {
    const fetchAllTotals = async () => {
      const results = await Promise.all(
        dataSets.map((set) => getDatasetRowsAction({ dataset: set.id, page: 1, pageSize: 1 })),
      )
      const totals: Record<string, number> = {}
      results.forEach((result, i) => {
        if (result.success) totals[dataSets[i].id] = result.data.total
      })
      setDatasetTotals((prev) => ({ ...prev, ...totals }))
    }
    fetchAllTotals()
  }, [])

  useEffect(() => {
    setPage(1)
    setSearchTerm("")
  }, [activeDatasetId])

  useEffect(() => {
    fetchRows(activeDatasetId, searchTerm, page, pageSize)
  }, [activeDatasetId, searchTerm, page, pageSize, fetchRows])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const pageEnd = pageStart + rows.length

  const openEdit = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row || !activeDataSet) return
    const draft = activeDataSet.columns.reduce((acc, col) => {
      acc[col] = row[col] === undefined ? "" : String(row[col])
      return acc
    }, {} as Record<string, string>)
    setEditDraft(draft)
    setEditing({ rowId, datasetId: activeDatasetId })
  }

  const saveEdit = async () => {
    if (!editing) return
    setIsSaving(true)
    const result = await updateDataRowAction({ dataset: editing.datasetId, id: editing.rowId, data: editDraft })
    setIsSaving(false)
    if (result.success) {
      setEditing(null)
      fetchRows(activeDatasetId, searchTerm, page, pageSize)
    }
  }

  const deleteRow = async (rowId: string) => {
    const result = await deleteDataRowAction({ dataset: activeDatasetId, id: rowId })
    if (result.success) {
      fetchRows(activeDatasetId, searchTerm, page, pageSize)
    }
  }

  const handleExportCsv = async () => {
    const result = await exportDatasetAction({ dataset: activeDatasetId, search: searchTerm || undefined })
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Table className="w-6 h-6 text-[#345fe1]" />
            データ一覧
          </h2>
          <p className="text-muted-foreground">アップロード済みデータの確認と編集をまとめて行えます。</p>
        </div>
        <Button variant="outline" className="text-[#345fe1] border-[#345fe1]" onClick={handleExportCsv}>
          <Download className="w-4 h-4 mr-2 text-[#345fe1]" />
          CSV出力
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">データセット</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dataSets.map((set) => {
              const isActive = set.id === activeDatasetId
              const count = datasetTotals[set.id] ?? (isActive ? total : 0)
              return (
                <button
                  key={set.id}
                  onClick={() => setActiveDatasetId(set.id)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2 transition-colors",
                    isActive
                      ? "border-[#345fe1] bg-[#345fe1]/10 text-[#345fe1]"
                      : "border-border text-muted-foreground hover:border-[#345fe1]/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{set.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", isActive && "border-[#345fe1] text-[#345fe1]")}
                    >
                      {formatValue(count)}行
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{set.description}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#345fe1]" />
                {activeDataSet?.name ?? "データ"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{activeDataSet?.description}</p>
            </div>
            <span className="text-xs text-muted-foreground">全 {formatValue(total)} 行</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeDataSet ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                データセットがありません。
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setPage(1)
                      }}
                      placeholder="キーワードで検索"
                      className="w-55"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>表示行数</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setPage(1)
                        }}
                        className="border border-border rounded-md px-2 py-1 bg-white text-xs"
                      >
                        {[50, 100, 200].map((size) => (
                          <option key={size} value={size}>
                            {size}行
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatValue(total)} 件
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-auto rounded-lg border">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-6 h-6 animate-spin text-[#345fe1]" />
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                      データがありません。データインポートからCSVをアップロードしてください。
                    </div>
                  ) : (
                    <table className="text-sm">
                      <thead className="bg-white sticky top-0 z-20 shadow-sm">
                        <tr>
                          {activeDataSet.columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap sticky right-0 bg-white">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id} className="border-t border-border/70">
                            {activeDataSet.columns.map((col) => (
                              <td key={`${row.id}-${col}`} className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                                {formatValue(row[col])}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right sticky right-0 bg-white">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}>
                                  編集
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => deleteRow(row.id)}
                                >
                                  削除
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {total === 0 ? "0" : `${formatValue(pageStart + 1)} - ${formatValue(pageEnd)}`} / {formatValue(total)} 行
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      前へ
                    </Button>
                    <span>
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(open: boolean) => !open && setEditing(null)}>
        <DialogContent className="max-w-5xl w-[92vw]">
          <DialogHeader>
            <DialogTitle>データ編集</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 text-[#345fe1]" />
                <span>{dataSetMap[editing.datasetId]?.name}</span>
              </div>
              <div className="max-h-[60vh] overflow-auto rounded-lg border border-border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataSetMap[editing.datasetId]?.columns.map((col) => (
                    <div key={col} className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{col}</Label>
                      <Input
                        value={editDraft[col] ?? ""}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, [col]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  キャンセル
                </Button>
                <Button className="bg-[#345fe1] hover:bg-[#2a4bb3] text-white" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  保存
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
