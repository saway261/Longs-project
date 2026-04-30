"use server"

import * as planningService from "@/src/services/inventory-planning-service"
import { requireRole } from "@/src/lib/permissions"

export type { InventoryPlanMonthDTO, PlanMonthInput } from "@/src/services/inventory-planning-service"

export async function getAvailableFiscalYearsAction(): Promise<
  { success: true; data: number[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    const data = await planningService.getAvailableFiscalYears()
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getAvailableFiscalYearsAction]", e)
    return { success: false, error: "年度一覧の取得に失敗しました" }
  }
}

export async function getInventoryPlanAction(
  fiscalYear: number,
): Promise<
  { success: true; data: planningService.InventoryPlanMonthDTO[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    const data = await planningService.getInventoryPlan(fiscalYear)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getInventoryPlanAction]", e)
    return { success: false, error: "在庫計画の取得に失敗しました" }
  }
}

export async function saveInventoryPlanAction(
  fiscalYear: number,
  months: planningService.PlanMonthInput[],
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await planningService.saveInventoryPlan(fiscalYear, months)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[saveInventoryPlanAction]", e)
    return { success: false, error: "在庫計画の保存に失敗しました" }
  }
}
