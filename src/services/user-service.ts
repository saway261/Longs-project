import { prisma } from "@/src/lib/prisma"
import bcrypt from "bcryptjs"
import type { UserRole } from "@prisma/client"

export type UserDTO = {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

/** 全ユーザー一覧を取得 */
export async function listUsers(): Promise<UserDTO[]> {
  const users = await prisma.userAccount.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? "",
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }))
}

export type CreateUserInput = {
  email: string
  name: string
  password: string
  role: UserRole
}

/** ユーザーを作成 */
export async function createUser(input: CreateUserInput): Promise<UserDTO> {
  const passwordHash = await bcrypt.hash(input.password, 12)

  const user = await prisma.userAccount.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  }
}

/** ユーザーを削除（自分自身は削除不可） */
export async function deleteUser(userId: string, requesterId: string): Promise<void> {
  if (userId === requesterId) {
    throw new Error("自分自身は削除できません")
  }

  await prisma.userAccount.delete({
    where: { id: userId },
  })
}
