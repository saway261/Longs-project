import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/finance-service", () => ({
  getGanttEntries: vi.fn(),
  getReservePolicies: vi.fn(),
  updateReservePolicy: vi.fn(),
  getFinanceOverviewStats: vi.fn(),
  updateTotalAssetsYen: vi.fn(),
}))
vi.mock("@/src/services/data-service", () => ({
  getInventoryHubData: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as financeService from "@/src/services/finance-service"
import * as dataService from "@/src/services/data-service"
import {
  getInventoryHubDataAction,
  getGanttEntriesAction,
  getReservePoliciesAction,
  updateReservePolicyAction,
  updateTotalAssetsYenAction,
  getFinanceOverviewStatsAction,
} from "@/src/actions/finance-actions"

const mockGetSession = vi.mocked(getSession)
const mockGetInventoryHubData = vi.mocked(dataService.getInventoryHubData)
const mockGetGanttEntries = vi.mocked(financeService.getGanttEntries)
const mockGetReservePolicies = vi.mocked(financeService.getReservePolicies)
const mockUpdateReservePolicy = vi.mocked(financeService.updateReservePolicy)
const mockUpdateTotalAssetsYen = vi.mocked(financeService.updateTotalAssetsYen)
const mockGetFinanceOverviewStats = vi.mocked(financeService.getFinanceOverviewStats)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

// ロール制御の共通検証ヘルパー
async function expectAuthError(action: () => Promise<any>) {
  mockGetSession.mockResolvedValue(null)
  const result = await action()
  expect(result.success).toBe(false)
  expect(result.error).toBe("認証が必要です")
}

async function expectPermissionError(action: () => Promise<any>) {
  mockGetSession.mockResolvedValue(generalSession)
  const result = await action()
  expect(result.success).toBe(false)
  expect(result.error).toBe("権限がありません")
}

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getInventoryHubDataAction
// ============================================================
describe("getInventoryHubDataAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => getInventoryHubDataAction("last3months")))
  it("general → エラー", () => expectPermissionError(() => getInventoryHubDataAction("last3months")))

  it("admin → データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockGetInventoryHubData.mockResolvedValue({ summary: [] } as any)
    const result = await getInventoryHubDataAction("last3months")
    expect(result.success).toBe(true)
  })

  it("manager → データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    mockGetInventoryHubData.mockResolvedValue({ summary: [] } as any)
    const result = await getInventoryHubDataAction("last3months")
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getGanttEntriesAction
// ============================================================
describe("getGanttEntriesAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => getGanttEntriesAction()))
  it("general → エラー", () => expectPermissionError(() => getGanttEntriesAction()))

  it("admin → エントリー一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockGetGanttEntries.mockResolvedValue([])
    const result = await getGanttEntriesAction()
    expect(result.success).toBe(true)
    if (result.success) expect(Array.isArray(result.data)).toBe(true)
  })
})

// ============================================================
// getReservePoliciesAction
// ============================================================
describe("getReservePoliciesAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => getReservePoliciesAction()))
  it("general → エラー", () => expectPermissionError(() => getReservePoliciesAction()))

  it("admin → ポリシー一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockGetReservePolicies.mockResolvedValue([])
    const result = await getReservePoliciesAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateReservePolicyAction
// ============================================================
describe("updateReservePolicyAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => updateReservePolicyAction("id-1", 10)))
  it("general → エラー", () => expectPermissionError(() => updateReservePolicyAction("id-1", 10)))

  it("admin → 更新成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockUpdateReservePolicy.mockResolvedValue(undefined)
    const result = await updateReservePolicyAction("id-1", 10)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateTotalAssetsYenAction
// ============================================================
describe("updateTotalAssetsYenAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => updateTotalAssetsYenAction(1000000)))
  it("general → エラー", () => expectPermissionError(() => updateTotalAssetsYenAction(1000000)))

  it("admin → 更新成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockUpdateTotalAssetsYen.mockResolvedValue(undefined)
    const result = await updateTotalAssetsYenAction(1000000)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getFinanceOverviewStatsAction
// ============================================================
describe("getFinanceOverviewStatsAction()", () => {
  it("未認証 → エラー", () => expectAuthError(() => getFinanceOverviewStatsAction()))
  it("general → エラー", () => expectPermissionError(() => getFinanceOverviewStatsAction()))

  it("manager → 統計データを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    mockGetFinanceOverviewStats.mockResolvedValue({ totalAssetsYen: 0 } as any)
    const result = await getFinanceOverviewStatsAction()
    expect(result.success).toBe(true)
  })
})
