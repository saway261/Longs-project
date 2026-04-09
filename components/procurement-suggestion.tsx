"use client"

import { useState, useMemo, useEffect } from "react"
import { TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import {
  getInventoryCatalogAction,
  getProcurementListAction,
  addProcurementItemAction,
  type CatalogVariantRow,
} from "@/src/actions/inventory-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ProcurementSuggestions() {
  const [recommendationPage, setRecommendationPage] = useState(1)
  const [variantCatalog, setVariantCatalog] = useState<CatalogVariantRow[]>([])
  const [variantLoading, setVariantLoading] = useState(false)
  const [addedVariantIds, setAddedVariantIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setVariantLoading(true)
    getInventoryCatalogAction()
      .then(({ variants }) => {
        setVariantCatalog(variants)
      })
      .catch(console.error)
      .finally(() => setVariantLoading(false))

    getProcurementListAction().then((result) => {
      if (!("error" in result)) {
        setAddedVariantIds(new Set(result.items.map((i) => i.variantId)))
      }
    })
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const recommendationItems = useMemo(
    () =>
      variantCatalog
        .filter((v) => v.estimatedStock < 50)
        .sort((a, b) => a.estimatedStock - b.estimatedStock),
    [variantCatalog],
  )

  const recommendationsPerPage = 8
  const recommendationTotalPages = Math.max(1, Math.ceil(recommendationItems.length / recommendationsPerPage))
  const currentRecommendationPage = Math.min(recommendationPage, recommendationTotalPages)
  const recommendationStart = (currentRecommendationPage - 1) * recommendationsPerPage
  const recommendationEnd = recommendationStart + recommendationsPerPage
  const pagedRecommendations = recommendationItems.slice(recommendationStart, recommendationEnd)
  const recommendationCount = recommendationItems.length
  const recommendationRangeStart = recommendationCount === 0 ? 0 : recommendationStart + 1
  const recommendationRangeEnd = Math.min(recommendationEnd, recommendationCount)

  const handleAddToProcurement = async (variant: CatalogVariantRow) => {
    const result = await addProcurementItemAction(variant.variantId, null, variant.priceYen, "high")
    if (!("error" in result)) {
      setAddedVariantIds((prev) => new Set([...prev, variant.variantId]))
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        eyebrow="Inventory"
        title="仕入れ提案"
        description="過去データに基づく最適在庫提案"
        icon={TrendingUp}
      />

      <Card className="mb-6">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">仕入れ提案</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-muted/40">
                提案 {variantLoading ? "..." : recommendationCount} 件
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            推定在庫が50点未満の商品を高需要として抽出しています。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">JAN</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">商品</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">カテゴリ</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">推定在庫</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">価格</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">推奨発注</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">ステータス</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {variantLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      読み込み中...
                    </td>
                  </tr>
                ) : pagedRecommendations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      現在、提案対象の在庫はありません。
                    </td>
                  </tr>
                ) : (
                  pagedRecommendations.map((variant) => {
                    const isAdded = addedVariantIds.has(variant.variantId)
                    return (
                      <tr key={variant.variantId} className="border-t border-border/70 hover:bg-muted/40">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{variant.janCode ?? "-"}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{variant.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {[variant.color, variant.size].filter(Boolean).join(" / ")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{variant.categoryName ?? "-"}</td>
                        <td className="px-4 py-3 text-right font-medium">{variant.estimatedStock}点</td>
                        <td className="px-4 py-3 text-right">
                          {variant.priceYen != null ? formatCurrency(variant.priceYen) : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">-</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-100">
                            <TrendingUp className="w-3 h-3 mr-1 text-[#345fe1]" />
                            高需要
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant={isAdded ? "outline" : "default"}
                            onClick={() => handleAddToProcurement(variant)}
                            disabled={isAdded}
                            className={cn(
                              isAdded
                                ? "text-[#345fe1] border-[#345fe1] bg-transparent"
                                : "bg-[#345fe1] hover:bg-[#2a4bb3] text-white",
                            )}
                          >
                            {isAdded ? "追加済み" : "発注に追加"}
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {recommendationCount === 0
                ? "0 件"
                : `${recommendationRangeStart}-${recommendationRangeEnd} 件 / ${recommendationCount} 件`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecommendationPage((prev) => Math.max(1, prev - 1))}
                disabled={currentRecommendationPage === 1}
              >
                前へ
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentRecommendationPage} / {recommendationTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecommendationPage((prev) => Math.min(recommendationTotalPages, prev + 1))}
                disabled={currentRecommendationPage === recommendationTotalPages}
              >
                次へ
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
