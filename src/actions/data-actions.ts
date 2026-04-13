"use server"

import { revalidateTag } from "next/cache"
import { getSession } from "@/src/lib/auth"
import * as dataService from "@/src/services/data-service"
import { getExtension } from "@/src/lib/csv-parser"
import { generateTemplateCsv } from "@/src/services/data-service"

export type { ImportHistoryDTO, DisplayRow, ImportResult, UnknownItemInfo } from "@/src/services/data-service"

// ===== /data/import 向け =====

/** CSVまたはXLSXファイルをインポートする */
export async function importDataAction(formData: FormData): Promise<
  { success: true; data: dataService.ImportResult } | { success: false; error: string }
> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: "認証が必要です" }

    const file = formData.get("file") as File | null
    const dataset = formData.get("dataset") as string | null

    if (!file || !dataset) {
      return { success: false, error: "ファイルまたはデータセットが指定されていません" }
    }

    const ext = getExtension(file.name)
    if (!["csv", "xlsx", "xlsm"].includes(ext)) {
      return { success: false, error: "CSV / XLSX / XLSM ファイルのみ対応しています" }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const rawHandling = formData.get("unknownItemHandling")
    const unknownItemHandling = rawHandling === "add" ? "add" : "use_other"

    const result = await dataService.importData(buffer, file.name, dataset, session.userId, unknownItemHandling)
    if (dataset === "inventory_snapshot" || dataset === "sales") {
      revalidateTag("insights")
    }
    return { success: true, data: result }
  } catch (e) {
    console.error("[importDataAction]", e)
    return { success: false, error: "インポートに失敗しました" }
  }
}

/** SalesFact インポート前に未登録の itemName を検出する */
export async function checkUnknownItemCodesAction(formData: FormData): Promise<
  { success: true; data: { unknownItems: dataService.UnknownItemInfo[] } } | { success: false; error: string }
> {
  try {
    const file = formData.get("file") as File | null
    if (!file) return { success: false, error: "ファイルが指定されていません" }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await dataService.checkUnknownSalesItemCodes(buffer, file.name)
    return { success: true, data: result }
  } catch (e) {
    console.error("[checkUnknownItemCodesAction]", e)
    return { success: false, error: "チェックに失敗しました" }
  }
}

/** インポート履歴をdataset別にまとめて取得 */
export async function getImportHistoryByDatasetAction(): Promise<
  { success: true; data: Record<string, dataService.ImportHistoryDTO[]> } | { success: false; error: string }
> {
  try {
    const data = await dataService.getImportHistoryByDataset()
    return { success: true, data }
  } catch (e) {
    console.error("[getImportHistoryByDatasetAction]", e)
    return { success: false, error: "履歴の取得に失敗しました" }
  }
}

/** テンプレートCSVのダウンロード */
export async function downloadTemplateAction(dataset: string): Promise<
  { success: true; data: { csvContent: string; fileName: string } } | { success: false; error: string }
> {
  try {
    const csvContent = generateTemplateCsv(dataset)
    const fileName = `template_${dataset}.csv`
    return { success: true, data: { csvContent, fileName } }
  } catch (e) {
    console.error("[downloadTemplateAction]", e)
    return { success: false, error: "テンプレートの生成に失敗しました" }
  }
}

// ===== /data 向け =====

/** ファクトテーブルからページネーション取得 */
export async function getDatasetRowsAction(params: {
  dataset: string
  search?: string
  page: number
  pageSize: number
}): Promise<
  { success: true; data: { rows: dataService.DisplayRow[]; total: number } } | { success: false; error: string }
> {
  try {
    const data = await dataService.getDatasetRows(params)
    return { success: true, data }
  } catch (e) {
    console.error("[getDatasetRowsAction]", e)
    return { success: false, error: "データの取得に失敗しました" }
  }
}

/** 行の編集 */
export async function updateDataRowAction(params: {
  dataset: string
  id: string
  data: Record<string, string>
}): Promise<{ success: boolean; error?: string }> {
  try {
    await dataService.updateDataRow(params)
    return { success: true }
  } catch (e) {
    console.error("[updateDataRowAction]", e)
    return { success: false, error: "更新に失敗しました" }
  }
}

/** 行のソフトデリート */
export async function deleteDataRowAction(params: {
  dataset: string
  id: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    await dataService.deleteDataRow(params)
    return { success: true }
  } catch (e) {
    console.error("[deleteDataRowAction]", e)
    return { success: false, error: "削除に失敗しました" }
  }
}

/** CSVエクスポート */
export async function exportDatasetAction(params: {
  dataset: string
  search?: string
}): Promise<
  { success: true; data: { csvContent: string; fileName: string } } | { success: false; error: string }
> {
  try {
    const csvContent = await dataService.exportDatasetCsv(params)
    const fileName = `export_${params.dataset}_${new Date().toISOString().slice(0, 10)}.csv`
    return { success: true, data: { csvContent, fileName } }
  } catch (e) {
    console.error("[exportDatasetAction]", e)
    return { success: false, error: "エクスポートに失敗しました" }
  }
}
