import { NextRequest, NextResponse } from "next/server"
import {
  generateWeeklyNewsSummaries,
  generateWeeklyCategoryAdvice,
  generateInventoryActions,
  getCategorySelections,
} from "@/src/services/advice-service"
import { getWeekStart, getWeekEnd } from "@/src/lib/news-week"

/**
 * 週次クロージングバッチ（毎週土曜 23:00 JST 実行）
 *
 * 実行順序:
 *   [並列] 手順2: ニュース要約レポート生成
 *   [並列] 手順3: カテゴリ別動向アドバイス生成（選択済みカテゴリのみ）
 *   [逐次] 手順4: 在庫データ分析アドバイス生成（手順2完了後）
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const weekStartParam = req.nextUrl.searchParams.get("weekStart")
  const weekStart = weekStartParam ? new Date(weekStartParam) : getWeekStart(new Date())
  const weekEnd = getWeekEnd(weekStart)

  const result = {
    weekStart: weekStart.toISOString(),
    executedAt: new Date().toISOString(),
    summaries: 0,
    categoryAdvices: 0,
    inventoryActions: 0,
    errors: [] as string[],
  }

  // 手順2 & 手順3 を並列実行
  const [summaries, categoryCount] = await Promise.all([
    // 手順2: ニュース要約レポート
    generateWeeklyNewsSummaries(weekStart).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("[weekly-closing] 手順2 エラー:", e)
      result.errors.push(`summaries: ${msg}`)
      return []
    }),

    // 手順3: 選択済みカテゴリのみアドバイス生成（前週からの継承含む）
    (async () => {
      const selections = await getCategorySelections(weekStart)
      if (selections.length === 0) return 0
      const settled = await Promise.allSettled(
        selections.map((s) => generateWeeklyCategoryAdvice(weekStart, s.categoryId)),
      )
      const failed = settled.filter((s) => s.status === "rejected")
      for (const f of failed) {
        const msg = f.status === "rejected" && f.reason instanceof Error ? f.reason.message : String((f as PromiseRejectedResult).reason)
        console.error("[weekly-closing] 手順3 カテゴリエラー:", msg)
        result.errors.push(`categoryAdvice: ${msg}`)
      }
      return settled.filter((s) => s.status === "fulfilled").length
    })(),
  ])

  result.summaries = summaries.length
  result.categoryAdvices = categoryCount

  // 手順4: 在庫アドバイス（手順2完了後）
  if (summaries.length > 0) {
    const actions = await generateInventoryActions(weekStart, [], weekStart, weekEnd).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("[weekly-closing] 手順4 エラー:", e)
      result.errors.push(`inventoryActions: ${msg}`)
      return []
    })
    result.inventoryActions = actions.length
  } else {
    result.errors.push("inventoryActions: スキップ（ニュース要約が0件のため）")
  }

  const hasError = result.errors.length > 0
  return NextResponse.json({ ok: !hasError, ...result }, { status: hasError ? 207 : 200 })
}
