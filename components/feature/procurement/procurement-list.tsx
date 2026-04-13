"use client"

import { useState, useMemo, useEffect } from "react"
import { Trash2, Table, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/feature/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  getProcurementListAction,
  removeProcurementItemAction,
  updateProcurementItemQtyAction,
  clearProcurementListAction,
  markProcurementItemOrderedAction,
  type ProcurementItemRow,
} from "@/src/actions/inventory-actions"
import { cn } from "@/lib/utils"

const formatNumber = (value: number) => new Intl.NumberFormat("ja-JP").format(value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)

export function ProcurementList() {
  const [listId, setListId] = useState<string | null>(null)
  const [items, setItems] = useState<ProcurementItemRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getProcurementListAction()
      .then((result) => {
        if (!("error" in result)) {
          setListId(result.listId)
          setItems(result.items)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const pendingItems = useMemo(() => items.filter((i) => i.orderedAt == null), [items])
  const orderedItems = useMemo(
    () => items.filter((i) => i.orderedAt != null).sort((a, b) => (b.orderedAt! > a.orderedAt! ? 1 : -1)),
    [items],
  )

  const totals = useMemo(() => {
    const totalOrderQty = pendingItems.reduce((acc, item) => acc + item.orderQty, 0)
    const totalAmount = pendingItems.reduce((acc, item) => acc + item.orderQty * (item.priceYen ?? 0), 0)
    return { totalOrderQty, totalAmount }
  }, [pendingItems])

  const handleQtyChange = (itemId: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, orderQty: qty } : i)))
  }

  const handleQtyBlur = (itemId: string, qty: number) => {
    updateProcurementItemQtyAction(itemId, qty)
  }

  const handleRemove = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId))
    await removeProcurementItemAction(itemId)
  }

  const handleMarkOrdered = async (itemId: string) => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((i) => (i.itemId === itemId ? { ...i, orderedAt: now } : i)))
    await markProcurementItemOrderedAction(itemId)
  }

  const handleClear = async () => {
    setItems((prev) => prev.filter((i) => i.orderedAt != null))
    await clearProcurementListAction()
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow="Inventory"
          title="仕入れリスト"
          description="仕入れ提案から追加した発注候補をまとめて確認できます。"
          icon={Table}
        />
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={pendingItems.length === 0 || loading}
          className="text-[#345fe1] border-[#345fe1]"
        >
          すべてクリア
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">登録アイテム</p>
            <p className="text-lg font-bold">{pendingItems.length} 件</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">発注数量合計</p>
            <p className="text-lg font-bold">{formatNumber(totals.totalOrderQty)} 点</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">概算仕入れ金額</p>
            <p className="text-lg font-bold">{formatCurrency(totals.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">発注候補一覧</CardTitle>
          <Badge variant="outline" className="bg-muted/40">
            {items.length} 件
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              読み込み中...
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              仕入れ提案から「発注に追加」を押すと、ここに表示されます。
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">JAN</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">商品</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">カテゴリ</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">現在庫</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">推奨発注</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">発注数</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">概算金額</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">ステータス</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item) => (
                    <tr key={item.itemId} className="border-t border-border/70">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.janCode ?? "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.color, item.size].filter(Boolean).join(" / ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.categoryName ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.estimatedStock}点</td>
                      <td className="px-4 py-3 text-right font-bold text-[#345fe1]">
                        {item.suggestedQty != null ? `${item.suggestedQty}点` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min={0}
                          value={item.orderQty}
                          onChange={(e) => handleQtyChange(item.itemId, Number(e.target.value))}
                          onBlur={(e) => handleQtyBlur(item.itemId, Number(e.target.value))}
                          className="w-24 text-right"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.orderQty * (item.priceYen ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={cn(
                            "px-3 py-1",
                            item.status === "high"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : item.status === "overstock"
                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.status === "high" ? "高需要" : item.status === "overstock" ? "過剰在庫" : "通常"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkOrdered(item.itemId)}
                            aria-label="発注済みにする"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemove(item.itemId)}
                            aria-label="削除"
                          >
                            <Trash2 className="w-4 h-4 text-[#345fe1]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {orderedItems.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              発注済み
            </CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {orderedItems.length} 件
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">発注日</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">JAN</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">商品</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">カテゴリ</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">発注数</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">概算金額</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedItems.map((item) => (
                    <tr key={item.itemId} className="border-t border-border/70 bg-green-50/40">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(item.orderedAt!).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.janCode ?? "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.color, item.size].filter(Boolean).join(" / ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.categoryName ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.orderQty}点</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.orderQty * (item.priceYen ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={cn(
                            "px-3 py-1",
                            item.status === "high"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : item.status === "overstock"
                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.status === "high" ? "高需要" : item.status === "overstock" ? "過剰在庫" : "通常"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
