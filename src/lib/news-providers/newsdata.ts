import type { NewsProvider, NewsProviderArticle } from "./types"

/**
 * keywords（カンマ区切り）・keywordMode（AND/OR）・notKeywords（カンマ区切り）から
 * NewsData.io の q パラメータ値を組み立てる。
 * スペースを含む語句は "" で囲む。演算子との間は半角スペース。
 */
function buildKeywordQuery(
  keywords: string | null | undefined,
  keywordMode: "AND" | "OR" | null | undefined,
  notKeywords: string | null | undefined,
): string | null {
  const wrap = (kw: string) => (kw.includes(" ") ? `"${kw}"` : kw)
  const mode = keywordMode ?? "AND"

  const mainParts = keywords
    ? keywords.split(",").map((s) => s.trim()).filter(Boolean).map(wrap)
    : []

  const notParts = notKeywords
    ? notKeywords.split(",").map((s) => s.trim()).filter(Boolean).map((kw) => `NOT ${wrap(kw)}`)
    : []

  if (mainParts.length === 0 && notParts.length === 0) return null

  const parts: string[] = []
  if (mainParts.length > 0) parts.push(mainParts.join(` ${mode} `))
  parts.push(...notParts)
  return parts.join(" ")
}

export const newsdataProvider: NewsProvider = {
  async fetch({ keywords, keywordMode, notKeywords, searchField, language, sources, sourceMode, domains, categoryMode, categories }) {
    const apiKey = process.env.NEWSDATA_IO_API_KEY
    if (!apiKey) {
      console.warn("[newsdata] NEWSDATA_IO_API_KEY が未設定です。スキップします。")
      return []
    }

    try {
      const params = new URLSearchParams({ apikey: apiKey })
      const q = buildKeywordQuery(keywords, keywordMode, notKeywords)
      const field = searchField ?? "q"
      if (q) params.set(field, q)
      if (language) params.set("language", language)
      if (sources) {
        // ドメインURL正規化: https://, http://, www. を除去
        const normalized = sources
          .split(",")
          .map((s) => s.trim().replace(/^https?:\/\//, "").replace(/^www\./, ""))
          .filter(Boolean)
          .join(",")
        if (sourceMode === "exclude") {
          params.set("excludedomain", normalized)
        } else {
          params.set("domainurl", normalized)
        }
      }
      // domains はAPI名の記録用（例: newsdata.io）のためクエリパラメータには使用しない
      if (categories && categoryMode === "include") params.set("category", categories)
      if (categories && categoryMode === "exclude") params.set("excludecategory", categories)

      const url = `https://newsdata.io/api/1/latest?${params.toString()}`

      // APIキーをマスクしてログ出力
      const maskedUrl = url.replace(apiKey, "***")
      console.log("[newsdata] リクエストURL:", maskedUrl)

      const res = await fetch(url, { cache: "no-store" })

      const json = await res.json()
      console.log("[newsdata] レスポンス status:", res.status, "| API status:", json.status, "| totalResults:", json.totalResults ?? "N/A")

      if (!res.ok || json.status === "error") {
        console.error("[newsdata] APIエラー詳細:", JSON.stringify(json))
        return []
      }

      const results: NewsProviderArticle[] = []

      if (!Array.isArray(json.results)) {
        console.warn("[newsdata] json.results が配列ではありません:", typeof json.results)
        return []
      }

      for (const item of json.results.slice(0, 10)) {
        const externalId: string = item.article_id ?? ""
        if (!externalId || !item.title) continue

        results.push({
          externalId,
          title: item.title,
          summary: item.description ?? null,
          sourceName: item.source_id ?? null,
          sourceUrl: item.link ?? null,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        })
      }

      console.log(`[newsdata] パース済み記事数: ${results.length}`)
      return results
    } catch (err) {
      console.error("[newsdata] 取得エラー:", err)
      return []
    }
  },
}
