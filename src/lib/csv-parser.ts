import * as XLSX from "xlsx"

/**
 * CSV / XLSX / XLSM ファイルのBufferを受け取り、
 * ヘッダー付き行オブジェクト配列を返す。
 * 全値は文字列として返す（raw: false）。
 *
 * エンコーディング方針:
 *   CSV  : BOM (EF BB BF) があれば除去したうえで UTF-8 文字列として読み込む。
 *          BOM なしでも UTF-8 として解釈する（モダンツール・本アプリのテンプレートはすべて UTF-8）。
 *          Shift-JIS CSV は現時点では非対応（必要になれば iconv-lite を追加）。
 *   XLSX/XLSM : バイナリ形式のため xlsx がエンコーディングを自動処理する。
 */
export function parseSpreadsheet(
  buffer: Buffer,
  extension: "csv" | "xlsx" | "xlsm",
): Record<string, string>[] {
  let workbook: XLSX.WorkBook

  if (extension === "csv") {
    // UTF-8 BOM (EF BB BF) を除去してから文字列として渡す
    const hasBom = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
    const csvString = (hasBom ? buffer.slice(3) : buffer).toString("utf-8")
    workbook = XLSX.read(csvString, { type: "string" })
  } else {
    // XLSX / XLSM: xlsx がエンコーディングを内部で処理
    workbook = XLSX.read(buffer, { type: "buffer", raw: false })
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const sheet = workbook.Sheets[firstSheetName]

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,       // 全値を文字列に変換
    defval: "",       // 空セルのデフォルト値
    blankrows: false, // 空行をスキップ
  })

  return rows
}

/** ファイル名から拡張子を判定 */
export function getExtension(fileName: string): "csv" | "xlsx" | "xlsm" {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".xlsx")) return "xlsx"
  if (lower.endsWith(".xlsm")) return "xlsm"
  return "csv"
}

/** 行オブジェクト配列からCSV文字列を生成 */
export function generateCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ]

  return lines.join("\n")
}
