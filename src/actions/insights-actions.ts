"use server"

import { unstable_cache, revalidateTag } from "next/cache"
import * as svc from "@/src/services/insights-service"
import { requireRole } from "@/src/lib/permissions"

export type {
  SalesCompositionData,
  SalesCompositionItem,
  YearlyComparisonData,
  MonthlyComparisonRow,
  StockTurnoverRow,
  SalesForecastData,
  SalesForecastRow,
  TurnoverRankingRow,
  CategoryAgingRow,
  InventoryAlertItem,
} from "@/src/services/insights-service"

const TTL = parseInt(process.env.INSIGHTS_CACHE_TTL_SECONDS ?? "86400")
const cacheOpts = { revalidate: TTL > 0 ? TTL : 1, tags: ["insights"] }

const cachedSalesComposition = unstable_cache(
  (groupBy: "category" | "brand") => svc.getSalesCompositionData(groupBy),
  ["insights-sales-composition"],
  cacheOpts,
)
const cachedYearlyComparison = unstable_cache(
  () => svc.getYearlyComparisonData(),
  ["insights-yearly-comparison"],
  cacheOpts,
)
const cachedStockTurnover = unstable_cache(
  () => svc.getStockTurnoverData(),
  ["insights-stock-turnover"],
  cacheOpts,
)
const cachedSalesForecast = unstable_cache(
  (category: string | null) => svc.getSalesForecastData(category),
  ["insights-sales-forecast"],
  cacheOpts,
)
const cachedTurnoverRanking = unstable_cache(
  () => svc.getTurnoverRankingData(),
  ["insights-turnover-ranking"],
  cacheOpts,
)
const cachedCategoryAging = unstable_cache(
  () => svc.getCategoryAgingData(),
  ["insights-category-aging"],
  cacheOpts,
)
const cachedInventoryAlert = unstable_cache(
  () => svc.getInventoryAlertData(),
  ["insights-inventory-alert"],
  cacheOpts,
)

export async function getSalesCompositionAction(groupBy: "category" | "brand") {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedSalesComposition(groupBy)
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getYearlyComparisonAction() {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedYearlyComparison()
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getStockTurnoverAction() {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedStockTurnover()
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    console.error("[getStockTurnoverAction]", e)
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getSalesForecastAction(category: string | null) {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedSalesForecast(category)
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getTurnoverRankingAction() {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedTurnoverRanking()
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getCategoryAgingAction() {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedCategoryAging()
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getInventoryAlertAction() {
  try {
    await requireRole(["admin", "manager"])
    const data = await cachedInventoryAlert()
    return { success: true as const, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false as const, error: e.message }
    }
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function revalidateInsightsCache() {
  revalidateTag("insights", "default")
}
