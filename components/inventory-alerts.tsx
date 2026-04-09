"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Package, TrendingDown, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getInventoryAlertAction } from "@/src/actions/insights-actions"
import type { InventoryAlertItem } from "@/src/actions/insights-actions"

const getAlertTypeLabel = (type: InventoryAlertItem["type"]) => {
  switch (type) {
    case "low_stock":
      return "在庫不足"
    case "overstock":
      return "過剰在庫"
    case "expiring":
      return "廃品リスク"
    default:
      return "アラート"
  }
}

const getAlertIcon = (type: InventoryAlertItem["type"]) => {
  switch (type) {
    case "low_stock":
      return <TrendingDown className="w-4 h-4" />
    case "overstock":
      return <Package className="w-4 h-4" />
    case "expiring":
      return <Clock className="w-4 h-4" />
    default:
      return <AlertTriangle className="w-4 h-4" />
  }
}

export function InventoryAlerts() {
  const [alertType, setAlertType] = useState<InventoryAlertItem["type"]>("low_stock")
  const [alertPage, setAlertPage] = useState(1)
  const [alertData, setAlertData] = useState<InventoryAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInventoryAlertAction()
      .then((res) => {
        if (res.success) setAlertData(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const alertCounts = useMemo(
    () =>
      alertData.reduce(
        (acc, alert) => {
          acc[alert.type] = (acc[alert.type] ?? 0) + 1
          return acc
        },
        { low_stock: 0, overstock: 0, expiring: 0 } as Record<InventoryAlertItem["type"], number>,
      ),
    [alertData],
  )

  const filteredAlerts = useMemo(
    () => alertData.filter((alert) => alert.type === alertType),
    [alertData, alertType],
  )
  const alertsPerPage = 12
  const alertTotalPages = Math.max(1, Math.ceil(filteredAlerts.length / alertsPerPage))
  const currentAlertPage = Math.min(alertPage, alertTotalPages)
  const alertStart = (currentAlertPage - 1) * alertsPerPage
  const alertEnd = alertStart + alertsPerPage
  const pagedAlerts = filteredAlerts.slice(alertStart, alertEnd)

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Inventory</p>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-[#345fe1]" />
          在庫アラート分析
        </h2>
        <p className="text-muted-foreground">在庫不足・過剰・廃品リスクを分類し、優先対応すべきアラートを確認できます。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#345fe1]" />
            在庫アラート分析
          </CardTitle>
          <p className="text-sm text-muted-foreground">在庫不足・過剰・廃品リスクを分類して確認できます。</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "low_stock", label: "在庫不足" },
                  { id: "overstock", label: "過剰在庫" },
                  { id: "expiring", label: "廃品リスク" },
                ] as const).map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAlertType(item.id)
                      setAlertPage(1)
                    }}
                    className={cn(
                      "h-auto flex flex-col items-start gap-1 px-3 py-2 transition-all",
                      alertType === item.id
                        ? "bg-[#345fe1] border-[#345fe1] text-white shadow-md"
                        : "bg-white border-border text-muted-foreground hover:border-[#345fe1]/50 hover:text-[#345fe1]",
                    )}
                  >
                    <span className="text-[11px]">{item.label}</span>
                    <span className="text-lg font-bold">{alertCounts[item.id]}</span>
                  </Button>
                ))}
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                1ページに最大 {alertsPerPage} 件を表示します。
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="text-[#345fe1]">{getAlertIcon(alertType)}</span>
                    <span>在庫アラート: {getAlertTypeLabel(alertType)}</span>
                  </div>
                  <Badge variant="outline" className="bg-muted/40">
                    {filteredAlerts.length} 件
                  </Badge>
                </div>
                <div className="space-y-2 max-h-105 overflow-auto p-3">
                  {loading ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      読み込み中...
                    </div>
                  ) : pagedAlerts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      該当するアラートはありません
                    </div>
                  ) : (
                    pagedAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "rounded-lg border p-3 flex items-start gap-3",
                          alert.type === "low_stock"
                            ? "border-red-200"
                            : alert.type === "overstock"
                              ? "border-orange-200"
                              : "border-purple-200",
                        )}
                      >
                        <div className="mt-0.5 text-[#345fe1]">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{alert.product}</span>
                            <Badge
                              className={cn(
                                "text-[11px]",
                                alert.type === "low_stock"
                                  ? "bg-red-100 text-red-700"
                                  : alert.type === "overstock"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-purple-100 text-purple-700",
                              )}
                            >
                              {getAlertTypeLabel(alert.type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="text-[11px]">
                              {alert.productId}
                            </Badge>
                            <Badge variant="outline" className="text-[11px]">
                              {alert.category}
                            </Badge>
                            <span>{alert.date}</span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>現在庫</p>
                          <p className="text-base font-bold text-foreground">{alert.currentStock}</p>
                          <p>基準 {alert.threshold}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {filteredAlerts.length === 0
                    ? "0 件"
                    : `${alertStart + 1}-${Math.min(alertEnd, filteredAlerts.length)} 件 / ${filteredAlerts.length} 件`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAlertPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentAlertPage === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {currentAlertPage} / {alertTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAlertPage((prev) => Math.min(alertTotalPages, prev + 1))}
                    disabled={currentAlertPage === alertTotalPages}
                  >
                    次へ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
