"use server"

import { requireRole } from "@/src/lib/permissions"
import * as svc from "@/src/services/advice-service"
import type { FactorQueryConfigDTO, WeeklyFactorAnalysisDTO, WeeklyNewsSummaryDTO, FactorType, WeekCategorySelectionDTO, WeeklyCategoryAdviceDTO, ActionRecommendationDTO } from "@/src/services/advice-service"
import { prisma } from "@/src/lib/prisma"
import { fetchSourceSections } from "@/src/services/report-service"
import { generateManagementReport } from "@/src/lib/gemini"
import type { GroupPeriodRanges, ManagementReportDTO, ReportDecision, ReportAction } from "@/src/types/report"

type ReportLensValue = "balanced" | "cashflow" | "inventory" | "sales"

export type { FactorQueryConfigDTO, WeeklyFactorAnalysisDTO, WeeklyNewsSummaryDTO, FactorType, WeekCategorySelectionDTO, WeeklyCategoryAdviceDTO, ActionRecommendationDTO }
export type { ManagementReportDTO }

// ─── FactorQueryConfig ────────────────────────────────────────

export async function getFactorConfigsAction(): Promise<
  { success: true; data: FactorQueryConfigDTO[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getFactorConfigs()
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getFactorConfigsAction]", e)
    return { success: false, error: "設定の取得に失敗しました" }
  }
}

export async function addFactorConfigAction(
  factorType: FactorType,
  queryGroupId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.addFactorConfig(factorType, queryGroupId)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[addFactorConfigAction]", e)
    return { success: false, error: "設定の保存に失敗しました" }
  }
}

export async function removeFactorConfigAction(
  factorType: FactorType,
  queryGroupId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.removeFactorConfig(factorType, queryGroupId)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[removeFactorConfigAction]", e)
    return { success: false, error: "設定の削除に失敗しました" }
  }
}

// ─── WeeklyFactorAnalysis ─────────────────────────────────────

export async function getWeeklyFactorAnalysesAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeeklyFactorAnalysisDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getWeeklyFactorAnalyses(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getWeeklyFactorAnalysesAction]", e)
    return { success: false, error: "分析結果の取得に失敗しました" }
  }
}

// ─── WeeklyNewsSummary ────────────────────────────────────────

export async function getWeeklyNewsSummariesAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeeklyNewsSummaryDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getWeeklyNewsSummaries(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getWeeklyNewsSummariesAction]", e)
    return { success: false, error: "要約の取得に失敗しました" }
  }
}

export async function generateWeeklyNewsSummariesAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeeklyNewsSummaryDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.generateWeeklyNewsSummaries(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error) {
      return { success: false, error: e.message }
    }
    console.error("[generateWeeklyNewsSummariesAction]", e)
    return { success: false, error: "要約の生成に失敗しました" }
  }
}

export async function runWeeklyFactorAnalysisAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeeklyFactorAnalysisDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.runWeeklyFactorAnalysis(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error) {
      return { success: false, error: e.message }
    }
    console.error("[runWeeklyFactorAnalysisAction]", e)
    return { success: false, error: "分析の実行に失敗しました" }
  }
}

// ─── WeekCategorySelection ────────────────────────────────────

export async function getCategorySelectionsAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeekCategorySelectionDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getCategorySelections(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getCategorySelectionsAction]", e)
    return { success: false, error: "カテゴリ選択の取得に失敗しました" }
  }
}

export async function addCategorySelectionAction(
  weekStartIso: string,
  categoryId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.addCategorySelection(new Date(weekStartIso), categoryId)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[addCategorySelectionAction]", e)
    return { success: false, error: "カテゴリの追加に失敗しました" }
  }
}

export async function removeCategorySelectionAction(
  weekStartIso: string,
  categoryId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    await svc.removeCategorySelection(new Date(weekStartIso), categoryId)
    return { success: true }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[removeCategorySelectionAction]", e)
    return { success: false, error: "カテゴリの削除に失敗しました" }
  }
}

// ─── WeeklyCategoryAdvice ─────────────────────────────────────

export async function getWeeklyCategoryAdvicesAction(
  weekStartIso: string,
): Promise<{ success: true; data: WeeklyCategoryAdviceDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getWeeklyCategoryAdvices(new Date(weekStartIso))
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getWeeklyCategoryAdvicesAction]", e)
    return { success: false, error: "アドバイスの取得に失敗しました" }
  }
}

export async function generateWeeklyCategoryAdviceAction(
  weekStartIso: string,
  categoryId: string,
): Promise<{ success: true; data: WeeklyCategoryAdviceDTO } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.generateWeeklyCategoryAdvice(new Date(weekStartIso), categoryId)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error) {
      return { success: false, error: e.message }
    }
    console.error("[generateWeeklyCategoryAdviceAction]", e)
    return { success: false, error: "アドバイスの生成に失敗しました" }
  }
}

// ─── ActionRecommendation ─────────────────────────────────────

export async function generateInventoryActionsAction(
  weekStartIso: string,
  queryGroupIds: string[],
  periodFromIso: string,
  periodToIso: string,
): Promise<{ success: true; data: ActionRecommendationDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.generateInventoryActions(
      new Date(weekStartIso),
      queryGroupIds,
      new Date(periodFromIso),
      new Date(periodToIso),
    )
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error) return { success: false, error: e.message }
    console.error("[generateInventoryActionsAction]", e)
    return { success: false, error: "アクション候補の生成に失敗しました" }
  }
}

export async function getActionRecommendationsAction(
  weekStartIso?: string,
): Promise<{ success: true; data: ActionRecommendationDTO[] } | { success: false; error: string }> {
  try {
    await requireRole(["admin", "manager"])
    const data = await svc.getActionRecommendations(weekStartIso ? new Date(weekStartIso) : undefined)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getActionRecommendationsAction]", e)
    return { success: false, error: "アクション候補の取得に失敗しました" }
  }
}

export async function updateActionStatusAction(
  id: string,
  status: "accepted" | "dismissed",
): Promise<{ success: true; data: ActionRecommendationDTO } | { success: false; error: string }> {
  try {
    const session = await requireRole(["admin", "manager"])
    const data = await svc.updateActionStatus(id, status, session.userId)
    return { success: true, data }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[updateActionStatusAction]", e)
    return { success: false, error: "ステータスの更新に失敗しました" }
  }
}

// ─── ManagementReport ─────────────────────────────────────────

const LENS_MAP = {
  balanced: { id: "balanced", label: "経営会議向け", description: "売上・粗利・資金・在庫を横断してバランス良く要約" },
  cashflow: { id: "cashflow", label: "資金繰り重視", description: "キャッシュアウト時期と利益確保を優先して判断" },
  inventory: { id: "inventory", label: "在庫最適化重視", description: "回転率・過不足・SKU整理を中心に判断" },
  sales: { id: "sales", label: "営業改善重視", description: "得意先・商品構成・単価改善を中心に判断" },
} as const

function toManagementReportDTO(r: {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lensId: any
  sourceIds: string[]
  customInstruction: string | null
  periodRanges: unknown
  executiveSummary: string | null
  decisions: unknown
  actions: unknown
  riskNotes: unknown
  status: string
  aiModel: string | null
  generatedAt: Date | null
  createdAt: Date
}): ManagementReportDTO {
  return {
    id: r.id,
    lensId: r.lensId,
    sourceIds: r.sourceIds,
    customInstruction: r.customInstruction,
    periodRanges: (r.periodRanges as GroupPeriodRanges) ?? null,
    executiveSummary: r.executiveSummary,
    decisions: Array.isArray(r.decisions) ? (r.decisions as ReportDecision[]) : null,
    actions: Array.isArray(r.actions) ? (r.actions as ReportAction[]) : null,
    riskNotes: Array.isArray(r.riskNotes) ? (r.riskNotes as string[]) : null,
    status: r.status as ManagementReportDTO["status"],
    aiModel: r.aiModel,
    generatedAt: r.generatedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function generateManagementReportAction(params: {
  lensId: string
  sourceIds: string[]
  customInstruction: string
  periodRanges: GroupPeriodRanges
}): Promise<{ success: true; data: ManagementReportDTO } | { success: false; error: string }> {
  try {
    const session = await requireRole(["admin", "manager"])

    const record = await prisma.managementReport.create({
      data: {
        lensId: params.lensId as ReportLensValue,
        sourceIds: params.sourceIds,
        customInstruction: params.customInstruction || null,
        periodRanges: params.periodRanges as Record<string, unknown>,
        status: "generating",
        createdBy: session.userId,
      },
    })

    try {
      const allSections = []
      for (const sourceId of params.sourceIds) {
        const sections = await fetchSourceSections(sourceId, params.periodRanges)
        allSections.push(...sections)
      }

      const lens = LENS_MAP[params.lensId as keyof typeof LENS_MAP] ?? LENS_MAP.balanced

      const result = await generateManagementReport({
        lens,
        customInstruction: params.customInstruction,
        sections: allSections,
      })

      const updated = await prisma.managementReport.update({
        where: { id: record.id },
        data: {
          executiveSummary: result.executiveSummary,
          decisions: result.decisions,
          actions: result.actions,
          riskNotes: result.riskNotes,
          status: "done",
          aiModel: "gemini-2.5-flash",
          promptTokens: result.promptTokens,
          totalTokens: result.totalTokens,
          generatedAt: new Date(),
        },
      })

      return { success: true, data: toManagementReportDTO(updated) }
    } catch (e) {
      await prisma.managementReport.update({
        where: { id: record.id },
        data: { status: "error" },
      })
      throw e
    }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    if (e instanceof Error) return { success: false, error: e.message }
    console.error("[generateManagementReportAction]", e)
    return { success: false, error: "レポートの生成に失敗しました" }
  }
}

export async function getManagementReportsAction(): Promise<
  { success: true; data: ManagementReportDTO[] } | { success: false; error: string }
> {
  try {
    await requireRole(["admin", "manager"])
    const records = await prisma.managementReport.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return { success: true, data: records.map(toManagementReportDTO) }
  } catch (e) {
    if (e instanceof Error && (e.message === "認証が必要です" || e.message === "権限がありません")) {
      return { success: false, error: e.message }
    }
    console.error("[getManagementReportsAction]", e)
    return { success: false, error: "レポート一覧の取得に失敗しました" }
  }
}
