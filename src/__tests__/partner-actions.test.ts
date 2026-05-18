import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/partner-service", () => ({
  getSuppliers: vi.fn(),
  updateSupplierPaymentTerms: vi.fn(),
  getCustomers: vi.fn(),
  updateCustomerCollectionTerms: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as partnerService from "@/src/services/partner-service"
import {
  getSuppliersAction,
  updateSupplierPaymentTermsAction,
  getCustomersAction,
  updateCustomerCollectionTermsAction,
} from "@/src/actions/partner-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getSuppliersAction
// ============================================================
describe("getSuppliersAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getSuppliersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getSuppliersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → 仕入先一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(partnerService.getSuppliers).mockResolvedValue([])
    const result = await getSuppliersAction()
    expect(result.success).toBe(true)
  })

  it("manager → 仕入先一覧を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(partnerService.getSuppliers).mockResolvedValue([])
    const result = await getSuppliersAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateSupplierPaymentTermsAction — バリデーションあり
// ============================================================
describe("updateSupplierPaymentTermsAction()", () => {
  const validTerms = { closingDay: 20, paymentMonthOffset: 1, paymentDay: 31 }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateSupplierPaymentTermsAction("bp-1", validTerms)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateSupplierPaymentTermsAction("bp-1", validTerms)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("締め日が不正（0）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateSupplierPaymentTermsAction("bp-1", { ...validTerms, closingDay: 0 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("締め日")
  })

  it("締め日が不正（29）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateSupplierPaymentTermsAction("bp-1", { ...validTerms, closingDay: 29 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("締め日")
  })

  it("支払月オフセットが不正（3）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateSupplierPaymentTermsAction("bp-1", { ...validTerms, paymentMonthOffset: 3 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("支払月")
  })

  it("支払日が不正（0）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateSupplierPaymentTermsAction("bp-1", { ...validTerms, paymentDay: 0 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("支払日")
  })

  it("admin・正常値 → 更新成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(partnerService.updateSupplierPaymentTerms).mockResolvedValue({ id: "bp-1" } as any)
    const result = await updateSupplierPaymentTermsAction("bp-1", validTerms)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getCustomersAction
// ============================================================
describe("getCustomersAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getCustomersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getCustomersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → 得意先一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(partnerService.getCustomers).mockResolvedValue([])
    const result = await getCustomersAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateCustomerCollectionTermsAction — バリデーションあり
// ============================================================
describe("updateCustomerCollectionTermsAction()", () => {
  const validTerms = { closingDay: 20, collectionMonthOffset: 1, collectionDay: 31 }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateCustomerCollectionTermsAction("bp-1", validTerms)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateCustomerCollectionTermsAction("bp-1", validTerms)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("締め日が不正（30）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateCustomerCollectionTermsAction("bp-1", { ...validTerms, closingDay: 30 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("締め日")
  })

  it("回収月オフセットが不正（3）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateCustomerCollectionTermsAction("bp-1", { ...validTerms, collectionMonthOffset: 3 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("回収月")
  })

  it("manager・正常値 → 更新成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(partnerService.updateCustomerCollectionTerms).mockResolvedValue({ id: "bp-1" } as any)
    const result = await updateCustomerCollectionTermsAction("bp-1", validTerms)
    expect(result.success).toBe(true)
  })
})
