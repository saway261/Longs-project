"use server"

import * as matrixService from "@/src/services/matrix-service"
import { requireRole } from "@/src/lib/permissions"

export type { MatrixFilterParams, CustomerMatrixRow, ProductMatrixRow } from "@/src/services/matrix-service"

export async function getCustomerMatrixAction(
  filter: matrixService.MatrixFilterParams,
): Promise<{ success: true; data: matrixService.CustomerMatrixRow[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await matrixService.getCustomerMatrixData(filter)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getCustomerMatrixAction]", e)
    return { success: false, error: "得意先マトリクスデータの取得に失敗しました" }
  }
}

export async function getProductMatrixAction(
  filter: matrixService.MatrixFilterParams,
): Promise<{ success: true; data: matrixService.ProductMatrixRow[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await matrixService.getProductMatrixData(filter)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getProductMatrixAction]", e)
    return { success: false, error: "商品マトリクスデータの取得に失敗しました" }
  }
}
