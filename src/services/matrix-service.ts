import { prisma } from "@/src/lib/prisma"
import { Prisma } from "@prisma/client"

export type MatrixFilterParams = {
  periodFrom?: string // "2025-01"
  periodTo?: string   // "2025-12"
}

export type CustomerMatrixRow = {
  name: string
  sales: number
  grossMargin: number
  grossProfit: number
  manager: string
}

export type ProductMatrixRow = {
  name: string
  sales: number
  grossMargin: number
  grossProfit: number
  category: string
  brand: string
}

type RawCustomerRow = {
  name: string
  salesYen: bigint
  grossProfitYen: bigint
  manager: string | null
}

type RawProductRow = {
  name: string
  category: string
  brand: string
  salesYen: bigint
  grossProfitYen: bigint
}

function buildPeriodFilter(periodFrom?: string, periodTo?: string): Prisma.Sql {
  const parts: Prisma.Sql[] = []
  if (periodFrom) parts.push(Prisma.sql`AND sf.period_ym >= ${new Date(`${periodFrom}-01`)}::date`)
  if (periodTo) parts.push(Prisma.sql`AND sf.period_ym <= ${new Date(`${periodTo}-01`)}::date`)
  return parts.length > 0 ? Prisma.join(parts, " ") : Prisma.sql``
}

export async function getCustomerMatrixData(
  filter: MatrixFilterParams,
): Promise<CustomerMatrixRow[]> {
  const periodFilter = buildPeriodFilter(filter.periodFrom, filter.periodTo)
  const rows = await prisma.$queryRaw<RawCustomerRow[]>`
    SELECT
      COALESCE(sf.customer_category1_name, '未設定') AS name,
      SUM(sf.net_sales_yen)::bigint                   AS "salesYen",
      SUM(sf.gross_profit_yen)::bigint                AS "grossProfitYen",
      MIN(sf.staff_name)                              AS manager
    FROM sales_fact sf
    WHERE sf.deleted_at IS NULL
      AND sf.customer_category1_name IS NOT NULL
      ${periodFilter}
    GROUP BY 1
    HAVING SUM(sf.net_sales_yen) > 0
    ORDER BY SUM(sf.net_sales_yen) DESC
  `
  return rows.map((r) => {
    const sales = Number(r.salesYen)
    const grossProfit = Number(r.grossProfitYen)
    return {
      name: r.name,
      sales,
      grossProfit,
      grossMargin: sales > 0 ? Math.round((grossProfit / sales) * 1000) / 10 : 0,
      manager: r.manager ?? "",
    }
  })
}

export async function getProductMatrixData(
  filter: MatrixFilterParams,
): Promise<ProductMatrixRow[]> {
  const periodFilter = buildPeriodFilter(filter.periodFrom, filter.periodTo)
  const rows = await prisma.$queryRaw<RawProductRow[]>`
    SELECT
      COALESCE(sf.product_name1, '未設定')  AS name,
      COALESCE(sf.cs1_name, '未設定')       AS category,
      COALESCE(sf.brand_name, '未設定')     AS brand,
      SUM(sf.net_sales_yen)::bigint         AS "salesYen",
      SUM(sf.gross_profit_yen)::bigint      AS "grossProfitYen"
    FROM sales_fact sf
    WHERE sf.deleted_at IS NULL
      AND sf.product_code IS NOT NULL
      ${periodFilter}
    GROUP BY sf.product_code, sf.product_name1, sf.cs1_name, sf.brand_name
    HAVING SUM(sf.net_sales_yen) > 0
    ORDER BY SUM(sf.net_sales_yen) DESC
  `
  return rows.map((r) => {
    const sales = Number(r.salesYen)
    const grossProfit = Number(r.grossProfitYen)
    return {
      name: r.name,
      sales,
      grossProfit,
      grossMargin: sales > 0 ? Math.round((grossProfit / sales) * 1000) / 10 : 0,
      category: r.category,
      brand: r.brand,
    }
  })
}
