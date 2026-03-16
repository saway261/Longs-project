"use server"

import * as settingsService from "@/src/services/settings-service"

export type { CategoryDTO, FixedCostDTO, ReservePolicyDTO } from "@/src/services/settings-service"

export async function getCategoriesAction(): Promise<
  { success: true; data: settingsService.CategoryDTO[] } | { success: false; error: string }
> {
  try {
    const data = await settingsService.getCategories()
    return { success: true, data }
  } catch (e) {
    console.error("[getCategoriesAction]", e)
    return { success: false, error: "カテゴリの取得に失敗しました" }
  }
}

export async function createCategoryAction(
  name: string,
  sellThroughDays: number,
  categoryCode?: string | null,
): Promise<
  { success: true; data: settingsService.CategoryDTO } | { success: false; error: string }
> {
  try {
    if (!name.trim()) return { success: false, error: "カテゴリ名を入力してください" }
    if (sellThroughDays < 1) return { success: false, error: "売り切り日数は1以上で入力してください" }
    const code = categoryCode?.trim() || null
    const data = await settingsService.createCategory(name.trim(), sellThroughDays, code)
    return { success: true, data }
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "同じ名前またはカテゴリコードが既に存在します" }
    console.error("[createCategoryAction]", e)
    return { success: false, error: "カテゴリの作成に失敗しました" }
  }
}

export async function updateCategoryAction(
  id: string,
  name: string,
  sellThroughDays: number,
  categoryCode?: string | null,
): Promise<
  { success: true; data: settingsService.CategoryDTO } | { success: false; error: string }
> {
  try {
    if (!name.trim()) return { success: false, error: "カテゴリ名を入力してください" }
    if (sellThroughDays < 1) return { success: false, error: "売り切り日数は1以上で入力してください" }
    const code = categoryCode?.trim() || null
    const data = await settingsService.updateCategory(id, name.trim(), sellThroughDays, code)
    return { success: true, data }
  } catch (e: any) {
    if (e?.code === "P2002") return { success: false, error: "同じ名前またはカテゴリコードが既に存在します" }
    console.error("[updateCategoryAction]", e)
    return { success: false, error: "カテゴリの更新に失敗しました" }
  }
}

export async function getInventoryTurnoverPeriodAction(): Promise<
  { success: true; months: number } | { success: false; error: string }
> {
  try {
    const months = await settingsService.getInventoryTurnoverPeriodMonths()
    return { success: true, months }
  } catch (e) {
    console.error("[getInventoryTurnoverPeriodAction]", e)
    return { success: false, error: "設定の取得に失敗しました" }
  }
}

export async function setInventoryTurnoverPeriodAction(
  months: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const valid = [1, 3, 6, 12]
    if (!valid.includes(months)) return { success: false, error: "無効な期間です" }
    await settingsService.setInventoryTurnoverPeriodMonths(months)
    return { success: true }
  } catch (e) {
    console.error("[setInventoryTurnoverPeriodAction]", e)
    return { success: false, error: "設定の保存に失敗しました" }
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await settingsService.deleteCategory(id)
    if (!result.success) return { success: false, error: result.reason }
    return { success: true }
  } catch (e) {
    console.error("[deleteCategoryAction]", e)
    return { success: false, error: "カテゴリの削除に失敗しました" }
  }
}

// ── 固定費 ────────────────────────────────────────────────────────────────────

export async function getFixedCostsAction(): Promise<
  { success: true; data: settingsService.FixedCostDTO[] } | { success: false; error: string }
> {
  try {
    const data = await settingsService.getFixedCosts()
    return { success: true, data }
  } catch (e) {
    console.error("[getFixedCostsAction]", e)
    return { success: false, error: "固定費の取得に失敗しました" }
  }
}

export async function saveFixedCostsAction(
  items: Array<{ id?: string; name: string; amountYen: number; dueDay: number }>,
): Promise<{ success: true; data: settingsService.FixedCostDTO[] } | { success: false; error: string }> {
  try {
    for (const item of items) {
      if (!item.name.trim()) return { success: false, error: "項目名を入力してください" }
      if (item.amountYen < 0) return { success: false, error: "金額は0以上で入力してください" }
      if (item.dueDay < 1 || item.dueDay > 31) return { success: false, error: "支払日は1〜31で入力してください" }
    }
    const data = await settingsService.saveFixedCosts(items)
    return { success: true, data }
  } catch (e) {
    console.error("[saveFixedCostsAction]", e)
    return { success: false, error: "固定費の保存に失敗しました" }
  }
}

// ── 内部留保 ──────────────────────────────────────────────────────────────────

export async function getReservePoliciesAction(): Promise<
  { success: true; data: settingsService.ReservePolicyDTO[] } | { success: false; error: string }
> {
  try {
    const data = await settingsService.getReservePolicies()
    return { success: true, data }
  } catch (e) {
    console.error("[getReservePoliciesAction]", e)
    return { success: false, error: "内部留保の取得に失敗しました" }
  }
}

export async function saveReservePoliciesAction(
  items: Array<{ id: string; percent: number }>,
): Promise<{ success: true; data: settingsService.ReservePolicyDTO[] } | { success: false; error: string }> {
  try {
    for (const item of items) {
      if (!Number.isInteger(item.percent) || item.percent < 0 || item.percent > 100) {
        return { success: false, error: "各割合は0〜100の整数で入力してください" }
      }
    }
    const data = await settingsService.saveReservePolicies(items)
    return { success: true, data }
  } catch (e) {
    console.error("[saveReservePoliciesAction]", e)
    return { success: false, error: "内部留保の保存に失敗しました" }
  }
}
