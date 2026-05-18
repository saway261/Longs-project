import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))

// unstable_cache はモジュールロード時に呼ばれるため、パススルーに差し替える
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => any) => fn,
  revalidateTag: vi.fn(),
}))

vi.mock("@/src/services/insights-service", () => ({
  getSalesCompositionData: vi.fn(),
  getYearlyComparisonData: vi.fn(),
  getStockTurnoverData: vi.fn(),
  getSalesForecastData: vi.fn(),
  getTurnoverRankingData: vi.fn(),
  getCategoryAgingData: vi.fn(),
  getInventoryAlertData: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as svc from "@/src/services/insights-service"
import {
  getSalesCompositionAction,
  getYearlyComparisonAction,
  getStockTurnoverAction,
  getSalesForecastAction,
  getTurnoverRankingAction,
  getCategoryAgingAction,
  getInventoryAlertAction,
} from "@/src/actions/insights-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getSalesCompositionAction
// ============================================================
describe("getSalesCompositionAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getSalesCompositionAction("category")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getSalesCompositionAction("category")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(svc.getSalesCompositionData).mockResolvedValue({ items: [], totalYen: 0 } as any)
    const result = await getSalesCompositionAction("category")
    expect(result.success).toBe(true)
  })

  it("manager → データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(svc.getSalesCompositionData).mockResolvedValue({ items: [], totalYen: 0 } as any)
    const result = await getSalesCompositionAction("brand")
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getYearlyComparisonAction
// ============================================================
describe("getYearlyComparisonAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getYearlyComparisonAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getYearlyComparisonAction()
    expect(result.success).toBe(false)
  })

  it("admin → データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(svc.getYearlyComparisonData).mockResolvedValue({ rows: [], years: [] } as any)
    const result = await getYearlyComparisonAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getStockTurnoverAction
// ============================================================
describe("getStockTurnoverAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getStockTurnoverAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getStockTurnoverAction()
    expect(result.success).toBe(false)
  })

  it("manager → データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(svc.getStockTurnoverData).mockResolvedValue([])
    const result = await getStockTurnoverAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getSalesForecastAction
// ============================================================
describe("getSalesForecastAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getSalesForecastAction(null)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getSalesForecastAction(null)
    expect(result.success).toBe(false)
  })

  it("admin → データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(svc.getSalesForecastData).mockResolvedValue({ rows: [], categories: [] } as any)
    const result = await getSalesForecastAction(null)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getTurnoverRankingAction
// ============================================================
describe("getTurnoverRankingAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getTurnoverRankingAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getTurnoverRankingAction()
    expect(result.success).toBe(false)
  })

  it("admin → データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(svc.getTurnoverRankingData).mockResolvedValue([])
    const result = await getTurnoverRankingAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getCategoryAgingAction
// ============================================================
describe("getCategoryAgingAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getCategoryAgingAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getCategoryAgingAction()
    expect(result.success).toBe(false)
  })

  it("manager → データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(svc.getCategoryAgingData).mockResolvedValue([])
    const result = await getCategoryAgingAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getInventoryAlertAction
// ============================================================
describe("getInventoryAlertAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getInventoryAlertAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getInventoryAlertAction()
    expect(result.success).toBe(false)
  })

  it("admin → アラートデータを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(svc.getInventoryAlertData).mockResolvedValue([])
    const result = await getInventoryAlertAction()
    expect(result.success).toBe(true)
    if (result.success) expect(Array.isArray(result.data)).toBe(true)
  })
})
