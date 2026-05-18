import { XMLParser } from "fast-xml-parser"
import type { NewsProvider, NewsProviderArticle } from "./types"

const FEED_URL = "https://www.fashionsnap.com/rss.xml"

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
}

function trimFashionsnapSuffix(text: string): string {
  return text.replace(/このコンテンツは\s*FASHIONSNAP\s*が配信しています。\s*$/, "").trim()
}

export const fashionsnapRssProvider: NewsProvider = {
  async fetch(_query) {
    try {
      const res = await fetch(FEED_URL, { cache: "no-store" })
      if (!res.ok) {
        console.error("[fashionsnap-rss] フェッチエラー:", res.status)
        return []
      }

      const xml = await res.text()
      const parser = new XMLParser({ cdataPropName: "__cdata", ignoreAttributes: false })
      const parsed = parser.parse(xml)
      const rawItems: unknown = parsed?.rss?.channel?.item
      const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []

      const results: NewsProviderArticle[] = []
      for (const item of items) {
        if (typeof item !== "object" || item === null) continue
        const rec = item as Record<string, unknown>

        const link: string = typeof rec.link === "string" ? rec.link : ""
        if (!link.includes("fashionsnap.com/article")) continue
        if (link.includes("fashionsnap.com/streetstyle")) continue

        const rawDesc = rec.description
        const description =
          typeof rawDesc === "object" && rawDesc !== null
            ? String((rawDesc as Record<string, unknown>).__cdata ?? "")
            : String(rawDesc ?? "")

        const rawGuid = rec.guid
        const guid =
          typeof rawGuid === "object" && rawGuid !== null
            ? String((rawGuid as Record<string, unknown>).__cdata ?? link)
            : String(rawGuid ?? link)

        const rawPubDate = rec.pubDate
        const pubDateStr = typeof rawPubDate === "string" ? rawPubDate : ""

        results.push({
          externalId: guid || link,
          title: typeof rec.title === "string" ? rec.title : "",
          summary: trimFashionsnapSuffix(stripHtml(description)) || null,
          sourceName: "fashionsnap",
          sourceUrl: link,
          publishedAt: pubDateStr ? new Date(pubDateStr) : new Date(),
        })
      }

      console.log(`[fashionsnap-rss] パース済み記事数: ${results.length}`)
      return results
    } catch (err) {
      console.error("[fashionsnap-rss] 取得エラー:", err)
      return []
    }
  },
}
