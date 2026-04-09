"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import {
  getInventoryCatalogAction,
  updateProductAction,
  updateVariantAction,
  type CatalogVariantRow,
  type MasterItem,
} from "@/src/actions/inventory-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type CatalogProductGroup = {
  productId: string
  productName: string
  productCode: string | null
  season: string | null
  brandName: string | null
  categoryName: string | null
  totalEstimatedStock: number
  variants: CatalogVariantRow[]
}

export function InventoryCatalog() {
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all")
  const [catalogBrandFilter, setCatalogBrandFilter] = useState("all")
  const [catalogSeasonFilter, setCatalogSeasonFilter] = useState("all")
  const [catalogPage, setCatalogPage] = useState(1)
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set())

  // 商品編集
  const [editingProduct, setEditingProduct] = useState<CatalogProductGroup | null>(null)
  const [productForm, setProductForm] = useState({ name: "", brandName: "", categoryName: "", season: "" })
  const [productSaving, setProductSaving] = useState(false)
  const [productSaveError, setProductSaveError] = useState<string | null>(null)

  // バリアント編集
  const [editingVariant, setEditingVariant] = useState<CatalogVariantRow | null>(null)
  const [variantForm, setVariantForm] = useState({ color: "", size: "", janCode: "", priceYen: "" })
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantSaveError, setVariantSaveError] = useState<string | null>(null)

  // DB データ
  const [variantCatalog, setVariantCatalog] = useState<CatalogVariantRow[]>([])
  const [variantLoading, setVariantLoading] = useState(false)
  const [categoryMaster, setCategoryMaster] = useState<MasterItem[]>([])
  const [brandMaster, setBrandMaster] = useState<MasterItem[]>([])

  useEffect(() => {
    setVariantLoading(true)
    getInventoryCatalogAction()
      .then(({ variants, categories, brands }) => {
        setVariantCatalog(variants)
        setCategoryMaster(categories)
        setBrandMaster(brands)
      })
      .catch(console.error)
      .finally(() => setVariantLoading(false))
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const variantCategories = useMemo(
    () => Array.from(new Set(variantCatalog.map((v) => v.categoryName).filter(Boolean) as string[])),
    [variantCatalog],
  )
  const variantBrands = useMemo(
    () => Array.from(new Set(variantCatalog.map((v) => v.brandName).filter(Boolean) as string[])),
    [variantCatalog],
  )
  const variantSeasons = useMemo(
    () => Array.from(new Set(variantCatalog.map((v) => v.season).filter(Boolean) as string[])),
    [variantCatalog],
  )

  const filteredVariants = useMemo(() => {
    const q = catalogSearch.toLowerCase()
    return variantCatalog.filter((v) => {
      const matchesSearch =
        q === "" ||
        (v.productName ?? "").toLowerCase().includes(q) ||
        (v.janCode ?? "").toLowerCase().includes(q) ||
        (v.brandName ?? "").toLowerCase().includes(q) ||
        (v.categoryName ?? "").toLowerCase().includes(q) ||
        (v.color ?? "").toLowerCase().includes(q) ||
        (v.size ?? "").toLowerCase().includes(q)
      const matchesCategory = catalogCategoryFilter === "all" || v.categoryName === catalogCategoryFilter
      const matchesBrand = catalogBrandFilter === "all" || v.brandName === catalogBrandFilter
      const matchesSeason = catalogSeasonFilter === "all" || v.season === catalogSeasonFilter
      return matchesSearch && matchesCategory && matchesBrand && matchesSeason
    })
  }, [variantCatalog, catalogSearch, catalogCategoryFilter, catalogBrandFilter, catalogSeasonFilter])

  const filteredProducts = useMemo<CatalogProductGroup[]>(() => {
    const map = new Map<string, CatalogProductGroup>()
    for (const v of filteredVariants) {
      if (!map.has(v.productId)) {
        map.set(v.productId, {
          productId: v.productId,
          productName: v.productName,
          productCode: v.productCode,
          season: v.season,
          brandName: v.brandName,
          categoryName: v.categoryName,
          totalEstimatedStock: 0,
          variants: [],
        })
      }
      const p = map.get(v.productId)!
      p.totalEstimatedStock += v.estimatedStock
      p.variants.push(v)
    }
    return Array.from(map.values())
  }, [filteredVariants])

  const refreshCatalog = () => {
    setVariantLoading(true)
    getInventoryCatalogAction()
      .then(({ variants, categories, brands }) => {
        setVariantCatalog(variants)
        setCategoryMaster(categories)
        setBrandMaster(brands)
      })
      .catch(console.error)
      .finally(() => setVariantLoading(false))
  }

  const openProductEdit = (product: CatalogProductGroup) => {
    setProductSaveError(null)
    setProductForm({
      name: product.productName,
      brandName: product.brandName ?? "",
      categoryName: product.categoryName ?? "",
      season: product.season ?? "",
    })
    setEditingProduct(product)
  }

  const handleSaveProduct = async () => {
    if (!editingProduct) return
    setProductSaving(true)
    setProductSaveError(null)
    const result = await updateProductAction(editingProduct.productId, {
      name: productForm.name,
      brandName: productForm.brandName || null,
      categoryName: productForm.categoryName || null,
      season: productForm.season || null,
    })
    setProductSaving(false)
    if (result?.error) {
      setProductSaveError(result.error)
      return
    }
    setEditingProduct(null)
    refreshCatalog()
  }

  const openVariantEdit = (variant: CatalogVariantRow) => {
    setVariantSaveError(null)
    setVariantForm({
      color: variant.color ?? "",
      size: variant.size ?? "",
      janCode: variant.janCode ?? "",
      priceYen: variant.priceYen != null ? String(variant.priceYen) : "",
    })
    setEditingVariant(variant)
  }

  const handleSaveVariant = async () => {
    if (!editingVariant) return
    setVariantSaving(true)
    setVariantSaveError(null)
    const result = await updateVariantAction(editingVariant.variantId, {
      color: variantForm.color || null,
      size: variantForm.size || null,
      janCode: variantForm.janCode || null,
      priceYen: variantForm.priceYen !== "" ? Number(variantForm.priceYen) : null,
    })
    setVariantSaving(false)
    if (result?.error) {
      setVariantSaveError(result.error)
      return
    }
    setEditingVariant(null)
    refreshCatalog()
  }

  const toggleProduct = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const catalogItemsPerPage = 20
  const catalogTotalPages = Math.max(1, Math.ceil(filteredProducts.length / catalogItemsPerPage))
  const currentCatalogPage = Math.min(catalogPage, catalogTotalPages)
  const catalogStart = (currentCatalogPage - 1) * catalogItemsPerPage
  const catalogEnd = catalogStart + catalogItemsPerPage
  const pagedProducts = filteredProducts.slice(catalogStart, catalogEnd)
  const catalogRangeStart = filteredProducts.length === 0 ? 0 : catalogStart + 1
  const catalogRangeEnd = Math.min(catalogEnd, filteredProducts.length)

  return (
    <div className="p-6">
      <Dialog open={editingProduct !== null} onOpenChange={(open: boolean) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>商品編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">商品名</label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ブランド</label>
              <Select
                value={productForm.brandName}
                onValueChange={(v: string) => setProductForm((p) => ({ ...p, brandName: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ブランドを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {brandMaster.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">カテゴリ</label>
              <Select
                value={productForm.categoryName}
                onValueChange={(v: string) => setProductForm((p) => ({ ...p, categoryName: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {categoryMaster.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">シーズン</label>
              <Select
                value={productForm.season}
                onValueChange={(v: string) => setProductForm((p) => ({ ...p, season: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="シーズン" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="SS">SS</SelectItem>
                  <SelectItem value="AW">AW</SelectItem>
                  <SelectItem value="ALL">ALL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {productSaveError && <p className="text-xs text-red-500">{productSaveError}</p>}
          </div>
          <Button
            className="w-full mt-4 bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
            onClick={handleSaveProduct}
            disabled={productSaving}
          >
            {productSaving ? "保存中..." : "保存"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={editingVariant !== null} onOpenChange={(open: boolean) => !open && setEditingVariant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>SKU編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">カラー</label>
              <Input
                value={variantForm.color}
                onChange={(e) => setVariantForm((v) => ({ ...v, color: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">サイズ</label>
              <Input
                value={variantForm.size}
                onChange={(e) => setVariantForm((v) => ({ ...v, size: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">JAN</label>
              <Input
                value={variantForm.janCode}
                onChange={(e) => setVariantForm((v) => ({ ...v, janCode: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">価格（円）</label>
              <Input
                type="number"
                value={variantForm.priceYen}
                onChange={(e) => setVariantForm((v) => ({ ...v, priceYen: e.target.value }))}
              />
            </div>
            {variantSaveError && <p className="text-xs text-red-500">{variantSaveError}</p>}
          </div>
          <Button
            className="w-full mt-4 bg-[#345fe1] hover:bg-[#2a4bb3] text-white"
            onClick={handleSaveVariant}
            disabled={variantSaving}
          >
            {variantSaving ? "保存中..." : "保存"}
          </Button>
        </DialogContent>
      </Dialog>

      <PageHeader
        eyebrow="Inventory"
        title="商品一覧"
        description="商品DBからの参照"
        icon={BookOpen}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">商品一覧</CardTitle>
              <p className="text-xs text-muted-foreground">商品単位で表示します。▶ をクリックするとSKUを展開できます。</p>
            </div>
            <Badge variant="outline" className="bg-muted/40">
              {variantLoading ? "読み込み中..." : `${filteredProducts.length} 商品 / ${filteredVariants.length} SKU`}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-55">
              <Input
                placeholder="商品名 / JAN / ブランド / カテゴリ / カラー / サイズ"
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value)
                  setCatalogPage(1)
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Select
                value={catalogCategoryFilter}
                onValueChange={(value: string) => {
                  setCatalogCategoryFilter(value)
                  setCatalogPage(1)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="カテゴリ" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">全カテゴリ</SelectItem>
                  {variantCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={catalogBrandFilter}
                onValueChange={(value: string) => {
                  setCatalogBrandFilter(value)
                  setCatalogPage(1)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ブランド" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">全ブランド</SelectItem>
                  {variantBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={catalogSeasonFilter}
                onValueChange={(value: string) => {
                  setCatalogSeasonFilter(value)
                  setCatalogPage(1)
                }}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="シーズン" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">全シーズン</SelectItem>
                  {variantSeasons.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">商品名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">ブランド</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">カテゴリ</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">シーズン</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">SKU数</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">価格</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">推定在庫</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {variantLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      読み込み中...
                    </td>
                  </tr>
                ) : pagedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      条件に一致する商品がありません。
                    </td>
                  </tr>
                ) : (
                  pagedProducts.flatMap((product) => {
                    const isExpanded = expandedProductIds.has(product.productId)
                    return [
                      <tr
                        key={product.productId}
                        className="border-t border-border/70 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleProduct(product.productId)}
                      >
                        <td className="px-3 py-2 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{product.productName}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{product.brandName ?? "-"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{product.categoryName ?? "-"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{product.season ?? "-"}</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">{product.variants.length}件</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">-</td>
                        <td className="px-3 py-2 text-right font-medium">{product.totalEstimatedStock}</td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => openProductEdit(product)}>
                            編集
                          </Button>
                        </td>
                      </tr>,
                      ...(isExpanded
                        ? product.variants.map((variant) => (
                            <tr key={variant.variantId} className="bg-muted/20 border-t border-border/40">
                              <td className="px-3 py-1.5"></td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground pl-6">
                                <span className="text-foreground/60 mr-2">└</span>
                                {[variant.color, variant.size].filter(Boolean).join(" / ") || "−"}
                                {variant.janCode && (
                                  <span className="ml-2 text-muted-foreground/70">JAN: {variant.janCode}</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">-</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">-</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">-</td>
                              <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">-</td>
                              <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">
                                {variant.priceYen != null ? formatCurrency(variant.priceYen) : "-"}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs">{variant.estimatedStock}</td>
                              <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs px-2"
                                  onClick={() => openVariantEdit(variant)}
                                >
                                  編集
                                </Button>
                              </td>
                            </tr>
                          ))
                        : []),
                    ]
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {filteredProducts.length === 0
                ? "0 件"
                : `${catalogRangeStart}-${catalogRangeEnd} 件 / ${filteredProducts.length} 商品`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogPage((prev) => Math.max(1, prev - 1))}
                disabled={currentCatalogPage === 1}
              >
                前へ
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentCatalogPage} / {catalogTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogPage((prev) => Math.min(catalogTotalPages, prev + 1))}
                disabled={currentCatalogPage === catalogTotalPages}
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
