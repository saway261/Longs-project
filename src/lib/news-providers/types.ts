export interface NewsProviderArticle {
  externalId: string
  title: string
  summary: string | null
  sourceName: string | null
  sourceUrl: string | null
  publishedAt: Date
}

export interface NewsProvider {
  fetch(query: {
    keywords?: string | null
    keywordMode?: "AND" | "OR" | null
    notKeywords?: string | null
    searchField?: "q" | "qInTitle" | "qInMeta" | null
    language?: string | null
    sources?: string | null
    sourceMode?: "include" | "exclude" | null
    domains?: string | null
    categoryMode?: "include" | "exclude" | null
    categories?: string | null
  }): Promise<NewsProviderArticle[]>
}
