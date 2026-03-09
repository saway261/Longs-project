import { prisma } from "@/src/lib/prisma"

export type CatalogVariantRow = {
  variantId: string
  productId: string
  productName: string
  productCode: string | null
  season: string | null
  brandName: string | null
  categoryName: string | null
  color: string | null
  size: string | null
  janCode: string | null
  priceYen: number | null
  snapshotClosingQty: number | null
  snapshotPeriod: string | null
  soldSinceSnapshot: number
  estimatedStock: number
}

type RawRow = {
  variantId: string
  productId: string
  productName: string
  productCode: string | null
  season: string | null
  brandName: string | null
  categoryName: string | null
  color: string | null
  size: string | null
  janCode: string | null
  priceYen: bigint | null
  snapshotClosingQty: number | null
  snapshotPeriod: Date | null
  soldSinceSnapshot: bigint
  estimatedStock: number
}

export type CatalogResult = {
  variants: CatalogVariantRow[]
  categories: MasterItem[]
  brands: MasterItem[]
}

export async function getInventoryCatalog(): Promise<CatalogResult> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      pv.id::text                                          AS "variantId",
      p.id::text                                           AS "productId",
      p.name                                               AS "productName",
      p.product_code                                       AS "productCode",
      p.season                                             AS "season",
      pb.name                                              AS "brandName",
      pc.name                                              AS "categoryName",
      pv.color, pv.size,
      pv.jan_code                                          AS "janCode",
      pv.price_yen                                         AS "priceYen",
      snap.closing_qty                                     AS "snapshotClosingQty",
      snap.period_ym                                       AS "snapshotPeriod",
      COALESCE(sales_agg.sold_qty, 0)                      AS "soldSinceSnapshot",
      (COALESCE(snap.closing_qty, 0) - COALESCE(sales_agg.sold_qty, 0))::int
                                                           AS "estimatedStock"
    FROM product_variant pv
    JOIN product p ON p.id = pv.product_id
    LEFT JOIN product_brand pb ON pb.id = p.brand_id
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT closing_qty, period_ym
      FROM inventory_snapshot_fact
      WHERE jan_code = pv.jan_code AND deleted_at IS NULL
      ORDER BY period_ym DESC LIMIT 1
    ) snap ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(net_qty), 0) AS sold_qty
      FROM sales_fact
      WHERE jan_code = pv.jan_code
        AND deleted_at IS NULL
        AND (snap.period_ym IS NULL OR DATE_TRUNC('month', sales_date) > snap.period_ym)
    ) sales_agg ON true
    ORDER BY p.name, pv.color, pv.size
  `

  const [categories, brands] = await Promise.all([
    getCategoryMaster(),
    getBrandMaster(),
  ])

  const variants = rows.map((row) => ({
    variantId: row.variantId,
    productId: row.productId,
    productName: row.productName,
    productCode: row.productCode,
    season: row.season,
    brandName: row.brandName,
    categoryName: row.categoryName,
    color: row.color,
    size: row.size,
    janCode: row.janCode,
    priceYen: row.priceYen != null ? Number(row.priceYen) : null,
    snapshotClosingQty: row.snapshotClosingQty,
    snapshotPeriod: row.snapshotPeriod ? row.snapshotPeriod.toISOString().slice(0, 10) : null,
    soldSinceSnapshot: Number(row.soldSinceSnapshot),
    estimatedStock: row.estimatedStock,
  }))

  return { variants, categories, brands }
}

// ============================================================
// 商品・バリアント更新
// ============================================================

export async function updateProduct(
  productId: string,
  data: { name: string; brandName: string | null; categoryName: string | null; season: string | null },
): Promise<void> {
  const brand = data.brandName
    ? await prisma.productBrand.findFirst({ where: { name: data.brandName }, select: { id: true } })
    : null
  const category = data.categoryName
    ? await prisma.productCategory.findFirst({ where: { name: data.categoryName, deletedAt: null }, select: { id: true } })
    : null
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      brandId: brand?.id ?? null,
      categoryId: category?.id ?? null,
      season: data.season || null,
    },
  })
}

export async function updateVariant(
  variantId: string,
  data: { color: string | null; size: string | null; janCode: string | null; priceYen: number | null },
): Promise<void> {
  await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      color: data.color || null,
      size: data.size || null,
      janCode: data.janCode || null,
      priceYen: data.priceYen != null ? BigInt(data.priceYen) : null,
    },
  })
}

// ============================================================
// マスタ取得
// ============================================================

export type MasterItem = { id: string; name: string }

export async function getCategoryMaster(): Promise<MasterItem[]> {
  const rows = await prisma.productCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return rows
}

export async function getBrandMaster(): Promise<MasterItem[]> {
  const rows = await prisma.productBrand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return rows
}

// ============================================================
// 仕入れリスト
// ============================================================

export type ProcurementItemRow = {
  itemId: string
  listId: string
  variantId: string
  janCode: string | null
  productName: string
  color: string | null
  size: string | null
  categoryName: string | null
  estimatedStock: number
  priceYen: number | null
  suggestedQty: number | null
  orderQty: number
  status: "high" | "overstock" | "normal"
  addedAt: string
  orderedAt: string | null
}

type RawProcurementRow = {
  itemId: string
  listId: string
  variantId: string
  janCode: string | null
  productName: string
  color: string | null
  size: string | null
  categoryName: string | null
  estimatedStock: number
  priceYen: bigint | null
  suggestedQty: number | null
  orderQty: bigint | number
  status: string
  addedAt: Date
  orderedAt: Date | null
}

export async function getOrCreateDraftList(userId: string): Promise<string> {
  const existing = await prisma.procurementList.findFirst({
    where: { status: "draft", createdBy: userId },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.procurementList.create({
    data: { status: "draft", createdBy: userId },
    select: { id: true },
  })
  return created.id
}

export async function getProcurementListForUser(
  userId: string,
): Promise<{ listId: string; items: ProcurementItemRow[] }> {
  const listId = await getOrCreateDraftList(userId)

  const rows = await prisma.$queryRaw<RawProcurementRow[]>`
    SELECT
      pi.id::text                                              AS "itemId",
      pi.list_id::text                                         AS "listId",
      pi.variant_id::text                                      AS "variantId",
      pv.jan_code                                              AS "janCode",
      p.name                                                   AS "productName",
      pv.color, pv.size,
      pc.name                                                  AS "categoryName",
      (COALESCE(snap.closing_qty, 0) - COALESCE(sales_agg.sold_qty, 0))::int
                                                               AS "estimatedStock",
      pi.price_yen                                             AS "priceYen",
      pi.suggested_qty                                         AS "suggestedQty",
      COALESCE(pi.order_qty, 0)                                AS "orderQty",
      pi.status::text                                          AS "status",
      pi.added_at                                              AS "addedAt",
      pi.ordered_at                                            AS "orderedAt"
    FROM procurement_item pi
    JOIN product_variant pv ON pv.id = pi.variant_id
    JOIN product p ON p.id = pv.product_id
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT closing_qty, period_ym
      FROM inventory_snapshot_fact
      WHERE jan_code = pv.jan_code AND deleted_at IS NULL
      ORDER BY period_ym DESC LIMIT 1
    ) snap ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(net_qty), 0) AS sold_qty
      FROM sales_fact
      WHERE jan_code = pv.jan_code AND deleted_at IS NULL
        AND (snap.period_ym IS NULL OR DATE_TRUNC('month', sales_date) > snap.period_ym)
    ) sales_agg ON true
    WHERE pi.list_id = ${listId}::uuid
    ORDER BY pi.added_at ASC
  `

  const items: ProcurementItemRow[] = rows.map((row) => ({
    itemId: row.itemId,
    listId: row.listId,
    variantId: row.variantId,
    janCode: row.janCode,
    productName: row.productName,
    color: row.color,
    size: row.size,
    categoryName: row.categoryName,
    estimatedStock: row.estimatedStock,
    priceYen: row.priceYen != null ? Number(row.priceYen) : null,
    suggestedQty: row.suggestedQty,
    orderQty: Number(row.orderQty),
    status: row.status as "high" | "overstock" | "normal",
    addedAt: row.addedAt instanceof Date ? row.addedAt.toISOString() : String(row.addedAt),
    orderedAt: row.orderedAt instanceof Date ? row.orderedAt.toISOString() : row.orderedAt ? String(row.orderedAt) : null,
  }))

  return { listId, items }
}

export async function addProcurementItem(
  listId: string,
  variantId: string,
  suggestedQty: number | null,
  priceYen: number | null,
  status: "high" | "overstock" | "normal",
): Promise<string> {
  const existing = await prisma.procurementItem.findFirst({
    where: { listId, variantId },
    select: { id: true },
  })
  if (existing) return existing.id
  const created = await prisma.procurementItem.create({
    data: {
      listId,
      variantId,
      suggestedQty,
      orderQty: suggestedQty ?? 1,
      priceYen: priceYen != null ? BigInt(priceYen) : null,
      status,
    },
    select: { id: true },
  })
  return created.id
}

export async function removeProcurementItem(itemId: string): Promise<void> {
  await prisma.procurementItem.delete({ where: { id: itemId } })
}

export async function updateProcurementItemQty(itemId: string, qty: number): Promise<void> {
  await prisma.procurementItem.update({
    where: { id: itemId },
    data: { orderQty: Math.max(0, qty) },
  })
}

export async function markProcurementItemOrdered(itemId: string): Promise<void> {
  await prisma.procurementItem.update({ where: { id: itemId }, data: { orderedAt: new Date() } })
}

export async function clearProcurementList(listId: string): Promise<void> {
  await prisma.procurementItem.deleteMany({ where: { listId, orderedAt: null } })
}
