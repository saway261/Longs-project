import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/settings-service", () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getInventoryTurnoverPeriodMonths: vi.fn(),
  setInventoryTurnoverPeriodMonths: vi.fn(),
  getRecurringEntries: vi.fn(),
  saveRecurringEntries: vi.fn(),
  getReservePolicies: vi.fn(),
  saveReservePolicies: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as settingsService from "@/src/services/settings-service"
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  getInventoryTurnoverPeriodAction,
  setInventoryTurnoverPeriodAction,
  getRecurringEntriesAction,
  saveRecurringEntriesAction,
  getReservePoliciesAction,
  saveReservePoliciesAction,
} from "@/src/actions/settings-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

const sampleCategory = { id: "cat-1", name: "アウター", sellThroughDays: 90, categoryCode: null }

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getCategoriesAction
// ============================================================
describe("getCategoriesAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getCategoriesAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getCategoriesAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin → カテゴリ一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.getCategories).mockResolvedValue([sampleCategory])
    const result = await getCategoriesAction()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(1)
  })

  it("manager → カテゴリ一覧を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(settingsService.getCategories).mockResolvedValue([])
    const result = await getCategoriesAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// createCategoryAction — バリデーションあり
// ============================================================
describe("createCategoryAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await createCategoryAction("アウター", 90)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await createCategoryAction("アウター", 90)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("カテゴリ名が空 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createCategoryAction("   ", 90)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("カテゴリ名を入力してください")
  })

  it("売り切り日数が0 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createCategoryAction("アウター", 0)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("売り切り日数は1以上で入力してください")
  })

  it("admin・正常値 → カテゴリを作成する", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.createCategory).mockResolvedValue(sampleCategory)
    const result = await createCategoryAction("アウター", 90)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe("アウター")
  })
})

// ============================================================
// updateCategoryAction — バリデーションあり
// ============================================================
describe("updateCategoryAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await updateCategoryAction("cat-1", "アウター", 90)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await updateCategoryAction("cat-1", "アウター", 90)
    expect(result.success).toBe(false)
  })

  it("カテゴリ名が空 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await updateCategoryAction("cat-1", "", 90)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("カテゴリ名を入力してください")
  })

  it("manager・正常値 → 更新成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(settingsService.updateCategory).mockResolvedValue(sampleCategory)
    const result = await updateCategoryAction("cat-1", "アウター", 90)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// deleteCategoryAction
// ============================================================
describe("deleteCategoryAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await deleteCategoryAction("cat-1")
    expect(result.success).toBe(false)
    expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await deleteCategoryAction("cat-1")
    expect(result.success).toBe(false)
  })

  it("admin → 削除成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.deleteCategory).mockResolvedValue({ success: true })
    const result = await deleteCategoryAction("cat-1")
    expect(result.success).toBe(true)
  })

  it("削除できない場合（使用中など）→ エラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.deleteCategory).mockResolvedValue({ success: false, reason: "使用中のカテゴリです" })
    const result = await deleteCategoryAction("cat-1")
    expect(result.success).toBe(false)
    expect(result.error).toBe("使用中のカテゴリです")
  })
})

// ============================================================
// setInventoryTurnoverPeriodAction — バリデーションあり
// ============================================================
describe("setInventoryTurnoverPeriodAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await setInventoryTurnoverPeriodAction(3)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await setInventoryTurnoverPeriodAction(3)
    expect(result.success).toBe(false)
  })

  it("不正な期間（2ヶ月）→ バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await setInventoryTurnoverPeriodAction(2)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("無効な期間です")
  })

  it.each([1, 3, 6, 12])("admin・%sヶ月 → 設定成功", async (months) => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.setInventoryTurnoverPeriodMonths).mockResolvedValue(undefined)
    const result = await setInventoryTurnoverPeriodAction(months)
    expect(result.success).toBe(true)
  })
})

// ============================================================
// saveRecurringEntriesAction — バリデーションあり
// ============================================================
describe("saveRecurringEntriesAction()", () => {
  const validEntry = { description: "家賃", amountYen: 100000, dueDay: 25 }

  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await saveRecurringEntriesAction([validEntry])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await saveRecurringEntriesAction([validEntry])
    expect(result.success).toBe(false)
  })

  it("項目名が空 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveRecurringEntriesAction([{ ...validEntry, description: "  " }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("項目名を入力してください")
  })

  it("金額が負 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveRecurringEntriesAction([{ ...validEntry, amountYen: -1 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("金額は0以上で入力してください")
  })

  it("支払日が0 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveRecurringEntriesAction([{ ...validEntry, dueDay: 0 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("支払日は1〜31で入力してください")
  })

  it("支払日が32 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveRecurringEntriesAction([{ ...validEntry, dueDay: 32 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("支払日は1〜31で入力してください")
  })

  it("admin・正常値 → 保存成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(settingsService.saveRecurringEntries).mockResolvedValue([validEntry as any])
    const result = await saveRecurringEntriesAction([validEntry])
    expect(result.success).toBe(true)
  })
})

// ============================================================
// saveReservePoliciesAction — バリデーションあり
// ============================================================
describe("saveReservePoliciesAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: 10 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: 10 }])
    expect(result.success).toBe(false)
  })

  it("割合が負 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: -1 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("0〜100")
  })

  it("割合が101 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: 101 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("0〜100")
  })

  it("割合が小数 → バリデーションエラー", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: 10.5 }])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toContain("0〜100")
  })

  it("manager・正常値 → 保存成功", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(settingsService.saveReservePolicies).mockResolvedValue([{ id: "rp-1", percent: 10 } as any])
    const result = await saveReservePoliciesAction([{ id: "rp-1", percent: 10 }])
    expect(result.success).toBe(true)
  })
})
