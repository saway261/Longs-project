import type { NewsProvider, NewsProviderArticle } from "./types"

const AREA_CODES = [
  "016000", // 北海道
  "040000", // 宮城
  "130000", // 東京
  "230000", // 愛知
  "270000", // 大阪
  "340000", // 広島
  "390000", // 高知
  "400000", // 福岡
  "460100", // 鹿児島
  "471000", // 沖縄
]

interface JmaForecastResponse {
  publishingOffice: string
  reportDatetime: string
  targetArea: string
  headlineText: string
  text: string
}

export const jmaForecastProvider: NewsProvider = {
  async fetch(_query) {
    const results = await Promise.all(
      AREA_CODES.map(async (code): Promise<NewsProviderArticle | null> => {
        const url = `https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${code}.json`
        try {
          const res = await fetch(url, { cache: "no-store" })
          if (!res.ok) {
            console.error(`[jma-forecast] フェッチエラー ${code}:`, res.status)
            return null
          }
          const data: JmaForecastResponse = await res.json()

          const date = data.reportDatetime.split("T")[0]
          const title = data.headlineText
            ? data.headlineText
            : `${data.targetArea} ${date}`

          return {
            externalId: `jma-${code}-${data.reportDatetime}`,
            title,
            summary: data.text || null,
            sourceName: data.publishingOffice,
            sourceUrl: url,
            publishedAt: new Date(data.reportDatetime),
          }
        } catch (err) {
          console.error(`[jma-forecast] 取得エラー ${code}:`, err)
          return null
        }
      }),
    )

    const articles = results.filter((r): r is NewsProviderArticle => r !== null)
    console.log(`[jma-forecast] 取得記事数: ${articles.length}`)
    return articles
  },
}
