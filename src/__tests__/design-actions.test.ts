import { describe, it, expect, vi, beforeEach } from "vitest"

// design-actions は requireRole ではなく getSession を直接使用
// → general を含む全ロールがアクセス可能
vi.mock("@/src/lib/auth", () => ({ getSession: vi.fn() }))
vi.mock("@/src/services/design-service", () => ({
  generateDesignImage: vi.fn(),
  getDesignAssets: vi.fn(),
  getDesignAsset: vi.fn(),
  deleteDesignAsset: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as designService from "@/src/services/design-service"
import {
  getDesignAssetsAction,
  getDesignAssetAction,
  deleteDesignAssetAction,
} from "@/src/actions/design-actions"

const mockGetSession = vi.mocked(getSession)

const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

const sampleAsset = {
  id: "asset-1",
  title: "テストデザイン",
  style: "pop",
  type: "pop" as const,
  imageUrl: null,
  prompt: null,
  createdAt: new Date().toISOString(),
  createdBy: "general-1",
}

beforeEach(() => { mockGetSession.mockReset() })

// ============================================================
// getDesignAssetsAction — 全ロール許可（getSession直接使用）
// ============================================================
describe("getDesignAssetsAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getDesignAssetsAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("ログインが必要です")
  })

  it("general → デザイン一覧を返す（アクセス許可）", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    vi.mocked(designService.getDesignAssets).mockResolvedValue([sampleAsset])
    const result = await getDesignAssetsAction()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currentUserId).toBe("general-1")
      expect(Array.isArray(result.data.assets)).toBe(true)
    }
  })

  it("manager → デザイン一覧を返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    vi.mocked(designService.getDesignAssets).mockResolvedValue([])
    const result = await getDesignAssetsAction()
    expect(result.success).toBe(true)
  })

  it("admin → デザイン一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(designService.getDesignAssets).mockResolvedValue([])
    const result = await getDesignAssetsAction()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// getDesignAssetAction — 全ロール許可
// ============================================================
describe("getDesignAssetAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getDesignAssetAction("asset-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("ログインが必要です")
  })

  it("general → デザインを返す（アクセス許可）", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    vi.mocked(designService.getDesignAsset).mockResolvedValue(sampleAsset)
    const result = await getDesignAssetAction("asset-1")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data?.id).toBe("asset-1")
  })

  it("admin → デザインを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(designService.getDesignAsset).mockResolvedValue(null)
    const result = await getDesignAssetAction("not-found")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBeNull()
  })
})

// ============================================================
// deleteDesignAssetAction — 全ロール許可
// ============================================================
describe("deleteDesignAssetAction()", () => {
  it("未認証 → エラー", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await deleteDesignAssetAction("asset-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("ログインが必要です")
  })

  it("general → 削除成功（アクセス許可）", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    vi.mocked(designService.deleteDesignAsset).mockResolvedValue(true)
    const result = await deleteDesignAssetAction("asset-1")
    expect(result.success).toBe(true)
  })

  it("存在しないデザインを削除しようとした場合 → エラー", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    vi.mocked(designService.deleteDesignAsset).mockResolvedValue(false)
    const result = await deleteDesignAssetAction("not-found")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("デザインが見つかりません")
  })

  it("admin → 削除成功", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    vi.mocked(designService.deleteDesignAsset).mockResolvedValue(true)
    const result = await deleteDesignAssetAction("asset-1")
    expect(result.success).toBe(true)
  })
})
