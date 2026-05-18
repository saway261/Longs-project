import { NextRequest, NextResponse } from "next/server"
import { fetchAndStoreAllActiveQueries } from "@/src/services/news-service"

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await fetchAndStoreAllActiveQueries()
    return NextResponse.json({ ok: true, executedAt: new Date().toISOString() })
  } catch (e) {
    console.error("[cron/fetch-news]", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
