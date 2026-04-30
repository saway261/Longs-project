"use server"

import {
  getInventoryCatalog,
  updateProduct,
  updateVariant,
  getProcurementListForUser,
  getOrCreateDraftList,
  addProcurementItem,
  removeProcurementItem,
  updateProcurementItemQty,
  clearProcurementList,
  markProcurementItemOrdered,
} from "@/src/services/inventory-service"
import { requireRole } from "@/src/lib/permissions"

export type { CatalogVariantRow, CatalogResult, MasterItem } from "@/src/services/inventory-service"
export type { ProcurementItemRow } from "@/src/services/inventory-service"

export async function getInventoryCatalogAction() {
  await requireRole(["admin", "manager"])
  return getInventoryCatalog()
}

export async function updateProductAction(
  productId: string,
  data: { name: string; brandName: string | null; categoryName: string | null; season: string | null },
): Promise<{ error: string } | undefined> {
  try {
    await requireRole(["admin", "manager"])
    await updateProduct(productId, data)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "保存に失敗しました" }
  }
}

export async function updateVariantAction(
  variantId: string,
  data: { color: string | null; size: string | null; janCode: string | null; priceYen: number | null },
): Promise<{ error: string } | undefined> {
  try {
    await requireRole(["admin", "manager"])
    await updateVariant(variantId, data)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "保存に失敗しました" }
  }
}

export async function getProcurementListAction() {
  const session = await requireRole(["admin", "manager"])
  return getProcurementListForUser(session.userId)
}

export async function addProcurementItemAction(
  variantId: string,
  suggestedQty: number | null,
  priceYen: number | null,
  status: "high" | "overstock" | "normal",
): Promise<{ itemId: string } | { error: string }> {
  try {
    const session = await requireRole(["admin", "manager"])
    const listId = await getOrCreateDraftList(session.userId)
    const itemId = await addProcurementItem(listId, variantId, suggestedQty, priceYen, status)
    return { itemId }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "追加に失敗しました" }
  }
}

export async function removeProcurementItemAction(itemId: string): Promise<void | { error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await removeProcurementItem(itemId)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "削除に失敗しました" }
  }
}

export async function updateProcurementItemQtyAction(itemId: string, qty: number): Promise<void | { error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await updateProcurementItemQty(itemId, qty)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "更新に失敗しました" }
  }
}

export async function markProcurementItemOrderedAction(itemId: string): Promise<void | { error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await markProcurementItemOrdered(itemId)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "更新に失敗しました" }
  }
}

export async function clearProcurementListAction(): Promise<void | { error: string }> {
  try {
    const session = await requireRole(["admin", "manager"])
    const listId = await getOrCreateDraftList(session.userId)
    await clearProcurementList(listId)
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { error: e.message }
    }
    return { error: "クリアに失敗しました" }
  }
}
