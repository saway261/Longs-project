import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))
vi.mock("@/src/services/data-service", () => ({
  importData: vi.fn(),
  checkUnknownSalesItemCodes: vi.fn(),
  getImportHistoryByDataset: vi.fn(),
  generateTemplateCsv: vi.fn(),
  getDatasetRows: vi.fn(),
  updateDataRow: vi.fn(),
  deleteDataRow: vi.fn(),
  exportDatasetCsv: vi.fn(),
}))
vi.mock("@/src/lib/csv-parser", () => ({
  getExtension: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as dataService from "@/src/services/data-service"
import { getExtension } from "@/src/lib/csv-parser"
import {
  importDataAction,
  checkUnknownItemCodesAction,
  getImportHistoryByDatasetAction,
  downloadTemplateAction,
  getDatasetRowsAction,
  updateDataRowAction,
  deleteDataRowAction,
  exportDatasetAction,
} from "@/src/actions/data-actions"

const mockGetSession = vi.mocked(getSession)
const mockGetExtension = vi.mocked(getExtension)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

// FormData にファイルを含めるためのヘルパー
function makeFormData(filename = "test.csv", dataset = "sales") {
  const blob = new Blob(["col1,col2\nval1,val2"], { type: "text/csv" })
  const file = new File([blob], filename, { type: "text/csv" })
  const fd = new FormData()
  fd.append("file", file)
  fd.append("dataset", dataset)
  return fd
}

beforeEach(() => {
  mockGetSession.mockReset()
  mockGetExtension.mockReset()
})

// ============================================================
// importDataAction
// ============================================================
describe("importDataAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await importDataAction(makeFormData())
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await importDataAction(makeFormData())
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("ファイル未添付 → エラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const fd = new FormData()
    fd.append("dataset", "sales")
    const result = await importDataAction(fd)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("ファイルまたはデータセットが指定されていません")
  })

  it("非対応拡張子 → エラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockGetExtension.mockReturnValue("pdf")
    const result = await importDataAction(makeFormData("test.pdf"))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("CSV")
  })

  it("admin・CSV → インポート成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockGetExtension.mockReturnValue("csv")
    vi.mocked(dataService.importData).mockResolvedValue({ importedCount: 10, skippedCount: 0, issues: [] } as any)
    const result = await importDataAction(makeFormData())
    expect(result.success).toBe(true)
  })

  it("manager・XLSX → インポート成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    mockGetExtension.mockReturnValue("xlsx")
    vi.mocked(dataService.importData).mockResolvedValue({ importedCount: 5, skippedCount: 0, issues: [] } as any)
    const result = await importDataAction(makeFormData("test.xlsx"))
    expect(result.success).toBe(true)
  })
})

// ============================================================
// checkUnknownItemCodesAction
// ============================================================
describe("checkUnknownItemCodesAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const fd = makeFormData()
    const result = await checkUnknownItemCodesAction(fd)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await checkUnknownItemCodesAction(makeFormData())
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("ファイル未添付 → エラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await checkUnknownItemCodesAction(new FormData())
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("ファイルが指定されていません")
  })

  it("admin → 未登録アイテムリストを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.checkUnknownSalesItemCodes).mockResolvedValue({ unknownItems: [] })
    const result = await checkUnknownItemCodesAction(makeFormData())
    expect(result.success).toBe(true)
    if (result.success) expect(Array.isArray(result.data.unknownItems)).toBe(true)
  })
})

// ============================================================
// getImportHistoryByDatasetAction
// ============================================================
describe("getImportHistoryByDatasetAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getImportHistoryByDatasetAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getImportHistoryByDatasetAction()
    expect(result.success).toBe(false)
  })

  it("admin → 履歴を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.getImportHistoryByDataset).mockResolvedValue({})
    const result = await getImportHistoryByDatasetAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// downloadTemplateAction
// ============================================================
describe("downloadTemplateAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await downloadTemplateAction("sales")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await downloadTemplateAction("sales")
    expect(result.success).toBe(false)
  })

  it("admin → テンプレートCSVを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.generateTemplateCsv).mockReturnValue("col1,col2\n")
    const result = await downloadTemplateAction("sales")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fileName).toContain("sales")
      expect(result.data.csvContent).toBe("col1,col2\n")
    }
  })
})

// ============================================================
// getDatasetRowsAction
// ============================================================
describe("getDatasetRowsAction()", () => {
  const params = { dataset: "sales", page: 1, pageSize: 20 }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getDatasetRowsAction(params)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getDatasetRowsAction(params)
    expect(result.success).toBe(false)
  })

  it("admin → 行データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.getDatasetRows).mockResolvedValue({ rows: [], total: 0 })
    const result = await getDatasetRowsAction(params)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.total).toBe(0)
  })

  it("manager → 行データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(dataService.getDatasetRows).mockResolvedValue({ rows: [], total: 0 })
    const result = await getDatasetRowsAction(params)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateDataRowAction
// ============================================================
describe("updateDataRowAction()", () => {
  const params = { dataset: "sales", id: "row-1", data: { col1: "value" } }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateDataRowAction(params)
    expect(result.success).toBe(false)
    expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateDataRowAction(params)
    expect(result.success).toBe(false)
  })

  it("admin → 更新成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.updateDataRow).mockResolvedValue(undefined)
    const result = await updateDataRowAction(params)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// deleteDataRowAction
// ============================================================
describe("deleteDataRowAction()", () => {
  const params = { dataset: "sales", id: "row-1" }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await deleteDataRowAction(params)
    expect(result.success).toBe(false)
    expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await deleteDataRowAction(params)
    expect(result.success).toBe(false)
  })

  it("manager → 削除成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(dataService.deleteDataRow).mockResolvedValue(undefined)
    const result = await deleteDataRowAction(params)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// exportDatasetAction
// ============================================================
describe("exportDatasetAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await exportDatasetAction({ dataset: "sales" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await exportDatasetAction({ dataset: "sales" })
    expect(result.success).toBe(false)
  })

  it("admin → CSVを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(dataService.exportDatasetCsv).mockResolvedValue("col1,col2\nval1,val2\n")
    const result = await exportDatasetAction({ dataset: "sales" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fileName).toContain("sales")
      expect(result.data.csvContent).toContain("col1")
    }
  })
})
