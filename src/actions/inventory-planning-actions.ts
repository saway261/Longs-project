"use server"

import * as planningService from "@/src/services/inventory-planning-service"

export type { InventoryPlanMonthDTO, PlanMonthInput } from "@/src/services/inventory-planning-service"

export async function getAvailableFiscalYearsAction(): Promise<
  { success: true; data: number[] } | { success: false; error: string }
> {
  try {
    const data = await planningService.getAvailableFiscalYears()
    return { success: true, data }
  } catch (e) {
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
    const data = await planningService.getInventoryPlan(fiscalYear)
    return { success: true, data }
  } catch (e) {
    console.error("[getInventoryPlanAction]", e)
    return { success: false, error: "在庫計画の取得に失敗しました" }
  }
}

export async function saveInventoryPlanAction(
  fiscalYear: number,
  months: planningService.PlanMonthInput[],
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await planningService.saveInventoryPlan(fiscalYear, months)
    return { success: true }
  } catch (e) {
    console.error("[saveInventoryPlanAction]", e)
    return { success: false, error: "在庫計画の保存に失敗しました" }
  }
}
