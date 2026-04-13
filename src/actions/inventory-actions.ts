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
import { getSession } from "@/src/lib/auth"

export type { CatalogVariantRow, CatalogResult, MasterItem } from "@/src/services/inventory-service"
export type { ProcurementItemRow } from "@/src/services/inventory-service"

export async function getInventoryCatalogAction() {
  return getInventoryCatalog()
}

export async function updateProductAction(
  productId: string,
  data: { name: string; brandName: string | null; categoryName: string | null; season: string | null },
): Promise<{ error: string } | undefined> {
  try {
    await updateProduct(productId, data)
  } catch {
    return { error: "保存に失敗しました" }
  }
}

export async function updateVariantAction(
  variantId: string,
  data: { color: string | null; size: string | null; janCode: string | null; priceYen: number | null },
): Promise<{ error: string } | undefined> {
  try {
    await updateVariant(variantId, data)
  } catch {
    return { error: "保存に失敗しました" }
  }
}

export async function getProcurementListAction() {
  const session = await getSession()
  if (!session) return { error: "未ログインです" } as const
  return getProcurementListForUser(session.userId)
}

export async function addProcurementItemAction(
  variantId: string,
  suggestedQty: number | null,
  priceYen: number | null,
  status: "high" | "overstock" | "normal",
): Promise<{ itemId: string } | { error: string }> {
  const session = await getSession()
  if (!session) return { error: "未ログインです" }
  const listId = await getOrCreateDraftList(session.userId)
  const itemId = await addProcurementItem(listId, variantId, suggestedQty, priceYen, status)
  return { itemId }
}

export async function removeProcurementItemAction(itemId: string): Promise<void | { error: string }> {
  const session = await getSession()
  if (!session) return { error: "未ログインです" }
  await removeProcurementItem(itemId)
}

export async function updateProcurementItemQtyAction(itemId: string, qty: number): Promise<void | { error: string }> {
  const session = await getSession()
  if (!session) return { error: "未ログインです" }
  await updateProcurementItemQty(itemId, qty)
}

export async function markProcurementItemOrderedAction(itemId: string): Promise<void | { error: string }> {
  const session = await getSession()
  if (!session) return { error: "未ログインです" }
  await markProcurementItemOrdered(itemId)
}

export async function clearProcurementListAction(): Promise<void | { error: string }> {
  const session = await getSession()
  if (!session) return { error: "未ログインです" }
  const listId = await getOrCreateDraftList(session.userId)
  await clearProcurementList(listId)
}
