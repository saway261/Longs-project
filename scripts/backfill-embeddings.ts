/**
 * 既存の business_news レコードに embedding を一括生成するスクリプト
 * 実行: npx tsx scripts/backfill-embeddings.ts
 */

import { PrismaClient } from "@prisma/client"
import { GoogleGenAI } from "@google/genai"

const prisma = new PrismaClient()

async function embedText(ai: InstanceType<typeof GoogleGenAI>, text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768 },
  })
  return result.embeddings?.[0]?.values ?? []
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません")

  const ai = new GoogleGenAI({ apiKey })

  const rows = await prisma.$queryRaw<{ id: string; title: string; summary: string | null }[]>`
    SELECT id, title, summary
    FROM business_news
    WHERE embedding IS NULL
      AND deleted_at IS NULL
    ORDER BY fetched_at ASC
  `

  console.log(`対象レコード数: ${rows.length}`)
  if (rows.length === 0) {
    console.log("すべてのレコードに embedding が存在します。")
    return
  }

  let success = 0
  let failed = 0

  for (const row of rows) {
    try {
      const text = [row.title, row.summary].filter(Boolean).join(" ")
      const vector = await embedText(ai, text)
      if (vector.length === 0) {
        console.warn(`  [skip] id=${row.id} — 空のベクターが返されました`)
        failed++
        continue
      }
      await prisma.$executeRawUnsafe(
        `UPDATE business_news SET embedding = $1::vector WHERE id = $2::uuid`,
        `[${vector.join(",")}]`,
        row.id,
      )
      success++
      console.log(`  [ok] (${success}/${rows.length}) ${row.title.slice(0, 50)}`)
    } catch (err) {
      failed++
      console.error(`  [error] id=${row.id}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`\n完了: 成功=${success}, 失敗=${failed}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
