import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // デモユーザーのパスワードをハッシュ化
  const passwordHash = await bcrypt.hash("demopass", 10)

  // UserAccountを作成（冪等性確保のためupsert）
  const user = await prisma.userAccount.upsert({
    where: { email: "owner@apparel.jp" },
    update: {
      passwordHash, // パスワードのみ更新
    },
    create: {
      email: "owner@apparel.jp",
      name: "オーナー",
      passwordHash,
      role: "admin",
    },
  })

  console.log(`✓ Created demo user: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
