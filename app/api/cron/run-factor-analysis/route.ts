import { NextRequest, NextResponse } from "next/server"
import { runWeeklyFactorAnalysis } from "@/src/services/advice-service"
import { getWeekStart } from "@/src/lib/news-week"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // weekStart クエリパラメータが指定されていればその週、なければ現在の週
    const weekStartParam = req.nextUrl.searchParams.get("weekStart")
    const weekStart = weekStartParam ? new Date(weekStartParam) : getWeekStart(new Date())

    const analyses = await runWeeklyFactorAnalysis(weekStart)
    return NextResponse.json({
      ok: true,
      count: analyses.length,
      weekStart: weekStart.toISOString(),
      executedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error("[cron/run-factor-analysis]", e)
    const message = e instanceof Error ? e.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
