import { describe, it, expect, vi, beforeEach } from "vitest"

// getSession をモック（DB・Cookie 不要）
vi.mock("@/src/lib/auth", () => ({
  getSession: vi.fn(),
}))

// user-service をモック（Prisma/DB 不要）
vi.mock("@/src/services/user-service", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { getSession } from "@/src/lib/auth"
import * as userService from "@/src/services/user-service"
import {
  getUsersAction,
  createUserAction,
  deleteUserAction,
} from "@/src/actions/user-actions"

const mockGetSession = vi.mocked(getSession)
const mockListUsers = vi.mocked(userService.listUsers)
const mockCreateUser = vi.mocked(userService.createUser)
const mockDeleteUser = vi.mocked(userService.deleteUser)

// テスト用のセッション定義
const adminSession = { userId: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" as const }
const managerSession = { userId: "manager-1", email: "manager@test.com", name: "Manager", role: "manager" as const }
const generalSession = { userId: "general-1", email: "general@test.com", name: "General", role: "general" as const }

const sampleUser = {
  id: "user-99",
  email: "new@test.com",
  name: "New User",
  role: "general" as const,
  createdAt: new Date().toISOString(),
}

// ============================================================
// getUsersAction
// ============================================================

describe("getUsersAction()", () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockListUsers.mockReset()
  })

  it("未認証の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await getUsersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await getUsersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("manager ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    const result = await getUsersAction()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin ロールの場合、ユーザー一覧を返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockListUsers.mockResolvedValue([sampleUser])
    const result = await getUsersAction()
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([sampleUser])
  })
})

// ============================================================
// createUserAction
// ============================================================

describe("createUserAction()", () => {
  const validInput = {
    email: "new@test.com",
    name: "New User",
    password: "password123",
    role: "general" as const,
  }

  beforeEach(() => {
    mockGetSession.mockReset()
    mockCreateUser.mockReset()
  })

  it("未認証の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await createUserAction(validInput)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await createUserAction(validInput)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("manager ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    const result = await createUserAction(validInput)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin ロールで admin ユーザーを作成しようとした場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createUserAction({ ...validInput, role: "admin" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("管理者ロールはUIから作成できません。")
  })

  it("admin ロールで general ユーザーを作成できる", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockCreateUser.mockResolvedValue(sampleUser)
    const result = await createUserAction(validInput)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe("new@test.com")
  })

  it("admin ロールで manager ユーザーを作成できる", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const managerUser = { ...sampleUser, role: "manager" as const }
    mockCreateUser.mockResolvedValue(managerUser)
    const result = await createUserAction({ ...validInput, role: "manager" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.role).toBe("manager")
  })

  it("メールアドレスが空の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createUserAction({ ...validInput, email: "  " })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("メールアドレスを入力してください")
  })

  it("名前が空の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createUserAction({ ...validInput, name: "" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("名前を入力してください")
  })

  it("パスワードが5文字以下の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    const result = await createUserAction({ ...validInput, password: "12345" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("パスワードは6文字以上で入力してください")
  })
})

// ============================================================
// deleteUserAction
// ============================================================

describe("deleteUserAction()", () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockDeleteUser.mockReset()
  })

  it("未認証の場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(null)
    const result = await deleteUserAction("user-99")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("認証が必要です")
  })

  it("general ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(generalSession)
    const result = await deleteUserAction("user-99")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("manager ロールの場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(managerSession)
    const result = await deleteUserAction("user-99")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("権限がありません")
  })

  it("admin が他ユーザーを削除できる", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockDeleteUser.mockResolvedValue(undefined)
    const result = await deleteUserAction("user-99")
    expect(result.success).toBe(true)
  })

  it("admin が自分自身を削除しようとした場合、エラーを返す", async () => {
    mockGetSession.mockResolvedValue(adminSession)
    mockDeleteUser.mockRejectedValue(new Error("自分自身は削除できません"))
    const result = await deleteUserAction("admin-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toBe("自分自身は削除できません")
  })
})
