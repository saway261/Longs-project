// @ts-nocheck
/**
 * 論理削除されたデザインアセットの物理削除スクリプト
 *
 * 削除から 180日（約半年）以上経過したレコードを対象に、
 * クラウドストレージのファイルと DB レコードを完全削除する。
 *
 * 使用方法:
 *   DRY_RUN=true  npx tsx scripts/cleanup-deleted-assets.ts  # テストモード（削除なし）
 *   DRY_RUN=false npx tsx scripts/cleanup-deleted-assets.ts  # 本番実行
 *
 * 前提条件:
 *   - DATABASE_URL が設定済み
 *   - IMAGE_STORAGE_TYPE=supabase の場合は SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *     SUPABASE_BUCKET_NAME も設定済みであること
 *
 * 推奨実行頻度: 月1回（cron など）
 */

import { PrismaClient } from "@prisma/client"
import { getImageStorage } from "../src/lib/image-storage"

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN !== "false"
const RETENTION_DAYS = 180

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

  console.log(`[cleanup] DRY_RUN=${DRY_RUN}`)
  console.log(`[cleanup] 対象: deletedAt < ${cutoff.toISOString()} (${RETENTION_DAYS}日以上前)`)

  const targets = await prisma.designAsset.findMany({
    where: {
      deletedAt: { not: null, lt: cutoff },
    },
    select: { id: true, imageUrl: true, title: true, deletedAt: true },
  })

  console.log(`[cleanup] 対象レコード数: ${targets.length}`)

  if (targets.length === 0) {
    console.log("[cleanup] 削除対象なし。終了します。")
    return
  }

  const storage = getImageStorage()
  let fileDeleted = 0
  let fileSkipped = 0
  let dbDeleted = 0

  for (const asset of targets) {
    console.log(`[cleanup]  id=${asset.id} title="${asset.title}" deletedAt=${asset.deletedAt?.toISOString()}`)

    if (DRY_RUN) {
      console.log(`[cleanup]    → DRY_RUN のためスキップ`)
      continue
    }

    // ストレージのファイル削除
    if (asset.imageUrl) {
      try {
        await storage.delete(asset.imageUrl)
        fileDeleted++
        console.log(`[cleanup]    → ファイル削除: ${asset.imageUrl}`)
      } catch (err) {
        fileSkipped++
        console.warn(`[cleanup]    → ファイル削除失敗（スキップ）: ${err}`)
      }
    } else {
      fileSkipped++
    }

    // DB レコード削除（AiGenerationLog は Cascade）
    await prisma.designAsset.delete({ where: { id: asset.id } })
    dbDeleted++
  }

  if (DRY_RUN) {
    console.log(`[cleanup] DRY_RUN 完了。実際の削除は行われていません。`)
  } else {
    console.log(`[cleanup] 完了: DBレコード削除=${dbDeleted}, ファイル削除=${fileDeleted}, ファイルスキップ=${fileSkipped}`)
  }
}

main()
  .catch((err) => {
    console.error("[cleanup] 予期しないエラー:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
