/**
 * 日本語カラム名（CSV/UI表示）↔ Prisma camelCaseフィールド名のマッピング
 * + 型変換関数（CSV文字列 → DB型、DB値 → 表示値）
 */

export type ColumnDef = {
  label: string                            // 日本語カラム名（CSVヘッダー・UI表示）
  field: string                            // Prisma camelCaseフィールド名
  toDb: (v: string) => unknown             // CSV文字列 → DB型変換
  fromDb: (v: unknown) => string | number  // DB値 → 表示値
}

// ===== 型変換ヘルパー =====

function toBigInt(v: string): bigint | null {
  if (!v && v !== "0") return null
  const n = parseFloat(v.replace(/,/g, ""))
  if (isNaN(n)) throw new Error(`数値に変換できません: "${v}"`)
  return BigInt(Math.round(n))
}

function toDate(v: string): Date | null {
  if (!v) return null
  // "2024-12" 形式は "2024-12-01" に変換
  const normalized = /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return null
  return d
}

function toInt(v: string): number | null {
  if (!v && v !== "0") return null
  const n = parseInt(v.replace(/,/g, ""), 10)
  if (isNaN(n)) throw new Error(`整数に変換できません: "${v}"`)
  return n
}

function toDecimal(v: string): number | null {
  if (!v && v !== "0") return null
  const n = parseFloat(v.replace(/,/g, ""))
  if (isNaN(n)) throw new Error(`数値に変換できません: "${v}"`)
  return n
}

function fromBigInt(v: unknown): string | number {
  if (v === null || v === undefined) return "-"
  return Number(v as bigint)
}

function fromDate(v: unknown): string {
  if (v === null || v === undefined) return ""
  const d = v as Date
  return d.toISOString().split("T")[0]
}

function fromDecimal(v: unknown): string | number {
  if (v === null || v === undefined) return "-"
  return parseFloat(String(v))
}

function fromStr(v: unknown): string {
  if (v === null || v === undefined) return ""
  return String(v)
}

function fromInt(v: unknown): string | number {
  if (v === null || v === undefined) return "-"
  return Number(v)
}

// ===== カラム定義ショートハンド =====

const str = (field: string, label: string): ColumnDef => ({
  label,
  field,
  toDb: (v) => v || null,
  fromDb: fromStr,
})

const bigint = (field: string, label: string): ColumnDef => ({
  label,
  field,
  toDb: (v) => toBigInt(v),
  fromDb: fromBigInt,
})

const date = (field: string, label: string): ColumnDef => ({
  label,
  field,
  toDb: (v) => toDate(v),
  fromDb: fromDate,
})

const int = (field: string, label: string): ColumnDef => ({
  label,
  field,
  toDb: (v) => toInt(v),
  fromDb: fromInt,
})

const decimal = (field: string, label: string): ColumnDef => ({
  label,
  field,
  toDb: (v) => toDecimal(v),
  fromDb: fromDecimal,
})

// ===== データセット別カラム定義 =====

/** 売上・粗利データ（24列） */
export const salesColumns: ColumnDef[] = [
  str("customerCategory1Code", "得意先分類1コード"),
  str("customerCategory1Name", "得意先分類1名"),
  str("brandCode", "ブランドコード"),
  str("brandName", "ブランド名"),
  str("itemCode", "アイテムコード"),
  str("itemName", "アイテム名"),
  str("productCode", "商品コード"),
  str("productName1", "商品名1"),
  str("productName2", "商品名2"),
  str("cs1Code", "CS1コード"),
  str("cs1Name", "CS1名"),
  str("cs2Code", "CS2コード"),
  str("cs2Name", "CS2名"),
  str("staffCode", "担当者コード"),
  str("staffName", "担当者名"),
  date("periodYm", "実績年月"),
  date("salesDate", "売上日付"),
  str("janCode", "JANコード"),
  int("netQty", "純売上数量"),
  bigint("listPriceYen", "税抜上代金額"),
  bigint("netSalesYen", "純売上金額"),
  bigint("returnYen", "(返品額)"),
  bigint("grossProfitYen", "粗利金額"),
  decimal("grossProfitRate", "粗利率(%)"),
]

/** 仕入・支払データ（21列） */
export const payablesColumns: ColumnDef[] = [
  str("vendorName", "支払先"),
  str("vendorShort", "支払先略称"),
  bigint("prevBalanceYen", "前月末残高"),
  bigint("paymentYen", "支払額"),
  bigint("carryoverYen", "繰越金額"),
  bigint("netPurchaseYen", "純仕入金額"),
  bigint("purchaseYen", "(仕入金額)"),
  bigint("returnYen", "(返品金額)"),
  bigint("discountYen", "(値引金額)"),
  bigint("otherYen", "(その他金額)"),
  bigint("taxYen", "消費税額"),
  bigint("purchaseTaxInYen", "税込仕入金額"),
  bigint("monthEndBalanceYen", "当月末残高"),
  bigint("cashYen", "(現金)"),
  bigint("checkYen", "(小切手)"),
  bigint("transferYen", "(振込)"),
  bigint("billYen", "(手形)"),
  bigint("offsetYen", "(相殺)"),
  bigint("discount2Yen", "(値引)"),
  bigint("feeYen", "(手数料)"),
  bigint("other2Yen", "(その他)"),
]

/** 請求・入金データ（26列） */
export const receivablesColumns: ColumnDef[] = [
  str("staffName", "担当者"),
  str("customerName", "請求先"),
  str("customerShort", "請求先略称"),
  bigint("prevBalanceYen", "前月末残高"),
  bigint("receivedYen", "入金額"),
  bigint("carryoverYen", "繰越金額"),
  bigint("netSalesYen", "純売上金額"),
  bigint("salesYen", "(売上金額)"),
  bigint("returnYen", "(返品金額)"),
  bigint("discountYen", "(値引金額)"),
  bigint("otherYen", "(その他金額)"),
  bigint("taxYen", "消費税額"),
  bigint("salesTaxInYen", "税込売上金額"),
  bigint("monthEndBalanceYen", "当月末残高"),
  bigint("cashYen", "(現金)"),
  bigint("checkYen", "(小切手)"),
  bigint("transferYen", "(振込)"),
  bigint("billYen", "(手形)"),
  bigint("offsetYen", "(相殺)"),
  bigint("discount2Yen", "(値引)"),
  bigint("feeYen", "(手数料)"),
  bigint("other2Yen", "(その他)"),
  bigint("npCreditYen", "NP与信"),
  bigint("npPaymentsYen", "NP掛払"),
  bigint("creditLimitBalanceYen", "与信枠残高"),
  str("notes", "備考欄"),
]

/** 年度粗利データ（10列） */
export const grossProfitColumns: ColumnDef[] = [
  str("staffName", "担当者名"),
  int("fiscalYear", "年度"),
  str("customerCategory1Code", "得意先分類1コード"),
  str("customerCategory1Name", "得意先分類1名"),
  int("netQty", "純売上数量"),
  bigint("listPriceYen", "税抜上代金額"),
  bigint("netSalesYen", "純売上金額"),
  bigint("returnYen", "（返品額）"),
  bigint("grossProfitYen", "粗利金額"),
  decimal("grossProfitRate", "粗利率(%)"),
]

/** dataset ID から ColumnDef[] を取得 */
export function getColumnDefs(dataset: string): ColumnDef[] {
  switch (dataset) {
    case "sales":        return salesColumns
    case "payables":     return payablesColumns
    case "receivables":  return receivablesColumns
    case "gross-profit":
    case "gross_profit": return grossProfitColumns
    default:             return []
  }
}

/** フロントのdataset ID → Prisma ImportDataset enum値 */
export function toImportDataset(dataset: string): "sales" | "payables" | "receivables" | "gross_profit" {
  if (dataset === "gross-profit") return "gross_profit"
  if (dataset === "sales" || dataset === "payables" || dataset === "receivables" || dataset === "gross_profit") {
    return dataset
  }
  throw new Error(`Unknown dataset: ${dataset}`)
}

/** Prisma ImportDataset enum値 → フロントのdataset ID */
export function fromImportDataset(dataset: string): string {
  if (dataset === "gross_profit") return "gross-profit"
  return dataset
}
