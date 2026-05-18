import { describe, it, expect, vi, beforeEach } from "vitest"
import { canAccess, requireRole } from "@/src/lib/permissions"

// getSession をモック（DB・Cookie 不要）
vi.mock("@/src/lib/auth", () => ({
  getSession: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
const mockGetSession = vi.mocked(getSession)

// ============================================================
// canAccess — 純粋関数のテスト
// ============================================================

describe("canAccess()", () => {
  describe("admin ロール", () => {
    it("全パスにアクセスできる", () => {
      const paths = [
        "/design/pop",
        "/inventory/catalog",
        "/finance/cashflow",
        "/data",
        "/admin/users",
        "/advice/reports",
        "/rules",
      ]
      for (const path of paths) {
        expect(canAccess("admin", path)).toBe(true)
      }
    })
  })

  describe("manager ロール", () => {
    it("全パスにアクセスできる", () => {
      const paths = [
        "/design/pop",
        "/inventory/catalog",
        "/finance/cashflow",
        "/data",
        "/advice/reports",
        "/rules",
      ]
      for (const path of paths) {
        expect(canAccess("manager", path)).toBe(true)
      }
    })
  })

  describe("general ロール", () => {
    it("/design/* にアクセスできる", () => {
      expect(canAccess("general", "/design/pop")).toBe(true)
      expect(canAccess("general", "/design/history")).toBe(true)
    })

    it("/account/* にアクセスできる", () => {
      expect(canAccess("general", "/account/password")).toBe(true)
    })

    it("/inventory/* にアクセスできない", () => {
      expect(canAccess("general", "/inventory/catalog")).toBe(false)
      expect(canAccess("general", "/inventory/planning")).toBe(false)
    })

    it("/finance/* にアクセスできない", () => {
      expect(canAccess("general", "/finance/cashflow")).toBe(false)
    })

    it("/data にアクセスできない", () => {
      expect(canAccess("general", "/data")).toBe(false)
      expect(canAccess("general", "/data/import")).toBe(false)
    })

    it("/admin/* にアクセスできない", () => {
      expect(canAccess("general", "/admin/users")).toBe(false)
    })

    it("/advice/* にアクセスできない", () => {
      expect(canAccess("general", "/advice/reports")).toBe(false)
    })

    it("/rules にアクセスできない", () => {
      expect(canAccess("general", "/rules")).toBe(false)
    })
  })
})

// ============================================================
// requireRole — セッションをモックしたテスト
// ============================================================

describe("requireRole()", () => {
  beforeEach(() => {
    mockGetSession.mockReset()
  })

  it("未認証の場合、'認証が必要です' をスローする", async () => {
    mockGetSession.mockResolvedValue(null)
    await expect(requireRole(["admin"])).rejects.toThrow("認証が必要です")
  })

  it("admin が admin 専用ガードを通過できる", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u1",
      email: "admin@test.com",
      name: "Admin",
      role: "admin",
    })
    const session = await requireRole(["admin"])
    expect(session.role).toBe("admin")
  })

  it("manager が manager 専用ガードを通過できる", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u2",
      email: "manager@test.com",
      name: "Manager",
      role: "manager",
    })
    const session = await requireRole(["admin", "manager"])
    expect(session.role).toBe("manager")
  })

  it("general が admin 専用ガードで '権限がありません' をスローする", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u3",
      email: "general@test.com",
      name: "General",
      role: "general",
    })
    await expect(requireRole(["admin"])).rejects.toThrow("権限がありません")
  })

  it("general が admin/manager 専用ガードで '権限がありません' をスローする", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u3",
      email: "general@test.com",
      name: "General",
      role: "general",
    })
    await expect(requireRole(["admin", "manager"])).rejects.toThrow("権限がありません")
  })

  it("manager が admin 専用ガードで '権限がありません' をスローする", async () => {
    mockGetSession.mockResolvedValue({
      userId: "u2",
      email: "manager@test.com",
      name: "Manager",
      role: "manager",
    })
    await expect(requireRole(["admin"])).rejects.toThrow("権限がありません")
  })
})
