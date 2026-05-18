import { prisma } from "@/src/lib/prisma"
import { generateCsv } from "@/src/lib/csv-parser"
import { exportDatasetCsvByPeriod } from "@/src/services/data-service"
import { getFinanceOverviewStats, getGanttEntries } from "@/src/services/finance-service"
import { getInventoryCatalog } from "@/src/services/inventory-service"
import {
  getSalesCompositionData,
  getYearlyComparisonData,
  getStockTurnoverData,
  getTurnoverRankingData,
  getCategoryAgingData,
  getInventoryAlertData,
} from "@/src/services/insights-service"
import { getCustomerMatrixData, getProductMatrixData } from "@/src/services/matrix-service"
import type { GroupPeriodRanges } from "@/src/types/report"

export type ReportSection = {
  label: string
  type: "file" | "text"
  content: string
  mimeType?: "text/csv" | "application/json"
}

function ymToDateRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}-01`)
  const [toYear, toMonth] = to.split("-").map(Number)
  return { fromDate, toDate: new Date(toYear, toMonth, 1) }
}

function defaultYmPeriod(): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().slice(0, 7)
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 7)
  return { from, to }
}

function defaultAdvicePeriod(): { from: string; to: string } {
  const now = new Date()
  const dow = now.getDay()
  const recentMonday = new Date(now)
  recentMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const fourWeeksAgo = new Date(recentMonday)
  fourWeeksAgo.setDate(recentMonday.getDate() - 28)
  return {
    from: fourWeeksAgo.toISOString().slice(0, 10),
    to: recentMonday.toISOString().slice(0, 10),
  }
}

export async function fetchSourceSections(
  sourceId: string,
  periodRanges: GroupPeriodRanges,
): Promise<ReportSection[]> {
  switch (sourceId) {
    case "finance-overview": {
      const [stats, gantt] = await Promise.all([getFinanceOverviewStats(), getGanttEntries()])
      return [
        {
          label: "ファイナンスサマリー（残高・可処分予算・資産配分・入出金ガント）",
          type: "file",
          content: JSON.stringify({ stats, gantt }, null, 2),
          mimeType: "application/json",
        },
      ]
    }

    case "finance-cashflow": {
      const period = periodRanges.finance ?? defaultYmPeriod()
      const [recurringEntries, payablesCsv, receivablesCsv] = await Promise.all([
        prisma.recurringEntry.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
        exportDatasetCsvByPeriod({ dataset: "payables", fromYm: period.from, toYm: period.to }),
        exportDatasetCsvByPeriod({ dataset: "receivables", fromYm: period.from, toYm: period.to }),
      ])
      const recurringHeaders = ["説明", "金額(円)", "入出金", "カテゴリ", "支払日"]
      const recurringRows = recurringEntries.map((e) => [
        e.description ?? "",
        String(e.amountYen),
        e.flow === "income" ? "入金" : "出金",
        e.category,
        String(e.dueDay),
      ])
      return [
        {
          label: "定期入出金マスタ",
          type: "file",
          content: generateCsv(recurringHeaders, recurringRows),
          mimeType: "text/csv",
        },
        {
          label: `買掛データ（${period.from}〜${period.to}）`,
          type: "file",
          content: payablesCsv,
          mimeType: "text/csv",
        },
        {
          label: `売掛データ（${period.from}〜${period.to}）`,
          type: "file",
          content: receivablesCsv,
          mimeType: "text/csv",
        },
      ]
    }

    case "inventory-recommendations": {
      const { variants } = await getInventoryCatalog()
      const headers = ["JAN", "商品名", "商品コード", "カラー", "サイズ", "カテゴリ", "推定在庫", "価格(円)", "スナップショット期間"]
      const rows = variants.map((v) => [
        v.janCode ?? "",
        v.productName,
        v.productCode ?? "",
        v.color ?? "",
        v.size ?? "",
        v.categoryName ?? "",
        String(v.estimatedStock),
        v.priceYen !== null ? String(v.priceYen) : "",
        v.snapshotPeriod ?? "",
      ])
      return [
        {
          label: "仕入れ提案・在庫カタログ",
          type: "file",
          content: generateCsv(headers, rows),
          mimeType: "text/csv",
        },
      ]
    }

    case "inventory-insights": {
      const [composition, yearly, turnover, ranking, aging] = await Promise.all([
        getSalesCompositionData("category"),
        getYearlyComparisonData(),
        getStockTurnoverData(),
        getTurnoverRankingData(),
        getCategoryAgingData(),
      ])
      return [
        {
          label: "在庫データ分析（カテゴリ構成・年次比較・回転率・ランキング・エイジング）",
          type: "file",
          content: JSON.stringify({ salesComposition: composition, yearlyComparison: yearly, stockTurnover: turnover, turnoverRanking: ranking, categoryAging: aging }, null, 2),
          mimeType: "application/json",
        },
      ]
    }

    case "inventory-alerts": {
      const alerts = await getInventoryAlertData()
      return [
        {
          label: "在庫アラート（不足・過剰・廃品リスク）",
          type: "file",
          content: JSON.stringify(alerts, null, 2),
          mimeType: "application/json",
        },
      ]
    }

    case "inventory-plan": {
      const period = periodRanges.inventory ?? defaultYmPeriod()
      const { fromDate, toDate } = ymToDateRange(period.from, period.to)
      const planMonths = await prisma.inventoryPlanMonth.findMany({
        where: { monthDate: { gte: fromDate, lt: toDate } },
        orderBy: { monthDate: "asc" },
      })
      if (planMonths.length === 0) return []
      const lines = planMonths.map((m) => {
        const month = m.monthDate.toISOString().slice(0, 7)
        return `${month}: 仕入予算=${m.purchaseBudgetYen ?? "-"}円, 出荷金額=${m.shipmentAmountYen ?? "-"}円, 粗利率=${m.shipmentGrossProfitRate ?? "-"}%, 月末在庫=${m.monthEndInventoryYen ?? "-"}円`
      })
      return [
        {
          label: `在庫計画（${period.from}〜${period.to}）`,
          type: "text",
          content: lines.join("\n"),
        },
      ]
    }

    case "inventory-customer-matrix": {
      const period = periodRanges.inventory ?? defaultYmPeriod()
      const rows = await getCustomerMatrixData({ periodFrom: period.from, periodTo: period.to })
      const headers = ["得意先名", "純売上合計(円)", "粗利率(%)", "粗利額(円)", "担当者"]
      const csvRows = rows.map((r) => [
        r.name,
        String(r.sales),
        r.grossMargin.toFixed(1),
        String(r.grossProfit),
        r.manager,
      ])
      return [
        {
          label: `得意先4象限データ（${period.from}〜${period.to}）`,
          type: "file",
          content: generateCsv(headers, csvRows),
          mimeType: "text/csv",
        },
      ]
    }

    case "inventory-product-matrix": {
      const period = periodRanges.inventory ?? defaultYmPeriod()
      const rows = await getProductMatrixData({ periodFrom: period.from, periodTo: period.to })
      const headers = ["商品名", "純売上合計(円)", "粗利率(%)", "粗利額(円)", "カテゴリ", "ブランド"]
      const csvRows = rows.map((r) => [
        r.name,
        String(r.sales),
        r.grossMargin.toFixed(1),
        String(r.grossProfit),
        r.category,
        r.brand,
      ])
      return [
        {
          label: `商品4象限データ（${period.from}〜${period.to}）`,
          type: "file",
          content: generateCsv(headers, csvRows),
          mimeType: "text/csv",
        },
      ]
    }

    case "data-hub": {
      const period = periodRanges.data ?? defaultYmPeriod()
      const [salesCsv, payablesCsv, receivablesCsv, grossProfitCsv] = await Promise.all([
        exportDatasetCsvByPeriod({ dataset: "sales", fromYm: period.from, toYm: period.to }),
        exportDatasetCsvByPeriod({ dataset: "payables", fromYm: period.from, toYm: period.to }),
        exportDatasetCsvByPeriod({ dataset: "receivables", fromYm: period.from, toYm: period.to }),
        exportDatasetCsvByPeriod({ dataset: "gross-profit", fromYm: period.from, toYm: period.to }),
      ])
      return [
        { label: `売上データ（${period.from}〜${period.to}）`, type: "file", content: salesCsv, mimeType: "text/csv" },
        { label: `買掛データ（${period.from}〜${period.to}）`, type: "file", content: payablesCsv, mimeType: "text/csv" },
        { label: `売掛データ（${period.from}〜${period.to}）`, type: "file", content: receivablesCsv, mimeType: "text/csv" },
        { label: `粗利データ（年度別）`, type: "file", content: grossProfitCsv, mimeType: "text/csv" },
      ]
    }

    case "data-registration": {
      const period = periodRanges.data ?? defaultYmPeriod()
      const { fromDate, toDate } = ymToDateRange(period.from, period.to)
      const imports = await prisma.dataImport.findMany({
        where: { deletedAt: null, importedAt: { gte: fromDate, lt: toDate } },
        orderBy: { importedAt: "desc" },
      })
      if (imports.length === 0) return []
      const lines = imports.map((imp) => {
        const dataset = imp.dataset.replace("_", "-")
        const date = imp.importedAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
        return `${date} - ${dataset}: ${imp.fileName ?? "不明"} (${imp.status}, ${imp.rowsSuccess ?? 0}件成功)`
      })
      return [
        {
          label: `データ登録履歴（${period.from}〜${period.to}）`,
          type: "text",
          content: lines.join("\n"),
        },
      ]
    }

    case "advice-weekly-news": {
      const period = periodRanges.advice ?? defaultAdvicePeriod()
      const fromDate = new Date(period.from)
      const toDate = new Date(period.to)
      const [summaries, categoryAdvices, factorAnalyses] = await Promise.all([
        prisma.weeklyNewsSummary.findMany({
          where: { weekStart: { gte: fromDate, lte: toDate } },
          orderBy: { weekStart: "asc" },
        }),
        prisma.weeklyCategoryAdvice.findMany({
          where: { weekStart: { gte: fromDate, lte: toDate } },
          orderBy: [{ weekStart: "asc" }, { categoryName: "asc" }],
        }),
        prisma.weeklyFactorAnalysis.findMany({
          where: { weekStart: { gte: fromDate, lte: toDate } },
          orderBy: [{ weekStart: "asc" }, { factorType: "asc" }],
        }),
      ])
      if (summaries.length === 0 && categoryAdvices.length === 0 && factorAnalyses.length === 0) return []
      const parts: string[] = []
      for (const s of summaries) {
        parts.push(`【週次ニュース要約 ${s.weekStart.toISOString().slice(0, 10)}】${s.queryName}\n${s.content}`)
      }
      for (const c of categoryAdvices) {
        parts.push(`【カテゴリ動向 ${c.weekStart.toISOString().slice(0, 10)}】${c.categoryName}（${c.trend}）\n${c.content}`)
      }
      for (const f of factorAnalyses) {
        parts.push(`【影響要因分析 ${f.weekStart.toISOString().slice(0, 10)}】${f.factorType}（${f.impact}）\n${f.content}`)
      }
      return [
        {
          label: `週次ニュース・動向分析（${period.from}〜${period.to}）`,
          type: "text",
          content: parts.join("\n\n"),
        },
      ]
    }

    case "advice-actions": {
      const period = periodRanges.advice ?? defaultAdvicePeriod()
      const fromDate = new Date(period.from)
      const toDate = new Date(period.to)
      const actions = await prisma.actionRecommendation.findMany({
        where: { weekStart: { gte: fromDate, lte: toDate } },
        orderBy: [{ weekStart: "desc" }, { sortScore: "desc" }],
      })
      if (actions.length === 0) return []
      const headers = ["週", "種別", "タイトル", "説明", "優先度", "ステータス"]
      const rows = actions.map((a) => [
        a.weekStart.toISOString().slice(0, 10),
        a.actionType,
        a.title,
        a.description,
        a.priority,
        a.status,
      ])
      return [
        {
          label: `アクション候補（${period.from}〜${period.to}）`,
          type: "file",
          content: generateCsv(headers, rows),
          mimeType: "text/csv",
        },
      ]
    }

    default:
      return []
  }
}
