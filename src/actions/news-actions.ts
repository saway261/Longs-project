"use server"

import { requireRole } from "@/src/lib/permissions"
import * as svc from "@/src/services/news-service"
import type { QueryInput, NewsQueryDTO, NewsViewGroup } from "@/src/services/news-service"

export type { QueryInput, NewsQueryDTO, NewsViewGroup }

// ─── ニュース取得 ─────────────────────────────────────────────────

/** 全アクティブクエリのニュースを取得・保存 */
export async function fetchLatestNewsAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    await svc.fetchAndStoreAllActiveQueries()
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[fetchLatestNewsAction]", e)
    return { success: false, error: "ニュースの取得に失敗しました" }
  }
}

/** 指定週のニュース表示データを取得 */
export async function getNewsViewAction(
  weekStartIso: string,
): Promise<{ success: true; data: NewsViewGroup[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getNewsView(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getNewsViewAction]", e)
    return { success: false, error: "ニュースの取得に失敗しました" }
  }
}

// ─── クエリ CRUD ──────────────────────────────────────────────────

/** 検索フィルター一覧取得 */
export async function listActiveQueriesAction(): Promise<
  { success: true; data: NewsQueryDTO[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.listActiveQueries()
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[listActiveQueriesAction]", e)
    return { success: false, error: "フィルター一覧の取得に失敗しました" }
  }
}

/** 検索フィルター作成 */
export async function createNewsQueryAction(
  input: QueryInput,
): Promise<{ success: true; data: NewsQueryDTO } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    if (!input.name.trim()) return { success: false, error: "フィルター名を入力してください" }
    const categoryCount = input.categories ? input.categories.split(",").filter(Boolean).length : 0
    if (categoryCount > 5) return { success: false, error: "カテゴリは最大5つまで指定できます" }
    const data = await svc.createQuery(input)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[createNewsQueryAction]", e)
    return { success: false, error: "フィルターの作成に失敗しました" }
  }
}

/** 検索フィルター更新（世代管理） */
export async function updateNewsQueryAction(
  id: string,
  input: QueryInput,
): Promise<{ success: true; data: NewsQueryDTO } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    if (!input.name.trim()) return { success: false, error: "フィルター名を入力してください" }
    const categoryCount = input.categories ? input.categories.split(",").filter(Boolean).length : 0
    if (categoryCount > 5) return { success: false, error: "カテゴリは最大5つまで指定できます" }
    const data = await svc.updateQuery(id, input)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[updateNewsQueryAction]", e)
    return { success: false, error: "フィルターの更新に失敗しました" }
  }
}

/** ニュース記事削除（ソフト削除） */
export async function deleteNewsArticleAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.deleteArticle(id)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[deleteNewsArticleAction]", e)
    return { success: false, error: "記事の削除に失敗しました" }
  }
}

/** 検索フィルター削除（ソフト削除） */
export async function deleteNewsQueryAction(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.deleteQuery(id)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[deleteNewsQueryAction]", e)
    return { success: false, error: "フィルターの削除に失敗しました" }
  }
}
