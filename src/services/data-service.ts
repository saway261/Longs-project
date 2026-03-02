import { prisma } from "@/src/lib/prisma"
import { getColumnDefs, toImportDataset, fromImportDataset } from "@/src/lib/data-column-maps"
import { parseSpreadsheet, getExtension, generateCsv } from "@/src/lib/csv-parser"

export type DisplayRow = Record<string, string | number> & { id: string }

export type ImportResult = {
  importId: string
  rowsTotal: number
  rowsSuccess: number
  rowsSkipped: number
  warningsCount: number
  errorsCount: number
  status: "success" | "partial" | "failed"
  summary: string
  warnings: string[]
  errors: string[]
}

export type ImportHistoryDTO = {
  id: string
  fileName: string | null
  importedAt: string
  rows: number
  status: "success" | "partial" | "failed" | "processing"
  note: string | null
  summary: string | null
  stats: {
    processed: number
    success: number
    skipped: number
    warnings: number
    errors: number
  }
  warnings: string[]
  errors: string[]
}

// ===== /data/import 向け =====

/**
 * CSV/XLSXファイルをインポートする（二層構成: DataImportRow + ファクトテーブル）
 */
export async function importData(
  buffer: Buffer,
  fileName: string,
  dataset: string,
  userId: string,
): Promise<ImportResult> {
  const dbDataset = toImportDataset(dataset)
  const columnDefs = getColumnDefs(dataset)

  if (columnDefs.length === 0) {
    throw new Error(`Unknown dataset: ${dataset}`)
  }

  // 1. DataImport レコード作成（processing状態）
  const dataImport = await prisma.dataImport.create({
    data: {
      dataset: dbDataset,
      fileName,
      status: "processing",
      importedBy: userId,
    },
  })

  try {
    // 2. スプレッドシートをパース
    const ext = getExtension(fileName)
    const parsedRows = parseSpreadsheet(buffer, ext)
    const rowsTotal = parsedRows.length

    // 3. DataImportRow に全行を rawData (JSONB) で保存
    if (parsedRows.length > 0) {
      await prisma.dataImportRow.createMany({
        data: parsedRows.map((row, index) => ({
          importId: dataImport.id,
          rowNumber: index + 1,
          rawData: row,
        })),
      })
    }

    // 4. 各行をバリデーション＆変換
    const factRows: Record<string, unknown>[] = []
    const issues: { level: "warning" | "error"; message: string; rowNumber: number; columnName?: string }[] = []
    let rowsSkipped = 0

    // 4-1. ヘッダー照合診断（全行スキップの原因を早期検出）
    const actualHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : []
    const missingLabels = columnDefs.map((c) => c.label).filter((l) => !actualHeaders.includes(l))

    if (missingLabels.length > 0) {
      issues.push({
        level: "error",
        message: `必須カラムがファイルに見つかりません（不足: ${missingLabels.join("、")}）。テンプレートをダウンロードしてすべての列が揃っているか確認してください。`,
        rowNumber: 0,
      })
    }

    // ヘッダー不正（全不一致 or 欠損カラムあり）の場合はここで処理を中断
    if (issues.some((i) => i.level === "error")) {
      await prisma.dataImportIssue.createMany({
        data: issues.map((issue) => ({
          importId: dataImport.id,
          level: issue.level,
          message: issue.message,
          rowNumber: issue.rowNumber || null,
          columnName: issue.columnName || null,
        })),
      })
      const summary = "カラム構成が正しくないためインポートを中止しました。テンプレートのフォーマットを確認してください。"
      await prisma.dataImport.update({
        where: { id: dataImport.id },
        data: { status: "failed", summary, rowsTotal: parsedRows.length, rowsSuccess: 0, rowsSkipped: 0, warningsCount: 0, errorsCount: issues.length },
      })
      return {
        importId: dataImport.id,
        rowsTotal: parsedRows.length,
        rowsSuccess: 0,
        rowsSkipped: 0,
        warningsCount: 0,
        errorsCount: issues.length,
        status: "failed",
        summary,
        warnings: [],
        errors: issues.map((i) => i.message),
      }
    }

    for (let i = 0; i < parsedRows.length; i++) {
      const rawRow = parsedRows[i]
      const rowNumber = i + 1
      const converted: Record<string, unknown> = { importId: dataImport.id }
      let hasAnyValue = false
      let rowWarnings = 0

      for (const col of columnDefs) {
        const rawVal = rawRow[col.label] ?? ""
        try {
          const dbVal = col.toDb(String(rawVal))
          converted[col.field] = dbVal
          if (dbVal !== null && dbVal !== undefined && dbVal !== "") {
            hasAnyValue = true
          }
        } catch {
          // 変換エラー → null にして警告
          converted[col.field] = null
          rowWarnings++
          issues.push({
            level: "warning",
            message: `行${rowNumber}の「${col.label}」の値「${rawVal}」を変換できませんでした`,
            rowNumber,
            columnName: col.label,
          })
        }
      }

      if (!hasAnyValue) {
        // 全フィールドが空 → スキップ
        rowsSkipped++
        continue
      }

      factRows.push(converted)
    }

    // 5. ファクトテーブルに bulk insert
    let rowsSuccess = 0
    let insertErrors = 0

    if (factRows.length > 0) {
      try {
        const result = await insertFactRows(dbDataset, factRows)
        rowsSuccess = result.count
      } catch (e) {
        console.error("[importData] bulk insert error:", e)
        insertErrors = factRows.length
        issues.push({
          level: "error",
          message: `ファクトテーブルへの挿入に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
          rowNumber: 0,
        })
      }
    }

    // 6. DataImportIssue 保存
    if (issues.length > 0) {
      await prisma.dataImportIssue.createMany({
        data: issues.map((issue) => ({
          importId: dataImport.id,
          level: issue.level,
          message: issue.message,
          rowNumber: issue.rowNumber || null,
          columnName: issue.columnName || null,
        })),
      })
    }

    const warningsCount = issues.filter((i) => i.level === "warning").length
    const errorsCount = issues.filter((i) => i.level === "error").length + insertErrors

    // 7. DataImport ステータス更新
    let status: "success" | "partial" | "failed"
    let summary: string

    if (rowsSuccess === 0 && rowsTotal > 0) {
      status = "failed"
      summary =
        rowsSkipped === rowsTotal
          ? `全${rowsTotal}件がスキップされました。ファイルのカラム名やフォーマットを確認してください。`
          : `取込に失敗しました（処理: ${rowsTotal}件、エラー: ${errorsCount}件、スキップ: ${rowsSkipped}件）。`
    } else if (warningsCount > 0 || rowsSkipped > 0 || errorsCount > 0) {
      status = "partial"
      summary = `一部を除外して取り込みました（正常: ${rowsSuccess}件、スキップ: ${rowsSkipped}件）。`
    } else {
      status = "success"
      summary = "全レコードが正常に取り込まれました。"
    }

    await prisma.dataImport.update({
      where: { id: dataImport.id },
      data: {
        status,
        summary,
        rowsTotal,
        rowsSuccess,
        rowsSkipped,
        warningsCount,
        errorsCount,
      },
    })

    return {
      importId: dataImport.id,
      rowsTotal,
      rowsSuccess,
      rowsSkipped,
      warningsCount,
      errorsCount,
      status,
      summary,
      warnings: issues.filter((i) => i.level === "warning").map((i) => i.message),
      errors: issues.filter((i) => i.level === "error").map((i) => i.message),
    }
  } catch (e) {
    // 予期しないエラー → DataImport を failed に
    await prisma.dataImport.update({
      where: { id: dataImport.id },
      data: { status: "failed", summary: "予期しないエラーが発生しました。" },
    })
    throw e
  }
}

/** ファクトテーブルへの bulk insert（dataset別） */
async function insertFactRows(
  dataset: "sales" | "payables" | "receivables" | "gross_profit",
  rows: Record<string, unknown>[],
): Promise<{ count: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = rows as any[]
  switch (dataset) {
    case "sales":
      return prisma.salesFact.createMany({ data, skipDuplicates: true })
    case "payables":
      return prisma.payablesFact.createMany({ data, skipDuplicates: true })
    case "receivables":
      return prisma.receivablesFact.createMany({ data, skipDuplicates: true })
    case "gross_profit":
      return prisma.grossProfitFact.createMany({ data, skipDuplicates: true })
  }
}

/** インポート履歴一覧（削除済み除く）*/
export async function getImportHistory(dataset?: string): Promise<ImportHistoryDTO[]> {
  const where = {
    deletedAt: null,
    ...(dataset ? { dataset: toImportDataset(dataset) } : {}),
  }

  const records = await prisma.dataImport.findMany({
    where,
    include: { issues: true },
    orderBy: { importedAt: "desc" },
  })

  return records.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    importedAt: r.importedAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    rows: r.rowsTotal ?? 0,
    status: r.status as ImportHistoryDTO["status"],
    note: r.note,
    summary: r.summary,
    stats: {
      processed: r.rowsTotal ?? 0,
      success: r.rowsSuccess ?? 0,
      skipped: r.rowsSkipped ?? 0,
      warnings: r.warningsCount ?? 0,
      errors: r.errorsCount ?? 0,
    },
    warnings: r.issues.filter((i) => i.level === "warning").map((i) => i.message),
    errors: r.issues.filter((i) => i.level === "error").map((i) => i.message),
  }))
}

/** テンプレートCSV生成（ヘッダー行のみ） */
export function generateTemplateCsv(dataset: string): string {
  const cols = getColumnDefs(dataset)
  return cols.map((c) => c.label).join(",") + "\n"
}

// ===== /data 向け =====

/** ファクトテーブルからページネーション取得（deleted_at IS NULL） */
export async function getDatasetRows(params: {
  dataset: string
  search?: string
  page: number
  pageSize: number
}): Promise<{ rows: DisplayRow[]; total: number }> {
  const { dataset, search, page, pageSize } = params
  const skip = (page - 1) * pageSize
  const columnDefs = getColumnDefs(dataset)

  const [rows, total] = await queryFactTable(dataset, { search, skip, take: pageSize })

  // DB行 → DisplayRow（日本語キー）に変換
  const displayRows: DisplayRow[] = rows.map((row) => {
    const display: DisplayRow = { id: row.id as string }
    for (const col of columnDefs) {
      const dbVal = (row as Record<string, unknown>)[col.field]
      display[col.label] = col.fromDb(dbVal)
    }
    return display
  })

  return { rows: displayRows, total }
}

/** ファクトテーブルクエリ（dataset別）*/
async function queryFactTable(
  dataset: string,
  opts: { search?: string; skip: number; take: number },
): Promise<[Record<string, unknown>[], number]> {
  const { search, skip, take } = opts
  const keyword = search?.trim() || ""

  switch (dataset) {
    case "sales": {
      const where = buildSalesWhere(keyword)
      const [rows, total] = await Promise.all([
        prisma.salesFact.findMany({ where, skip, take, orderBy: { updatedAt: "desc" } }),
        prisma.salesFact.count({ where }),
      ])
      return [rows as unknown as Record<string, unknown>[], total]
    }
    case "payables": {
      const where = buildPayablesWhere(keyword)
      const [rows, total] = await Promise.all([
        prisma.payablesFact.findMany({ where, skip, take, orderBy: { updatedAt: "desc" } }),
        prisma.payablesFact.count({ where }),
      ])
      return [rows as unknown as Record<string, unknown>[], total]
    }
    case "receivables": {
      const where = buildReceivablesWhere(keyword)
      const [rows, total] = await Promise.all([
        prisma.receivablesFact.findMany({ where, skip, take, orderBy: { updatedAt: "desc" } }),
        prisma.receivablesFact.count({ where }),
      ])
      return [rows as unknown as Record<string, unknown>[], total]
    }
    case "gross-profit":
    case "gross_profit": {
      const where = buildGrossProfitWhere(keyword)
      const [rows, total] = await Promise.all([
        prisma.grossProfitFact.findMany({ where, skip, take, orderBy: { updatedAt: "desc" } }),
        prisma.grossProfitFact.count({ where }),
      ])
      return [rows as unknown as Record<string, unknown>[], total]
    }
    default:
      return [[], 0]
  }
}

function buildSalesWhere(keyword: string) {
  const base = { deletedAt: null }
  if (!keyword) return base
  return {
    ...base,
    OR: [
      { customerCategory1Name: { contains: keyword } },
      { brandName: { contains: keyword } },
      { itemName: { contains: keyword } },
      { productName1: { contains: keyword } },
      { staffName: { contains: keyword } },
    ],
  }
}

function buildPayablesWhere(keyword: string) {
  const base = { deletedAt: null }
  if (!keyword) return base
  return {
    ...base,
    OR: [
      { vendorName: { contains: keyword } },
      { vendorShort: { contains: keyword } },
    ],
  }
}

function buildReceivablesWhere(keyword: string) {
  const base = { deletedAt: null }
  if (!keyword) return base
  return {
    ...base,
    OR: [
      { customerName: { contains: keyword } },
      { customerShort: { contains: keyword } },
      { staffName: { contains: keyword } },
    ],
  }
}

function buildGrossProfitWhere(keyword: string) {
  const base = { deletedAt: null }
  if (!keyword) return base
  return {
    ...base,
    OR: [
      { staffName: { contains: keyword } },
      { customerCategory1Name: { contains: keyword } },
    ],
  }
}

/** 行の編集 */
export async function updateDataRow(params: {
  dataset: string
  id: string
  data: Record<string, string>
}): Promise<void> {
  const { dataset, id, data } = params
  const columnDefs = getColumnDefs(dataset)

  // 日本語キー → Prisma camelCaseに変換
  const converted: Record<string, unknown> = {}
  for (const col of columnDefs) {
    if (col.label in data) {
      converted[col.field] = col.toDb(data[col.label])
    }
  }

  await updateFactRow(dataset, id, converted)
}

async function updateFactRow(dataset: string, id: string, data: Record<string, unknown>): Promise<void> {
  switch (dataset) {
    case "sales":
      await prisma.salesFact.update({ where: { id }, data })
      break
    case "payables":
      await prisma.payablesFact.update({ where: { id }, data })
      break
    case "receivables":
      await prisma.receivablesFact.update({ where: { id }, data })
      break
    case "gross-profit":
    case "gross_profit":
      await prisma.grossProfitFact.update({ where: { id }, data })
      break
  }
}

/** 行のソフトデリート */
export async function deleteDataRow(params: { dataset: string; id: string }): Promise<void> {
  const { dataset, id } = params
  const now = new Date()
  await updateFactRow(dataset, id, { deletedAt: now })
}

/** 全件CSV生成 */
export async function exportDatasetCsv(params: { dataset: string; search?: string }): Promise<string> {
  const { dataset, search } = params
  const columnDefs = getColumnDefs(dataset)

  const [rows] = await queryFactTable(dataset, { search, skip: 0, take: 100000 })

  const headers = columnDefs.map((c) => c.label)
  const dataRows = rows.map((row) =>
    columnDefs.map((col) => {
      const dbVal = (row as Record<string, unknown>)[col.field]
      return col.fromDb(dbVal)
    }),
  )

  return generateCsv(headers, dataRows)
}

/** dataset別のインポート履歴（dataset別にグルーピングして返す） */
export async function getImportHistoryByDataset(): Promise<Record<string, ImportHistoryDTO[]>> {
  const all = await getImportHistory()
  const result: Record<string, ImportHistoryDTO[]> = {}

  for (const item of all) {
    // DataImport.dataset は DB enum (gross_profit) → フロントのID (gross-profit) に変換
    // ただし item.id はそのままなのでimport元のdatasetを取得する必要がある
    // ここでは全件取得してから dataset フィールドで仕分け
  }

  // 全件取得してdatasetでグルーピング
  const records = await prisma.dataImport.findMany({
    where: { deletedAt: null },
    include: { issues: true },
    orderBy: { importedAt: "desc" },
  })

  for (const r of records) {
    const frontendId = fromImportDataset(r.dataset)
    if (!result[frontendId]) result[frontendId] = []
    result[frontendId].push({
      id: r.id,
      fileName: r.fileName,
      importedAt: r.importedAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      rows: r.rowsTotal ?? 0,
      status: r.status as ImportHistoryDTO["status"],
      note: r.note,
      summary: r.summary,
      stats: {
        processed: r.rowsTotal ?? 0,
        success: r.rowsSuccess ?? 0,
        skipped: r.rowsSkipped ?? 0,
        warnings: r.warningsCount ?? 0,
        errors: r.errorsCount ?? 0,
      },
      warnings: r.issues.filter((i) => i.level === "warning").map((i) => i.message),
      errors: r.issues.filter((i) => i.level === "error").map((i) => i.message),
    })
  }

  return result
}
