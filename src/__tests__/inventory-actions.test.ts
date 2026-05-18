import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/inventory-service", () => ({
  getInventoryCatalog: vi.fn(),
  updateProduct: vi.fn(),
  updateVariant: vi.fn(),
  getProcurementListForUser: vi.fn(),
  getOrCreateDraftList: vi.fn(),
  addProcurementItem: vi.fn(),
  removeProcurementItem: vi.fn(),
  updateProcurementItemQty: vi.fn(),
  clearProcurementList: vi.fn(),
  markProcurementItemOrdered: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as inventoryService from "@/src/services/inventory-service"
import {
  getInventoryCatalogAction,
  updateProductAction,
  updateVariantAction,
  getProcurementListAction,
  addProcurementItemAction,
  removeProcurementItemAction,
  updateProcurementItemQtyAction,
  markProcurementItemOrderedAction,
  clearProcurementListAction,
} from "@/src/actions/inventory-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getInventoryCatalogAction — try/catchなし、エラーはスロー
// ============================================================
describe("getInventoryCatalogAction()", () => {
  it("未認証 → スロー", async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(getInventoryCatalogAction()).rejects.toThrow("認証が必要です")
  })

  it("general → スロー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    await expect(getInventoryCatalogAction()).rejects.toThrow("権限がありません")
  })

  it("admin → カタログを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.getInventoryCatalog).mockResolvedValue({ variants: [], masters: [] } as any)
    const result = await getInventoryCatalogAction()
    expect(result).toBeDefined()
  })

  it("manager → カタログを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(inventoryService.getInventoryCatalog).mockResolvedValue({ variants: [], masters: [] } as any)
    const result = await getInventoryCatalogAction()
    expect(result).toBeDefined()
  })
})

// ============================================================
// updateProductAction — { error } | undefined
// ============================================================
describe("updateProductAction()", () => {
  const data = { name: "商品A", brandName: null, categoryName: null, season: null }

  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateProductAction("pid-1", data)
    expect(result?.error).toBe("認証が必要です")
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateProductAction("pid-1", data)
    expect(result?.error).toBe("権限がありません")
  })

  it("admin → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.updateProduct).mockResolvedValue(undefined)
    const result = await updateProductAction("pid-1", data)
    expect(result).toBeUndefined()
  })
})

// ============================================================
// updateVariantAction — { error } | undefined
// ============================================================
describe("updateVariantAction()", () => {
  const data = { color: "赤", size: "M", janCode: null, priceYen: null }

  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateVariantAction("vid-1", data)
    expect(result?.error).toBe("認証が必要です")
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateVariantAction("vid-1", data)
    expect(result?.error).toBe("権限がありません")
  })

  it("manager → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(inventoryService.updateVariant).mockResolvedValue(undefined)
    const result = await updateVariantAction("vid-1", data)
    expect(result).toBeUndefined()
  })
})

// ============================================================
// getProcurementListAction — try/catchなし、エラーはスロー
// ============================================================
describe("getProcurementListAction()", () => {
  it("未認証 → スロー", async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(getProcurementListAction()).rejects.toThrow("認証が必要です")
  })

  it("general → スロー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    await expect(getProcurementListAction()).rejects.toThrow("権限がありません")
  })

  it("admin → 調達リストを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.getProcurementListForUser).mockResolvedValue([])
    const result = await getProcurementListAction()
    expect(Array.isArray(result)).toBe(true)
  })
})

// ============================================================
// addProcurementItemAction
// ============================================================
describe("addProcurementItemAction()", () => {
  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await addProcurementItemAction("vid-1", 10, 1000, "normal")
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await addProcurementItemAction("vid-1", 10, 1000, "normal")
    expect("error" in result).toBe(true)
    if ("error" in result) expect(result.error).toBe("権限がありません")
  })

  it("admin → itemIdを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.getOrCreateDraftList).mockResolvedValue("list-1")
    vi.mocked(inventoryService.addProcurementItem).mockResolvedValue("item-1")
    const result = await addProcurementItemAction("vid-1", 10, 1000, "normal")
    expect("itemId" in result).toBe(true)
    if ("itemId" in result) expect(result.itemId).toBe("item-1")
  })
})

// ============================================================
// removeProcurementItemAction
// ============================================================
describe("removeProcurementItemAction()", () => {
  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await removeProcurementItemAction("item-1")
    expect(result).toEqual({ error: "認証が必要です" })
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await removeProcurementItemAction("item-1")
    expect(result).toEqual({ error: "権限がありません" })
  })

  it("manager → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(inventoryService.removeProcurementItem).mockResolvedValue(undefined)
    const result = await removeProcurementItemAction("item-1")
    expect(result).toBeUndefined()
  })
})

// ============================================================
// updateProcurementItemQtyAction
// ============================================================
describe("updateProcurementItemQtyAction()", () => {
  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateProcurementItemQtyAction("item-1", 5)
    expect(result).toEqual({ error: "認証が必要です" })
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateProcurementItemQtyAction("item-1", 5)
    expect(result).toEqual({ error: "権限がありません" })
  })

  it("admin → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.updateProcurementItemQty).mockResolvedValue(undefined)
    const result = await updateProcurementItemQtyAction("item-1", 5)
    expect(result).toBeUndefined()
  })
})

// ============================================================
// markProcurementItemOrderedAction
// ============================================================
describe("markProcurementItemOrderedAction()", () => {
  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await markProcurementItemOrderedAction("item-1")
    expect(result).toEqual({ error: "認証が必要です" })
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await markProcurementItemOrderedAction("item-1")
    expect(result).toEqual({ error: "権限がありません" })
  })

  it("manager → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(inventoryService.markProcurementItemOrdered).mockResolvedValue(undefined)
    const result = await markProcurementItemOrderedAction("item-1")
    expect(result).toBeUndefined()
  })
})

// ============================================================
// clearProcurementListAction
// ============================================================
describe("clearProcurementListAction()", () => {
  it("未認証 → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await clearProcurementListAction()
    expect(result).toEqual({ error: "認証が必要です" })
  })

  it("general → エラーオブジェクトを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await clearProcurementListAction()
    expect(result).toEqual({ error: "権限がありません" })
  })

  it("admin → undefinedを返す（成功）", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(inventoryService.getOrCreateDraftList).mockResolvedValue("list-1")
    vi.mocked(inventoryService.clearProcurementList).mockResolvedValue(undefined)
    const result = await clearProcurementListAction()
    expect(result).toBeUndefined()
  })
})
