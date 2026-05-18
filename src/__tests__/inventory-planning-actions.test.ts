import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/inventory-planning-service", () => ({
  getAvailableFiscalYears: vi.fn(),
  getInventoryPlan: vi.fn(),
  saveInventoryPlan: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as planningService from "@/src/services/inventory-planning-service"
import {
  getAvailableFiscalYearsAction,
  getInventoryPlanAction,
  saveInventoryPlanAction,
} from "@/src/actions/inventory-planning-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getAvailableFiscalYearsAction
// ============================================================
describe("getAvailableFiscalYearsAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getAvailableFiscalYearsAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getAvailableFiscalYearsAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → 年度一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(planningService.getAvailableFiscalYears).mockResolvedValue([2024, 2025])
    const result = await getAvailableFiscalYearsAction()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([2024, 2025])
  })

  it("manager → 年度一覧を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(planningService.getAvailableFiscalYears).mockResolvedValue([2025])
    const result = await getAvailableFiscalYearsAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getInventoryPlanAction
// ============================================================
describe("getInventoryPlanAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getInventoryPlanAction(2025)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getInventoryPlanAction(2025)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → 計画データを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(planningService.getInventoryPlan).mockResolvedValue([])
    const result = await getInventoryPlanAction(2025)
    expect(result.success).toBe(true)
    if (result.success) expect(Array.isArray(result.data)).toBe(true)
  })
})

// ============================================================
// saveInventoryPlanAction
// ============================================================
describe("saveInventoryPlanAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await saveInventoryPlanAction(2025, [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await saveInventoryPlanAction(2025, [])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → 保存成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(planningService.saveInventoryPlan).mockResolvedValue(undefined)
    const result = await saveInventoryPlanAction(2025, [])
    expect(result.success).toBe(true)
  })

  it("manager → 保存成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(planningService.saveInventoryPlan).mockResolvedValue(undefined)
    const result = await saveInventoryPlanAction(2025, [])
    expect(result.success).toBe(true)
  })
})
