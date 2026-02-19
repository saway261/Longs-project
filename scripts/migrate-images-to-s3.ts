// @ts-nocheck
/**
 * Supabase Storage → Amazon S3 画像マイグレーションスクリプト
 *
 * 使用方法:
 *   DRY_RUN=true  npx tsx scripts/migrate-images-to-s3.ts  # テストモード
 *   DRY_RUN=false npx tsx scripts/migrate-images-to-s3.ts  # 本番実行
 *
 * 前提条件:
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET_NAME が設定済み
 *   - AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *     S3_BUCKET_NAME, S3_PUBLIC_URL が設定済み
 *   - DATABASE_URL が設定済み
 */

import { createClient } from "@supabase/supabase-js"
import { PrismaClient } from "@prisma/client"

// ---- 設定 -------------------------------------------------------

const DRY_RUN = process.env.DRY_RUN !== "false"
const BATCH_SIZE = 10

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseBucket = process.env.SUPABASE_BUCKET_NAME ?? "design-assets"

// ---- クライアント初期化 ------------------------------------------

const prisma = new PrismaClient()
const supabase = createClient(supabaseUrl, supabaseKey)

// ---- ユーティリティ ----------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Supabase 公開URL → ストレージパス を抽出
 * 例: https://xxx.supabase.co/storage/v1/object/public/design-assets/2026/02/file.png
 *   → 2026/02/file.png
 */
function extractSupabasePath(url: string): string | null {
  const marker = `/object/public/${supabaseBucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

/**
 * Supabase からファイルをダウンロード
 */
async function downloadFromSupabase(filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(supabaseBucket)
    .download(filePath)

  if (error || !data) {
    throw new Error(`Supabase ダウンロード失敗 [${filePath}]: ${error?.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * S3 へアップロード（@aws-sdk/client-s3 が必要）
 * このスクリプトは Phase 2（S3実装後）に完全動作します
 */
async function uploadToS3(
  buffer: Buffer,
  filePath: string
): Promise<string> {
  // S3 SDK は Phase 2 で pnpm add @aws-sdk/client-s3 後に利用可能
  // 現時点では動的 import で存在チェック
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")

    const region = process.env.AWS_REGION ?? "ap-northeast-1"
    const bucketName = process.env.S3_BUCKET_NAME!
    const publicUrl = process.env.S3_PUBLIC_URL!

    const client = new S3Client({ region })
    const key = `design-assets/${filePath}`

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
        CacheControl: "max-age=31536000",
      })
    )

    return `${publicUrl}/${key}`
  } catch (err) {
    throw new Error(
      `S3 アップロード失敗: @aws-sdk/client-s3 がインストールされていないか、` +
        `AWS認証情報が未設定です。\n` +
        `  pnpm add @aws-sdk/client-s3 を実行してください。\n` +
        String(err)
    )
  }
}

// ---- メイン処理 --------------------------------------------------

async function main() {
  console.log(`===== 画像マイグレーション開始 (DRY_RUN=${DRY_RUN}) =====\n`)

  // Supabase URL を持つレコードを取得
  const assets = await prisma.designAsset.findMany({
    where: {
      imageUrl: {
        contains: "supabase.co",
      },
    },
    select: { id: true, imageUrl: true },
  })

  console.log(`対象レコード: ${assets.length} 件\n`)

  if (assets.length === 0) {
    console.log("マイグレーション対象がありません。終了します。")
    return
  }

  let success = 0
  let failed = 0

  // バッチ処理
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE)

    for (const asset of batch) {
      if (!asset.imageUrl) continue

      const filePath = extractSupabasePath(asset.imageUrl)
      if (!filePath) {
        console.warn(`  SKIP: URLパース失敗 [${asset.id}]: ${asset.imageUrl}`)
        continue
      }

      try {
        console.log(`  処理中 [${asset.id}]: ${filePath}`)

        if (!DRY_RUN) {
          const buffer = await downloadFromSupabase(filePath)
          const newUrl = await uploadToS3(buffer, filePath)

          await prisma.designAsset.update({
            where: { id: asset.id },
            data: { imageUrl: newUrl },
          })

          console.log(`  ✓ 成功: ${asset.imageUrl}\n    → ${newUrl}`)
        } else {
          console.log(`  [DRY_RUN] ダウンロード・アップロード・DB更新をスキップ`)
        }

        success++
      } catch (err) {
        console.error(
          `  ✗ 失敗 [${asset.id}]:`,
          err instanceof Error ? err.message : err
        )
        failed++
      }
    }

    // バッチ間のウェイト（レート制限対策）
    if (i + BATCH_SIZE < assets.length) {
      await sleep(500)
    }
  }

  console.log(`\n===== 完了 =====`)
  console.log(`成功: ${success} 件`)
  console.log(`失敗: ${failed} 件`)

  if (DRY_RUN) {
    console.log(`\n※ DRY_RUNモードのため実際の変更は行われていません`)
    console.log(`  本番実行: DRY_RUN=false npx tsx scripts/migrate-images-to-s3.ts`)
  }
}

main()
  .catch((err) => {
    console.error("予期しないエラー:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
