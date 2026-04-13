"use server"

import { unstable_cache, revalidateTag } from "next/cache"
import * as svc from "@/src/services/insights-service"

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
    const data = await cachedSalesComposition(groupBy)
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getYearlyComparisonAction() {
  try {
    const data = await cachedYearlyComparison()
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getStockTurnoverAction() {
  try {
    const data = await cachedStockTurnover()
    return { success: true as const, data }
  } catch (e) {
    console.error("[getStockTurnoverAction]", e)
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getSalesForecastAction(category: string | null) {
  try {
    const data = await cachedSalesForecast(category)
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getTurnoverRankingAction() {
  try {
    const data = await cachedTurnoverRanking()
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getCategoryAgingAction() {
  try {
    const data = await cachedCategoryAging()
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function getInventoryAlertAction() {
  try {
    const data = await cachedInventoryAlert()
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: "データの取得に失敗しました" }
  }
}

export async function revalidateInsightsCache() {
  revalidateTag("insights")
}
