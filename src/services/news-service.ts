import { prisma } from "@/src/lib/prisma"
import { getWeekStart } from "@/src/lib/news-week"
import { newsdataProvider } from "@/src/lib/news-providers/newsdata"
import type { NewsProvider } from "@/src/lib/news-providers/types"
import { embedText } from "@/src/lib/gemini"

export interface QueryInput {
  name: string
  keywords?: string | null
  language?: string | null
  sources?: string | null
  domains?: string | null
  categoryMode?: "include" | "exclude" | null
  categories?: string | null
}

export interface NewsQueryDTO {
  id: string
  queryGroupId: string
  name: string
  keywords: string | null
  language: string | null
  sources: string | null
  domains: string | null
  categoryMode: "include" | "exclude" | null
  categories: string | null
  createdAt: Date
}

export interface NewsArticleDTO {
  id: string
  queryId: string
  externalId: string | null
  title: string
  summary: string | null
  sourceName: string | null
  sourceUrl: string | null
  impact: string | null
  publishedAt: Date
  fetchedAt: Date
}

export interface NewsViewGroup {
  queryGroupId: string
  queryName: string
  articles: NewsArticleDTO[]
}

// ─── NewsQuery CRUD ───────────────────────────────────────────────

/**
 * queryGroupId と同じ id を持つレコード（初代レコード）の createdAt を基準に昇順ソート。
 * 編集のたびに新世代レコードが作られても並び順が変わらない。
 */
async function sortByGroupOrigin<T extends { queryGroupId: string }>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows
  const groupIds = rows.map((r) => r.queryGroupId)
  const origins = await prisma.newsQuery.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, createdAt: true },
  })
  const originMap = new Map(origins.map((o) => [o.id, o.createdAt]))
  return [...rows].sort((a, b) => {
    const aDate = originMap.get(a.queryGroupId)?.getTime() ?? 0
    const bDate = originMap.get(b.queryGroupId)?.getTime() ?? 0
    return aDate - bDate
  })
}

/** isActive=true のクエリ一覧（グループ初代レコードの createdAt ASC） */
export async function listActiveQueries(): Promise<NewsQueryDTO[]> {
  const rows = await prisma.newsQuery.findMany({
    where: { isActive: true },
  })
  const sorted = await sortByGroupOrigin(rows)
  return sorted.map(toQueryDTO)
}

/** 新規クエリ作成（queryGroupId = id） */
export async function createQuery(input: QueryInput): Promise<NewsQueryDTO> {
  const id = crypto.randomUUID()
  const row = await prisma.newsQuery.create({
    data: {
      id,
      queryGroupId: id,
      name: input.name,
      keywords: input.keywords ?? null,
      language: input.language ?? "ja",
      sources: input.sources ?? null,
      domains: input.domains ?? null,
      categoryMode: input.categoryMode ?? null,
      categories: input.categories ?? null,
    },
  })
  return toQueryDTO(row)
}

/** クエリ更新（世代管理: 旧をdeactivate→新レコード作成） */
export async function updateQuery(id: string, input: QueryInput): Promise<NewsQueryDTO> {
  return prisma.$transaction(async (tx) => {
    const old = await tx.newsQuery.findUnique({ where: { id } })
    if (!old || !old.isActive) throw new Error("クエリが見つかりません")

    // 旧をdeactivate
    await tx.newsQuery.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    })

    // 新世代を作成
    const newRow = await tx.newsQuery.create({
      data: {
        queryGroupId: old.queryGroupId,
        name: input.name,
        keywords: input.keywords ?? null,
        language: input.language ?? "ja",
        sources: input.sources ?? null,
        domains: input.domains ?? null,
        categoryMode: input.categoryMode ?? null,
        categories: input.categories ?? null,
      },
    })
    return toQueryDTO(newRow)
  })
}

/** クエリ削除（queryGroupId全世代をソフト削除） */
export async function deleteQuery(id: string): Promise<void> {
  const row = await prisma.newsQuery.findUnique({ where: { id } })
  if (!row) throw new Error("クエリが見つかりません")

  await prisma.newsQuery.updateMany({
    where: { queryGroupId: row.queryGroupId },
    data: { isActive: false, deactivatedAt: new Date() },
  })
}

/** 記事を論理削除（deletedAt を設定） */
export async function deleteArticle(id: string): Promise<void> {
  const row = await prisma.businessNews.findUnique({ where: { id } })
  if (!row) throw new Error("記事が見つかりません")
  await prisma.businessNews.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

// ─── ニュース取得・保存 ────────────────────────────────────────────

const provider: NewsProvider = newsdataProvider

/** 全アクティブクエリでニュースを取得してDBに保存 */
export async function fetchAndStoreAllActiveQueries(): Promise<void> {
  const queries = await listActiveQueries()
  if (queries.length === 0) return

  const weekStart = getWeekStart(new Date())

  await Promise.all(
    queries.map(async (q) => {
      try {
        const articles = await provider.fetch({
          keywords: q.keywords,
          language: q.language,
          sources: q.sources,
          domains: q.domains,
          categoryMode: q.categoryMode,
          categories: q.categories,
        })
        if (articles.length === 0) return

        const data = articles.map((a) => ({
          queryId: q.id,
          externalId: a.externalId,
          title: a.title,
          summary: a.summary,
          sourceName: a.sourceName,
          sourceUrl: a.sourceUrl,
          publishedAt: a.publishedAt,
          weekStart,
        }))

        await prisma.businessNews.createMany({ data, skipDuplicates: true })

        // embedding が未生成の記事に対してベクターを生成して保存
        await generateEmbeddingsForQuery(q.id)
      } catch (err) {
        console.error(`[news-service] クエリ ${q.id} の取得エラー:`, err)
      }
    }),
  )
}

/** embedding IS NULL の記事に対して gemini-embedding-001 でベクターを生成して保存 */
async function generateEmbeddingsForQuery(queryId: string): Promise<void> {
  const rows = await prisma.$queryRaw<{ id: string; title: string; summary: string | null }[]>`
    SELECT id, title, summary
    FROM business_news
    WHERE embedding IS NULL
      AND deleted_at IS NULL
      AND query_id = ${queryId}::uuid
  `

  for (const row of rows) {
    try {
      const text = [row.title, row.summary].filter(Boolean).join(" ")
      const vector = await embedText(text)
      if (vector.length === 0) continue
      await prisma.$executeRawUnsafe(
        `UPDATE business_news SET embedding = $1::vector WHERE id = $2::uuid`,
        `[${vector.join(",")}]`,
        row.id,
      )
    } catch (err) {
      console.error(`[news-service] embedding エラー (id=${row.id}):`, err)
    }
  }
}

// ─── 表示用 ───────────────────────────────────────────────────────

/** 指定週のニュースをqueryGroupId単位でグループ化して返す */
export async function getNewsView(weekStart: Date): Promise<NewsViewGroup[]> {
  // アクティブなクエリをグループ初代レコードの createdAt 昇順で取得
  const rawActiveQueries = await prisma.newsQuery.findMany({
    where: { isActive: true },
  })
  const activeQueries = await sortByGroupOrigin(rawActiveQueries)

  if (activeQueries.length === 0) return []

  // queryGroupId → 最新クエリ名のマップ
  const groupMap = new Map<string, { name: string; queryIds: string[] }>()

  for (const q of activeQueries) {
    if (!groupMap.has(q.queryGroupId)) {
      groupMap.set(q.queryGroupId, { name: q.name, queryIds: [] })
    }
    groupMap.get(q.queryGroupId)!.queryIds.push(q.id)
  }

  // 各 queryGroupId の全世代クエリIDを収集（非アクティブ含む）
  const allGroupIds = Array.from(groupMap.keys())
  const allGenerations = await prisma.newsQuery.findMany({
    where: { queryGroupId: { in: allGroupIds } },
    select: { id: true, queryGroupId: true },
  })

  const groupToAllQueryIds = new Map<string, string[]>()
  for (const g of allGenerations) {
    if (!groupToAllQueryIds.has(g.queryGroupId)) {
      groupToAllQueryIds.set(g.queryGroupId, [])
    }
    groupToAllQueryIds.get(g.queryGroupId)!.push(g.id)
  }

  // ニュース取得
  const allQueryIds = allGenerations.map((g) => g.id)
  const news = await prisma.businessNews.findMany({
    where: {
      queryId: { in: allQueryIds },
      weekStart,
      deletedAt: null,
    },
    orderBy: { publishedAt: "desc" },
  })

  // queryId → queryGroupId のマップ
  const queryIdToGroupId = new Map<string, string>()
  for (const g of allGenerations) {
    queryIdToGroupId.set(g.id, g.queryGroupId)
  }

  // グループ化
  const grouped = new Map<string, NewsArticleDTO[]>()
  for (const article of news) {
    const groupId = queryIdToGroupId.get(article.queryId)
    if (!groupId) continue
    if (!grouped.has(groupId)) grouped.set(groupId, [])
    grouped.get(groupId)!.push(toArticleDTO(article))
  }

  // activeQueries の順序で返す（groupMap の挿入順）
  const result: NewsViewGroup[] = []
  for (const [groupId, info] of groupMap) {
    result.push({
      queryGroupId: groupId,
      queryName: info.name,
      articles: grouped.get(groupId) ?? [],
    })
  }

  return result
}

// ─── DTO変換 ──────────────────────────────────────────────────────

function toQueryDTO(row: {
  id: string
  queryGroupId: string
  name: string
  keywords: string | null
  language: string | null
  sources: string | null
  domains: string | null
  categoryMode: string | null
  categories: string | null
  createdAt: Date
}): NewsQueryDTO {
  return {
    id: row.id,
    queryGroupId: row.queryGroupId,
    name: row.name,
    keywords: row.keywords,
    language: row.language,
    sources: row.sources,
    domains: row.domains,
    categoryMode: (row.categoryMode as "include" | "exclude") ?? null,
    categories: row.categories,
    createdAt: row.createdAt,
  }
}

function toArticleDTO(row: {
  id: string
  queryId: string
  externalId: string | null
  title: string
  summary: string | null
  sourceName: string | null
  sourceUrl: string | null
  impact: string | null
  publishedAt: Date
  fetchedAt: Date
}): NewsArticleDTO {
  return {
    id: row.id,
    queryId: row.queryId,
    externalId: row.externalId,
    title: row.title,
    summary: row.summary,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    impact: row.impact,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
  }
}
