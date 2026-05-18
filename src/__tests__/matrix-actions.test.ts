import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/matrix-service", () => ({
  getCustomerMatrixData: vi.fn(),
  getProductMatrixData: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as matrixService from "@/src/services/matrix-service"
import {
  getCustomerMatrixAction,
  getProductMatrixAction,
} from "@/src/actions/matrix-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

const sampleFilter = { fiscalYear: 2025, season: null, categoryId: null }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getCustomerMatrixAction
// ============================================================
describe("getCustomerMatrixAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getCustomerMatrixAction(sampleFilter)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getCustomerMatrixAction(sampleFilter)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → マトリクスデータを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(matrixService.getCustomerMatrixData).mockResolvedValue([])
    const result = await getCustomerMatrixAction(sampleFilter)
    expect(result.success).toBe(true)
    if (result.success) expect(Array.isArray(result.data)).toBe(true)
  })

  it("manager → マトリクスデータを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(matrixService.getCustomerMatrixData).mockResolvedValue([])
    const result = await getCustomerMatrixAction(sampleFilter)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getProductMatrixAction
// ============================================================
describe("getProductMatrixAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getProductMatrixAction(sampleFilter)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getProductMatrixAction(sampleFilter)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → マトリクスデータを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(matrixService.getProductMatrixData).mockResolvedValue([])
    const result = await getProductMatrixAction(sampleFilter)
    expect(result.success).toBe(true)
  })

  it("manager → マトリクスデータを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(matrixService.getProductMatrixData).mockResolvedValue([])
    const result = await getProductMatrixAction(sampleFilter)
    expect(result.success).toBe(true)
  })
})
