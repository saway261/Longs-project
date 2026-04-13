import { prisma } from "@/src/lib/prisma"
import { getColumnDefs, toImportDataset, fromImportDataset } from "@/src/lib/data-column-maps"
import { parseSpreadsheet, getExtension, generateCsv } from "@/src/lib/csv-parser"

export type DisplayRow = Record<string, string | number> & { id: string }

export type UnknownItemInfo = { itemCode: string; itemName: string }

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
 * SalesFact インポート前に、itemCode に対応する ProductCategory の存在チェック
 * ProductCategory.categoryCode = itemCode でマッチング。存在しない itemCode を返す（追加確認ダイアログ用）
 */
export async function checkUnknownSalesItemCodes(
  buffer: Buffer,
  fileName: string,
): Promise<{ unknownItems: UnknownItemInfo[] }> {
  const ext = getExtension(fileName)
  const parsedRows = parseSpreadsheet(buffer, ext)

  // CSV行から unique (itemCode, itemName) ペアを収集
  const itemMap = new Map<string, string>() // itemCode → itemName
  for (const row of parsedRows) {
    const itemCode = String(row["アイテムコード"] ?? "").trim()
    const itemName = String(row["アイテム名"] ?? "").trim()
    if (itemCode && !itemMap.has(itemCode)) {
      itemMap.set(itemCode, itemName)
    }
  }

  if (itemMap.size === 0) return { unknownItems: [] }

  // itemCode を ProductCategory.categoryCode と照合
  const itemCodes = [...itemMap.keys()]
  const existing = await prisma.productCategory.findMany({
    where: { categoryCode: { in: itemCodes }, deletedAt: null },
    select: { categoryCode: true },
  })
  const existingCodes = new Set(existing.map((c) => c.categoryCode).filter(Boolean) as string[])

  const unknownItems: UnknownItemInfo[] = []
  for (const [itemCode, itemName] of itemMap) {
    if (!existingCodes.has(itemCode)) {
      unknownItems.push({ itemCode, itemName })
    }
  }

  return { unknownItems }
}

/**
 * CSV/XLSXファイルをインポートする（二層構成: DataImportRow + ファクトテーブル）
 */
export async function importData(
  buffer: Buffer,
  fileName: string,
  dataset: string,
  userId: string,
  unknownItemHandling: "add" | "use_other" = "use_other",
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

    // 4-2. 取引先マスタ事前 upsert + businessPartnerId / periodYm をファクト行に付与
    if (factRows.length > 0 && (dbDataset === "sales" || dbDataset === "payables" || dbDataset === "receivables")) {
      try {
        const nameToPartnerId = await upsertPartnerMaster(factRows, dbDataset)
        const periodYm =
          dbDataset === "payables" || dbDataset === "receivables" ? inferPeriodYm(fileName) : null
        for (const row of factRows) {
          const name =
            dbDataset === "sales"
              ? (row.customerCategory1Name as string)
              : dbDataset === "payables"
                ? (row.vendorName as string)
                : (row.customerName as string)
          if (name) {
            const partnerId = nameToPartnerId.get(name)
            if (partnerId) row.businessPartnerId = partnerId
          }
          if (periodYm) row.periodYm = periodYm
        }
      } catch (e) {
        issues.push({
          level: "warning",
          message: `取引先マスタの更新に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
          rowNumber: 0,
        })
      }
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

    // 5-1. 商品マスタ自動 upsert（sales / inventory_snapshot のみ）
    if (rowsSuccess > 0 && (dbDataset === "sales" || dbDataset === "inventory_snapshot")) {
      try {
        const { warnings: masterWarnings } = await upsertProductMaster(factRows, dbDataset, unknownItemHandling)
        for (const msg of masterWarnings) {
          issues.push({ level: "warning", message: msg, rowNumber: 0 })
        }
      } catch (e) {
        issues.push({
          level: "warning",
          message: `商品マスタの更新に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
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
  dataset: "sales" | "payables" | "receivables" | "gross_profit" | "inventory_snapshot",
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
    case "inventory_snapshot":
      return prisma.inventorySnapshotFact.createMany({ data, skipDuplicates: true })
  }
}

/**
 * SalesFact / InventorySnapshotFact のインポート行から Product / ProductVariant を自動 upsert する
 * 戻り値の warnings は ImportResult.warnings に追記される
 */
async function upsertProductMaster(
  factRows: Record<string, unknown>[],
  dataset: "sales" | "inventory_snapshot",
  unknownItemHandling: "add" | "use_other" = "use_other",
): Promise<{ warnings: string[] }> {
  const warnings: string[] = []

  // productCode が存在する行のみ処理
  const rows = factRows.filter((r) => r.productCode)

  if (rows.length === 0) return { warnings }

  // brandCode + brandName ごとに ProductBrand を upsert
  // brandCode がある場合は brandCode 優先でルックアップ。ない場合は brandName で upsert
  const brandPairMap = new Map<string, { brandCode?: string; brandName: string }>()
  for (const r of rows) {
    const brandName = r.brandName as string | undefined
    if (!brandName) continue
    const brandCode = (r.brandCode as string | undefined) || undefined
    const key = `${brandCode ?? ""}|${brandName}`
    if (!brandPairMap.has(key)) brandPairMap.set(key, { brandCode, brandName })
  }

  const brandMap = new Map<string, string>() // brandName → id
  for (const { brandCode, brandName } of brandPairMap.values()) {
    if (brandCode) {
      // brandCode がある場合: brandCode でルックアップ
      const existingByCode = await prisma.productBrand.findUnique({ where: { brandCode } })
      if (existingByCode) {
        if (existingByCode.name !== brandName) {
          warnings.push(
            `ブランドコード「${brandCode}」の名称「${brandName}」がマスタの「${existingByCode.name}」と一致しません。マスタの名称を使用しました。`,
          )
        }
        brandMap.set(brandName, existingByCode.id)
      } else {
        // brandCode 未登録: 新規作成（name 衝突時は既存レコードを使用）
        try {
          const brand = await prisma.productBrand.create({ data: { brandCode, name: brandName } })
          brandMap.set(brandName, brand.id)
        } catch {
          const existingByName = await prisma.productBrand.findUnique({ where: { name: brandName } })
          if (existingByName) {
            warnings.push(
              `ブランド名「${brandName}」は既にコードなしで登録されています。ブランドコード「${brandCode}」の紐付けはスキップしました。`,
            )
            brandMap.set(brandName, existingByName.id)
          }
        }
      }
    } else {
      // brandCode なし: brandName で upsert（従来どおり）
      const brand = await prisma.productBrand.upsert({
        where: { name: brandName },
        create: { name: brandName },
        update: {},
      })
      brandMap.set(brandName, brand.id)
    }
  }

  // sales の場合: itemCode → ProductCategory.id のマッピングを構築
  // ProductCategory.categoryCode = itemCode で紐付け
  const productCategoryMap = new Map<string, string>() // productCode → categoryId
  if (dataset === "sales") {
    // ユニークな (itemCode, itemName) ペアを収集
    const itemMap = new Map<string, string>() // itemCode → itemName
    for (const r of rows) {
      const itemCode = r.itemCode as string
      const itemName = r.itemName as string
      if (itemCode && !itemMap.has(itemCode)) itemMap.set(itemCode, itemName ?? "")
    }

    const uniqueItemCodes = [...itemMap.keys()]
    if (uniqueItemCodes.length > 0) {
      const existingCats = await prisma.productCategory.findMany({
        where: { categoryCode: { in: uniqueItemCodes }, deletedAt: null },
        select: { id: true, categoryCode: true, name: true },
      })
      // categoryCode → { id, name } マップ
      const catCodeToInfo = new Map(existingCats.map((c) => [c.categoryCode as string, { id: c.id, name: c.name }]))

      // (1) itemCode が存在するが itemName と categoryName が不一致 → 警告
      for (const [itemCode, itemName] of itemMap) {
        const cat = catCodeToInfo.get(itemCode)
        if (cat && itemName && cat.name !== itemName) {
          warnings.push(
            `アイテムコード「${itemCode}」のアイテム名「${itemName}」がカテゴリ名「${cat.name}」と一致しません。` +
              `Productへの登録にはカテゴリ「${cat.name}」を使用しました。`,
          )
        }
      }

      if (unknownItemHandling === "add") {
        // 存在しない itemCode のカテゴリを新規作成（categoryCode = itemCode, name = itemName）
        for (const [itemCode, itemName] of itemMap) {
          if (!catCodeToInfo.has(itemCode)) {
            const cat = await prisma.productCategory.create({
              data: { categoryCode: itemCode, name: itemName || itemCode },
            })
            catCodeToInfo.set(itemCode, { id: cat.id, name: cat.name })
          }
        }
      } else {
        // 存在しない itemCode は「その他」カテゴリを使用
        const missingCodes = uniqueItemCodes.filter((c) => !catCodeToInfo.has(c))
        if (missingCodes.length > 0) {
          const otherCat = await prisma.productCategory.upsert({
            where: { name: "その他" },
            create: { name: "その他" },
            update: {},
          })
          for (const c of missingCodes) {
            catCodeToInfo.set(c, { id: otherCat.id, name: otherCat.name })
          }
        }
      }

      // productCode → categoryId マッピング構築
      for (const r of rows) {
        const productCode = r.productCode as string
        const itemCode = r.itemCode as string
        if (productCode && itemCode && !productCategoryMap.has(productCode)) {
          const catId = catCodeToInfo.get(itemCode)?.id
          if (catId) productCategoryMap.set(productCode, catId)
        }
      }
    }
  }

  // productCode ごとに Product を upsert
  const productGroups = new Map<string, { name: string; brandId?: string; categoryId?: string }>()
  for (const r of rows) {
    const code = r.productCode as string
    if (productGroups.has(code)) continue
    const name =
      dataset === "sales"
        ? ((r.productName1 as string) ?? (r.productName2 as string) ?? code)
        : ((r.productName as string) ?? code)
    const brandName = r.brandName as string | undefined
    const brandId = brandName ? brandMap.get(brandName) : undefined
    const categoryId = productCategoryMap.get(code)
    productGroups.set(code, { name, brandId, categoryId })
  }

  // productCode → product.id マッピングを収集
  const productIdMap = new Map<string, string>() // productCode → product.id

  for (const [productCode, { name, brandId, categoryId }] of productGroups) {
    const product = await prisma.product.upsert({
      where: { productCode },
      create: { productCode, name, ...(brandId ? { brandId } : {}), ...(categoryId ? { categoryId } : {}) },
      update: { name, ...(brandId ? { brandId } : {}), ...(categoryId ? { categoryId } : {}) },
    })
    productIdMap.set(productCode, product.id)
  }

  // (productId + color + size) ごとに ProductVariant を upsert
  const variantGroups = new Map<
    string,
    { productCode: string; colorCode?: string; color: string | null; sizeCode?: string; size: string | null; janCode?: string; priceYen?: bigint | null }
  >()
  for (const r of rows) {
    const productCode = r.productCode as string
    const color = (r.cs1Name as string) || null
    const size = (r.cs2Name as string) || null
    const variantKey = `${productCode}|${color ?? ""}|${size ?? ""}`
    if (variantGroups.has(variantKey)) continue
    variantGroups.set(variantKey, {
      productCode,
      colorCode: (r.cs1Code as string) || undefined,
      color,
      sizeCode: (r.cs2Code as string) || undefined,
      size,
      janCode: (r.janCode as string) || undefined,
      priceYen: dataset === "sales" ? ((r.listPriceYen as bigint | null | undefined) ?? null) : undefined,
    })
  }

  for (const [, data] of variantGroups) {
    const productId = productIdMap.get(data.productCode)
    if (!productId) continue
    await prisma.productVariant.upsert({
      where: { productId_color_size: { productId, color: data.color ?? "", size: data.size ?? "" } },
      create: {
        productId,
        color: data.color,
        size: data.size,
        colorCode: data.colorCode,
        sizeCode: data.sizeCode,
        janCode: data.janCode,
        ...(data.priceYen != null ? { priceYen: data.priceYen } : {}),
      },
      update: {
        colorCode: data.colorCode,
        sizeCode: data.sizeCode,
        janCode: data.janCode,
        ...(data.priceYen != null ? { priceYen: data.priceYen } : {}),
      },
    })
  }

  return { warnings }
}

/**
 * payables / receivables / sales のインポート行から BusinessPartner + Supplier/Customer を自動 upsert する。
 * 戻り値: 取引先名 → businessPartnerId のマップ（ファクト行への付与に使用）
 */
async function upsertPartnerMaster(
  factRows: Record<string, unknown>[],
  dataset: "sales" | "payables" | "receivables",
): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>()

  if (dataset === "sales") {
    const names = [...new Set(factRows.map((r) => r.customerCategory1Name as string).filter(Boolean))]
    for (const name of names) {
      const existing = await prisma.businessPartner.findFirst({ where: { name } })
      const partnerId = existing
        ? existing.id
        : (await prisma.businessPartner.create({ data: { name } })).id
      await prisma.customer.upsert({
        where: { businessPartnerId: partnerId },
        create: { businessPartnerId: partnerId },
        update: {},
      })
      nameToId.set(name, partnerId)
    }
  } else if (dataset === "payables") {
    const vendorNames = [...new Set(factRows.map((r) => r.vendorName as string).filter(Boolean))]
    for (const name of vendorNames) {
      const existing = await prisma.businessPartner.findFirst({ where: { name } })
      const partnerId = existing
        ? existing.id
        : (await prisma.businessPartner.create({ data: { name } })).id
      await prisma.supplier.upsert({
        where: { businessPartnerId: partnerId },
        create: { businessPartnerId: partnerId },
        update: {},
      })
      nameToId.set(name, partnerId)
    }
  } else {
    const customerNames = [...new Set(factRows.map((r) => r.customerName as string).filter(Boolean))]
    for (const name of customerNames) {
      const existing = await prisma.businessPartner.findFirst({ where: { name } })
      const partnerId = existing
        ? existing.id
        : (await prisma.businessPartner.create({ data: { name } })).id
      await prisma.customer.upsert({
        where: { businessPartnerId: partnerId },
        create: { businessPartnerId: partnerId },
        update: {},
      })
      nameToId.set(name, partnerId)
    }
  }

  return nameToId
}

/**
 * ファイル名から period_ym (月初日) を推定する。
 * 例: "payables_2026-02.csv" → 2026-02-01
 * 判定不能な場合は imported_at の前月を返す。
 */
function inferPeriodYm(fileName: string | null): Date {
  if (fileName) {
    const match = fileName.match(/(\d{4})[-_.]?(\d{2})/)
    if (match) {
      const year = parseInt(match[1])
      const month = parseInt(match[2])
      if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
        return new Date(`${year}-${String(month).padStart(2, "0")}-01`)
      }
    }
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1, 1)
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
    case "inventory-snapshot":
    case "inventory_snapshot": {
      const where = buildInventorySnapshotWhere(keyword)
      const [rows, total] = await Promise.all([
        prisma.inventorySnapshotFact.findMany({ where, skip, take, orderBy: { updatedAt: "desc" } }),
        prisma.inventorySnapshotFact.count({ where }),
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

function buildInventorySnapshotWhere(keyword: string) {
  const base = { deletedAt: null }
  if (!keyword) return base
  return {
    ...base,
    OR: [
      { productCode: { contains: keyword } },
      { productName: { contains: keyword } },
      { brandName: { contains: keyword } },
      { cs1Name: { contains: keyword } },
      { cs2Name: { contains: keyword } },
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
    case "inventory-snapshot":
    case "inventory_snapshot":
      await prisma.inventorySnapshotFact.update({ where: { id }, data })
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

// ===== 在庫サマリー向け =====

export type PeriodOption = "3m" | "6m" | "1y"

export type SalesHubRow = {
  id: string
  customerCategory1Name: string | null
  brandName: string | null
  itemName: string | null
  productName1: string | null
  staffName: string | null
  periodYm: string | null
  netQty: number | null
  netSalesYen: number | null
  grossProfitYen: number | null
  grossProfitRate: number | null
}

export type PayablesHubRow = {
  id: string
  vendorShort: string | null
  prevBalanceYen: number | null
  paymentYen: number | null
  netPurchaseYen: number | null
  purchaseTaxInYen: number | null
  monthEndBalanceYen: number | null
}

export type ReceivablesHubRow = {
  id: string
  customerShort: string | null
  staffName: string | null
  receivedYen: number | null
  netSalesYen: number | null
  salesTaxInYen: number | null
  monthEndBalanceYen: number | null
  creditLimitBalanceYen: number | null
}

export type InventoryHubData = {
  sales: SalesHubRow[]
  payables: PayablesHubRow[]
  receivables: ReceivablesHubRow[]
}

function getPeriodStartDate(period: PeriodOption): Date {
  const now = new Date()
  const monthsBack = period === "3m" ? 3 : period === "6m" ? 6 : 12
  return new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
}

export async function getInventoryHubData(period: PeriodOption): Promise<InventoryHubData> {
  const startDate = getPeriodStartDate(period)

  const [salesRows, payablesRows, receivablesRows] = await Promise.all([
    prisma.salesFact.findMany({
      where: { deletedAt: null, periodYm: { gte: startDate } },
      orderBy: { periodYm: "desc" },
      take: 300,
    }),
    prisma.payablesFact.findMany({
      where: { deletedAt: null, periodYm: { gte: startDate } },
      orderBy: { periodYm: "desc" },
      take: 300,
    }),
    prisma.receivablesFact.findMany({
      where: { deletedAt: null, periodYm: { gte: startDate } },
      orderBy: { periodYm: "desc" },
      take: 300,
    }),
  ])

  return {
    sales: salesRows.map((r) => ({
      id: r.id,
      customerCategory1Name: r.customerCategory1Name,
      brandName: r.brandName,
      itemName: r.itemName,
      productName1: r.productName1,
      staffName: r.staffName,
      periodYm: r.periodYm ? r.periodYm.toISOString().slice(0, 7) : null,
      netQty: r.netQty,
      netSalesYen: r.netSalesYen !== null ? Number(r.netSalesYen) : null,
      grossProfitYen: r.grossProfitYen !== null ? Number(r.grossProfitYen) : null,
      grossProfitRate: r.grossProfitRate !== null ? Number(r.grossProfitRate) : null,
    })),
    payables: payablesRows.map((r) => ({
      id: r.id,
      vendorShort: r.vendorShort,
      prevBalanceYen: r.prevBalanceYen !== null ? Number(r.prevBalanceYen) : null,
      paymentYen: r.paymentYen !== null ? Number(r.paymentYen) : null,
      netPurchaseYen: r.netPurchaseYen !== null ? Number(r.netPurchaseYen) : null,
      purchaseTaxInYen: r.purchaseTaxInYen !== null ? Number(r.purchaseTaxInYen) : null,
      monthEndBalanceYen: r.monthEndBalanceYen !== null ? Number(r.monthEndBalanceYen) : null,
    })),
    receivables: receivablesRows.map((r) => ({
      id: r.id,
      customerShort: r.customerShort,
      staffName: r.staffName,
      receivedYen: r.receivedYen !== null ? Number(r.receivedYen) : null,
      netSalesYen: r.netSalesYen !== null ? Number(r.netSalesYen) : null,
      salesTaxInYen: r.salesTaxInYen !== null ? Number(r.salesTaxInYen) : null,
      monthEndBalanceYen: r.monthEndBalanceYen !== null ? Number(r.monthEndBalanceYen) : null,
      creditLimitBalanceYen: r.creditLimitBalanceYen !== null ? Number(r.creditLimitBalanceYen) : null,
    })),
  }
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
