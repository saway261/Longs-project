import { prisma } from "@/src/lib/prisma"
import { getInventoryTurnoverPeriodMonths } from "@/src/services/settings-service"

const COMPOSITION_COLORS = [
  "#dbeafe",
  "#dcfce7",
  "#ffedd5",
  "#ede9fe",
  "#fce7f3",
  "#fef9c3",
  "#e0f2fe",
]

// ── 1. 売上構成 ────────────────────────────────────────────────────────────────
// groupBy="category": sales_fact.product_code → product → product_category
// groupBy="brand":    sales_fact.brand_name（ファクトテーブルに直接格納済み）

export type SalesCompositionItem = {
  name: string
  value: number
  salesYen: number
  color: string
}

export type SalesCompositionData = {
  items: SalesCompositionItem[]
  totalYen: number
}

type RawCompositionRow = { name: string; salesYen: bigint }

export async function getSalesCompositionData(
  groupBy: "category" | "brand",
): Promise<SalesCompositionData> {
  const currentYear = new Date().getFullYear()

  let rows: RawCompositionRow[]
  if (groupBy === "category") {
    rows = await prisma.$queryRaw<RawCompositionRow[]>`
      SELECT
        COALESCE(pc.name, '未設定') AS name,
        SUM(sf.net_sales_yen)::bigint AS "salesYen"
      FROM sales_fact sf
      LEFT JOIN product p  ON p.product_code = sf.product_code
      LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
      WHERE sf.deleted_at IS NULL
        AND EXTRACT(YEAR FROM sf.period_ym) = ${currentYear}
      GROUP BY 1
      ORDER BY "salesYen" DESC
    `
  } else {
    rows = await prisma.$queryRaw<RawCompositionRow[]>`
      SELECT
        COALESCE(sf.brand_name, '未設定') AS name,
        SUM(sf.net_sales_yen)::bigint AS "salesYen"
      FROM sales_fact sf
      WHERE sf.deleted_at IS NULL
        AND EXTRACT(YEAR FROM sf.period_ym) = ${currentYear}
      GROUP BY 1
      ORDER BY "salesYen" DESC
    `
  }

  const totalYen = rows.reduce((sum, r) => sum + Number(r.salesYen), 0)
  const items: SalesCompositionItem[] = rows.map((r, i) => ({
    name: r.name,
    salesYen: Number(r.salesYen),
    value: totalYen > 0 ? Math.round((Number(r.salesYen) / totalYen) * 100) : 0,
    color: COMPOSITION_COLORS[i % COMPOSITION_COLORS.length],
  }))

  return { items, totalYen }
}

// ── 2. 前年比較 ────────────────────────────────────────────────────────────────

export type MonthlyComparisonRow = { month: string; 今年: number; 昨年: number }

export type YearlyComparisonData = {
  rows: MonthlyComparisonRow[]
  currentYear: number
  priorYear: number
}

type RawYearlyRow = { yr: number; mo: number; salesYen: bigint }

export async function getYearlyComparisonData(): Promise<YearlyComparisonData> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const priorYear = currentYear - 1
  const periodStart = new Date(currentYear - 1, 0, 1)

  const rows = await prisma.$queryRaw<RawYearlyRow[]>`
    SELECT
      EXTRACT(YEAR FROM period_ym)::int  AS yr,
      EXTRACT(MONTH FROM period_ym)::int AS mo,
      SUM(net_sales_yen)::bigint          AS "salesYen"
    FROM sales_fact
    WHERE deleted_at IS NULL
      AND period_ym >= ${periodStart}::date
    GROUP BY 1, 2
    ORDER BY 1, 2
  `

  const byYearMonth: Record<string, number> = {}
  for (const r of rows) {
    byYearMonth[`${r.yr}-${r.mo}`] = Math.round(Number(r.salesYen) / 10000)
  }

  const result: MonthlyComparisonRow[] = []
  for (let mo = 1; mo <= 12; mo++) {
    result.push({
      month: `${mo}月`,
      今年: byYearMonth[`${currentYear}-${mo}`] ?? 0,
      昨年: byYearMonth[`${priorYear}-${mo}`] ?? 0,
    })
  }

  return { rows: result, currentYear, priorYear }
}

// ── 3. 在庫回転率 ──────────────────────────────────────────────────────────────
// sales_fact.product_code → product → product_category
// inventory_snapshot_fact.jan_code → product_variant → product → product_category

export type StockTurnoverRow = { category: string; 回転率: number; 目標: number }

type RawSalesAgg = { categoryName: string; salesYen: bigint }
type RawInvAgg = { categoryName: string; avgClosingYen: number }

export async function getStockTurnoverData(): Promise<StockTurnoverRow[]> {
  const periodMonths = await getInventoryTurnoverPeriodMonths()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1)

  const salesRows = await prisma.$queryRaw<RawSalesAgg[]>`
    SELECT
      COALESCE(pc.name, '未設定') AS "categoryName",
      SUM(sf.net_sales_yen)::bigint AS "salesYen"
    FROM sales_fact sf
    LEFT JOIN product p  ON p.product_code = sf.product_code
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    WHERE sf.deleted_at IS NULL AND sf.period_ym >= ${periodStart}::date
    GROUP BY 1
  `

  const invRows = await prisma.$queryRaw<RawInvAgg[]>`
    SELECT
      COALESCE(pc.name, '未設定') AS "categoryName",
      SUM(isf.closing_yen)::float / NULLIF(COUNT(DISTINCT isf.period_ym)::float, 0) AS "avgClosingYen"
    FROM inventory_snapshot_fact isf
    LEFT JOIN product_variant pv ON pv.jan_code = isf.jan_code
    LEFT JOIN product p  ON p.id = pv.product_id
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    WHERE isf.deleted_at IS NULL AND isf.period_ym >= ${periodStart}::date
    GROUP BY 1
  `

  const categories = await prisma.productCategory.findMany({
    where: { deletedAt: null },
    select: { name: true, sellThroughDays: true },
  })
  const targetMap: Record<string, number> = {}
  for (const c of categories) {
    targetMap[c.name] = Math.round((10 * 12) / (c.sellThroughDays / 30)) / 10
  }

  const salesMap: Record<string, number> = {}
  for (const r of salesRows) salesMap[r.categoryName] = Number(r.salesYen)

  const invMap: Record<string, number> = {}
  for (const r of invRows) invMap[r.categoryName] = r.avgClosingYen

  const result: StockTurnoverRow[] = []
  for (const categoryName of Object.keys(salesMap)) {
    if (!(categoryName in targetMap)) continue
    const avgClosingYen = invMap[categoryName] ?? 0
    if (avgClosingYen <= 0) continue
    const 回転率 =
      Math.round(((salesMap[categoryName] / avgClosingYen) * (12 / periodMonths)) * 10) / 10
    result.push({ category: categoryName, 回転率, 目標: targetMap[categoryName] })
  }

  return result
}

// ── 4. 売上予測 ────────────────────────────────────────────────────────────────
// カテゴリフィルタ: sales_fact.product_code → product → product_category

export type SalesForecastRow = { month: string; 過去売上: number; 現在売上: number | null }

export type SalesForecastData = {
  rows: SalesForecastRow[]
  availableCategories: string[]
}

type RawForecastRow = { yr: number; mo: number; salesYen: bigint }
type RawCategoryRow = { categoryName: string }

export async function getSalesForecastData(
  category: string | null,
): Promise<SalesForecastData> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const priorYear = currentYear - 1
  const periodStart = new Date(priorYear, 0, 1)

  let rows: RawForecastRow[]
  if (category) {
    rows = await prisma.$queryRaw<RawForecastRow[]>`
      SELECT
        EXTRACT(YEAR FROM sf.period_ym)::int  AS yr,
        EXTRACT(MONTH FROM sf.period_ym)::int AS mo,
        SUM(sf.net_sales_yen)::bigint          AS "salesYen"
      FROM sales_fact sf
      LEFT JOIN product p  ON p.product_code = sf.product_code
      LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
      WHERE sf.deleted_at IS NULL
        AND sf.period_ym >= ${periodStart}::date
        AND pc.name = ${category}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `
  } else {
    rows = await prisma.$queryRaw<RawForecastRow[]>`
      SELECT
        EXTRACT(YEAR FROM period_ym)::int  AS yr,
        EXTRACT(MONTH FROM period_ym)::int AS mo,
        SUM(net_sales_yen)::bigint          AS "salesYen"
      FROM sales_fact
      WHERE deleted_at IS NULL
        AND period_ym >= ${periodStart}::date
      GROUP BY 1, 2
      ORDER BY 1, 2
    `
  }

  // 利用可能なカテゴリ一覧（sales_factに実績があるもの）
  const catRows = await prisma.$queryRaw<RawCategoryRow[]>`
    SELECT DISTINCT COALESCE(pc.name, '未設定') AS "categoryName"
    FROM sales_fact sf
    LEFT JOIN product p  ON p.product_code = sf.product_code
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    WHERE sf.deleted_at IS NULL AND pc.name IS NOT NULL
    ORDER BY "categoryName"
  `

  const byYearMonth: Record<string, number> = {}
  for (const r of rows) {
    byYearMonth[`${r.yr}-${r.mo}`] = Math.round(Number(r.salesYen) / 10000)
  }

  const currentMonthNum = now.getMonth() + 1
  const result: SalesForecastRow[] = []
  for (let mo = 1; mo <= 12; mo++) {
    const 過去売上 = byYearMonth[`${priorYear}-${mo}`] ?? 0
    const thisYearVal = byYearMonth[`${currentYear}-${mo}`]
    const 現在売上 = mo <= currentMonthNum ? (thisYearVal ?? 0) : null
    result.push({ month: `${mo}月`, 過去売上, 現在売上 })
  }

  return {
    rows: result,
    availableCategories: catRows.map((r) => r.categoryName),
  }
}

// ── 5. 回転率ランキング ────────────────────────────────────────────────────────
// sales_fact: brand_name は直接格納済み、category は product_code 経由で取得
// inventory_snapshot_fact: brand_name は jan_code → product_variant → product → product_brand 経由

export type TurnoverRankingRow = {
  rank: number
  brand: string
  category: string
  rotation: number
  quantity: number
}

type RawRankingRow = {
  brand: string
  category: string
  salesYen: bigint
  netQty: number
  avgClosingYen: number
}

export async function getTurnoverRankingData(limit = 200): Promise<TurnoverRankingRow[]> {
  const periodMonths = await getInventoryTurnoverPeriodMonths()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1)

  const rows = await prisma.$queryRaw<RawRankingRow[]>`
    WITH sales_agg AS (
      SELECT
        COALESCE(sf.brand_name, '未設定')    AS brand,
        COALESCE(pc.name, '未設定')           AS category,
        SUM(sf.net_sales_yen)::bigint         AS "salesYen",
        SUM(sf.net_qty)::int                  AS "netQty"
      FROM sales_fact sf
      LEFT JOIN product p  ON p.product_code = sf.product_code
      LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
      WHERE sf.deleted_at IS NULL AND sf.period_ym >= ${periodStart}::date
      GROUP BY 1, 2
    ),
    inv_agg AS (
      SELECT
        COALESCE(pb.name, '未設定')                                                        AS brand,
        SUM(isf.closing_yen)::float / NULLIF(COUNT(DISTINCT isf.period_ym)::float, 0)     AS "avgClosingYen"
      FROM inventory_snapshot_fact isf
      LEFT JOIN product_variant pv ON pv.jan_code = isf.jan_code
      LEFT JOIN product p  ON p.id = pv.product_id
      LEFT JOIN product_brand pb ON pb.id = p.brand_id
      WHERE isf.deleted_at IS NULL AND isf.period_ym >= ${periodStart}::date
      GROUP BY 1
    )
    SELECT s.brand, s.category, s."salesYen", s."netQty", i."avgClosingYen"
    FROM sales_agg s
    JOIN inv_agg i ON i.brand = s.brand
    WHERE i."avgClosingYen" > 0
    ORDER BY s."salesYen"::float / i."avgClosingYen" DESC
    LIMIT ${limit}
  `

  return rows.map((r, i) => ({
    rank: i + 1,
    brand: r.brand,
    category: r.category,
    rotation:
      Math.round(
        ((Number(r.salesYen) / r.avgClosingYen) * (12 / periodMonths)) * 10,
      ) / 10,
    quantity: Number(r.netQty),
  }))
}

// ── 6. カテゴリ別エイジング ────────────────────────────────────────────────────
// inventory_snapshot_fact: jan_code → product_variant → product → product_category
// sales_fact: product_code → product → product_category

export type CategoryAgingRow = {
  category: string
  days: number
  target: number
  status: "ok" | "warn" | "alert"
}

type RawSnapRow = { categoryName: string; currentQty: bigint }
type RawVelocityRow = { categoryName: string; totalQty: bigint; monthCount: bigint }

export async function getCategoryAgingData(): Promise<CategoryAgingRow[]> {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  // 最新スナップショット月
  const latestPeriodRow = await prisma.$queryRaw<{ maxPeriod: Date | null }[]>`
    SELECT MAX(period_ym) AS "maxPeriod" FROM inventory_snapshot_fact WHERE deleted_at IS NULL
  `
  const maxPeriod = latestPeriodRow[0]?.maxPeriod

  let snapRows: RawSnapRow[] = []
  if (maxPeriod) {
    snapRows = await prisma.$queryRaw<RawSnapRow[]>`
      SELECT
        COALESCE(pc.name, '未設定') AS "categoryName",
        SUM(isf.closing_qty)::bigint AS "currentQty"
      FROM inventory_snapshot_fact isf
      LEFT JOIN product_variant pv ON pv.jan_code = isf.jan_code
      LEFT JOIN product p  ON p.id = pv.product_id
      LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
      WHERE isf.deleted_at IS NULL AND isf.period_ym = ${maxPeriod}::date
      GROUP BY 1
    `
  }

  const velocityRows = await prisma.$queryRaw<RawVelocityRow[]>`
    SELECT
      COALESCE(pc.name, '未設定')                               AS "categoryName",
      SUM(sf.net_qty)::bigint                                   AS "totalQty",
      COUNT(DISTINCT DATE_TRUNC('month', sf.period_ym))::bigint AS "monthCount"
    FROM sales_fact sf
    LEFT JOIN product p  ON p.product_code = sf.product_code
    LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
    WHERE sf.deleted_at IS NULL AND sf.period_ym >= ${threeMonthsAgo}::date
    GROUP BY 1
  `

  const categories = await prisma.productCategory.findMany({
    where: { deletedAt: null },
    select: { name: true, sellThroughDays: true },
  })
  const targetMap: Record<string, number> = {}
  for (const c of categories) targetMap[c.name] = c.sellThroughDays

  const snapMap: Record<string, number> = {}
  for (const r of snapRows) snapMap[r.categoryName] = Number(r.currentQty)

  const result: CategoryAgingRow[] = []
  for (const r of velocityRows) {
    const target = targetMap[r.categoryName]
    if (target == null) continue
    const totalQty = Number(r.totalQty)
    const monthCount = Number(r.monthCount)
    const currentQty = snapMap[r.categoryName] ?? 0
    const dailyVelocity = monthCount > 0 ? totalQty / (monthCount * 30) : 0
    const days = dailyVelocity > 0 ? Math.round(currentQty / dailyVelocity) : 0

    let status: CategoryAgingRow["status"] = "ok"
    if (days > target * 1.3) status = "alert"
    else if (days > target) status = "warn"

    result.push({ category: r.categoryName, days, target, status })
  }

  return result
}

// ── 7. 在庫アラート ────────────────────────────────────────────────────────────
// latest_snap: inventory_snapshot_fact.jan_code → product_variant → product → product_category
// velocity:    sales_fact.jan_code → 直接集計

export type InventoryAlertItem = {
  id: string
  type: "low_stock" | "overstock" | "expiring"
  severity: "critical" | "warning" | "info"
  product: string
  productId: string
  category: string
  currentStock: number
  threshold: number
  message: string
  date: string
}

type RawAlertRow = {
  productCode: string
  productName: string
  categoryName: string
  closingQty: bigint
  dailySalesQty: number
}

export async function getInventoryAlertData(): Promise<InventoryAlertItem[]> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const rows = await prisma.$queryRaw<RawAlertRow[]>`
    WITH latest_snap AS (
      SELECT DISTINCT ON (isf.jan_code)
        isf.jan_code,
        COALESCE(p.product_code, isf.jan_code)        AS "productCode",
        COALESCE(p.name, '商品名未設定')               AS "productName",
        COALESCE(pc.name, '未設定')                    AS "categoryName",
        isf.closing_qty                                AS "closingQty"
      FROM inventory_snapshot_fact isf
      LEFT JOIN product_variant pv ON pv.jan_code = isf.jan_code
      LEFT JOIN product p  ON p.id = pv.product_id
      LEFT JOIN product_category pc ON pc.id = p.category_id AND pc.deleted_at IS NULL
      WHERE isf.deleted_at IS NULL
      ORDER BY isf.jan_code, isf.period_ym DESC
    ),
    velocity AS (
      SELECT
        jan_code,
        COALESCE(SUM(net_qty), 0)::float / 90.0 AS "dailySalesQty"
      FROM sales_fact
      WHERE deleted_at IS NULL AND sales_date >= ${ninetyDaysAgo}::date
      GROUP BY jan_code
    )
    SELECT
      ls."productCode",
      ls."productName",
      ls."categoryName",
      ls."closingQty",
      COALESCE(v."dailySalesQty", 0) AS "dailySalesQty"
    FROM latest_snap ls
    LEFT JOIN velocity v ON v.jan_code = ls.jan_code
    WHERE ls."closingQty" > 0
  `

  const categories = await prisma.productCategory.findMany({
    where: { deletedAt: null },
    select: { name: true, sellThroughDays: true },
  })
  const sellThroughMap: Record<string, number> = {}
  for (const c of categories) sellThroughMap[c.name] = c.sellThroughDays

  const alerts: InventoryAlertItem[] = []
  const dateStr = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })

  for (const r of rows) {
    const closingQty = Number(r.closingQty)
    const daysOfStock =
      r.dailySalesQty > 0 ? Math.round(closingQty / r.dailySalesQty) : null

    if (daysOfStock !== null && daysOfStock < 14) {
      const severity: "critical" | "warning" = daysOfStock < 7 ? "critical" : "warning"
      const threshold = severity === "critical" ? 7 : 14
      alerts.push({
        id: `low_${r.productCode}`,
        type: "low_stock",
        severity,
        product: r.productName,
        productId: r.productCode,
        category: r.categoryName,
        currentStock: closingQty,
        threshold,
        message:
          severity === "critical"
            ? "在庫が危険水準です。即座に発注が必要です。"
            : "来週の需要予測に対して在庫が不足しています。",
        date: dateStr,
      })
    } else if (daysOfStock !== null && daysOfStock > 90) {
      const severity: "warning" | "info" = daysOfStock > 180 ? "warning" : "info"
      alerts.push({
        id: `over_${r.productCode}`,
        type: "overstock",
        severity,
        product: r.productName,
        productId: r.productCode,
        category: r.categoryName,
        currentStock: closingQty,
        threshold: 90,
        message: "在庫過剰です。セール販売を検討してください。",
        date: dateStr,
      })
    }

    const sellThrough = sellThroughMap[r.categoryName]
    if (sellThrough && daysOfStock !== null && daysOfStock > sellThrough * 1.3) {
      alerts.push({
        id: `exp_${r.productCode}`,
        type: "expiring",
        severity: "warning",
        product: r.productName,
        productId: r.productCode,
        category: r.categoryName,
        currentStock: closingQty,
        threshold: sellThrough,
        message: "季節商品のため、在庫消化が必要です。",
        date: dateStr,
      })
    }
  }

  return alerts
}
