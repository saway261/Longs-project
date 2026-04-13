"use server"

import {
  getGanttEntries,
  getReservePolicies,
  updateReservePolicy,
  getFinanceOverviewStats,
  updateTotalAssetsYen,
  type FinanceOverviewStats,
} from "@/src/services/finance-service"
import {
  getInventoryHubData,
  type PeriodOption,
  type InventoryHubData,
} from "@/src/services/data-service"

export type { InventoryHubData } from "@/src/services/data-service"

export async function getInventoryHubDataAction(
  period: PeriodOption,
): Promise<{ success: true; data: InventoryHubData } | { success: false; error: string }> {
  try {
    const data = await getInventoryHubData(period)
    return { success: true, data }
  } catch (e) {
    console.error("[getInventoryHubDataAction]", e)
    return { success: false, error: "データの取得に失敗しました" }
  }
}

export type GanttEntryDTO = {
  id: string
  partner: string
  description: string
  amount: number
  type: "income" | "expense"
  category: string
  cycle: string
  offsetMonths: number
  day: number
  tags: string[]
  seasonality: number[]
  isFixed: boolean
  invoiceDate: string | null
}

export async function getGanttEntriesAction(): Promise<
  { success: true; data: GanttEntryDTO[] } | { success: false; error: string }
> {
  try {
    const rows = await getGanttEntries()
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        partner: r.partner,
        description: r.description,
        amount: Number(r.amountYen),
        type: r.flow,
        category: r.category,
        cycle: r.cycle ?? "",
        offsetMonths: r.offsetMonths,
        day: r.dueDay,
        tags: r.tags,
        seasonality: r.seasonality,
        isFixed: r.isFixed,
        invoiceDate: r.invoiceDate ? r.invoiceDate.toISOString().slice(0, 10) : null,
      })),
    }
  } catch (e) {
    console.error("[getGanttEntriesAction]", e)
    return { success: false, error: "ガントデータの取得に失敗しました" }
  }
}

export type ReservePolicyDTO = {
  id: string
  name: string
  description: string
  percent: number
  sortOrder: number
}

export async function getReservePoliciesAction(): Promise<
  { success: true; data: ReservePolicyDTO[] } | { success: false; error: string }
> {
  try {
    const rows = await getReservePolicies()
    return { success: true, data: rows }
  } catch (e) {
    console.error("[getReservePoliciesAction]", e)
    return { success: false, error: "内部留保ポリシーの取得に失敗しました" }
  }
}

export async function updateReservePolicyAction(
  id: string,
  percent: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await updateReservePolicy(id, percent)
    return { success: true }
  } catch (e) {
    console.error("[updateReservePolicyAction]", e)
    return { success: false, error: "内部留保ポリシーの更新に失敗しました" }
  }
}

export async function updateTotalAssetsYenAction(
  yen: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await updateTotalAssetsYen(yen)
    return { success: true }
  } catch (e) {
    console.error("[updateTotalAssetsYenAction]", e)
    return { success: false, error: "総資産の保存に失敗しました" }
  }
}

export async function getFinanceOverviewStatsAction(): Promise<
  { success: true; data: FinanceOverviewStats } | { success: false; error: string }
> {
  try {
    const data = await getFinanceOverviewStats()
    return { success: true, data }
  } catch (e) {
    console.error("[getFinanceOverviewStatsAction]", e)
    return { success: false, error: "財務サマリーの取得に失敗しました" }
  }
}
