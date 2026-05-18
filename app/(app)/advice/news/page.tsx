import { getWeekStart } from "@/src/lib/news-week"
import { getNewsViewAction, listActiveQueriesAction, getDefaultExcludedSourcesAction } from "@/src/actions/news-actions"
import { getFactorConfigsAction, getWeeklyFactorAnalysesAction, getWeeklyNewsSummariesAction, getCategorySelectionsAction, getWeeklyCategoryAdvicesAction, getActionRecommendationsAction } from "@/src/actions/advice-actions"
import { getCategoriesAction } from "@/src/actions/settings-actions"
import { AdviceNewsShell } from "@/components/feature/advice/advice-news-shell"

export default async function AIAdviceNewsPage() {
  const weekStart = getWeekStart(new Date())
  const weekStartIso = weekStart.toISOString()
  const flexibleAnalysis = process.env.FACTOR_ANALYSIS_REQUIRE_WEEK_END === "false"

  const [newsRes, queriesRes, defaultExcludedRes, factorConfigsRes, factorAnalysesRes, querySummariesRes, allCategoriesRes, categorySelectionsRes, categoryAdvicesRes, inventoryActionsRes] = await Promise.all([
    getNewsViewAction(weekStartIso),
    listActiveQueriesAction(),
    getDefaultExcludedSourcesAction(),
    getFactorConfigsAction(),
    getWeeklyFactorAnalysesAction(weekStartIso),
    getWeeklyNewsSummariesAction(weekStartIso),
    getCategoriesAction(),
    getCategorySelectionsAction(weekStartIso),
    getWeeklyCategoryAdvicesAction(weekStartIso),
    getActionRecommendationsAction(weekStartIso),
  ])

  const initialData = newsRes.success ? newsRes.data : []
  const initialQueries = queriesRes.success ? queriesRes.data : []
  const initialDefaultExcludedSources = defaultExcludedRes.success ? defaultExcludedRes.data : null
  const initialFactorConfigs = factorConfigsRes.success ? factorConfigsRes.data : []
  const initialFactorAnalyses = factorAnalysesRes.success ? factorAnalysesRes.data : []
  const initialNewsSummaries = querySummariesRes.success ? querySummariesRes.data : []
  const initialAllCategories = allCategoriesRes.success ? allCategoriesRes.data : []
  const initialCategorySelections = categorySelectionsRes.success ? categorySelectionsRes.data : []
  const initialCategoryAdvices = categoryAdvicesRes.success ? categoryAdvicesRes.data : []
  const initialInventoryActions = inventoryActionsRes.success ? inventoryActionsRes.data : []

  return (
    <AdviceNewsShell
      initialData={initialData}
      initialWeekStart={weekStart}
      initialQueries={initialQueries}
      initialDefaultExcludedSources={initialDefaultExcludedSources}
      initialFactorConfigs={initialFactorConfigs}
      initialFactorAnalyses={initialFactorAnalyses}
      initialNewsSummaries={initialNewsSummaries}
      flexibleAnalysis={flexibleAnalysis}
      initialAllCategories={initialAllCategories}
      initialCategorySelections={initialCategorySelections}
      initialCategoryAdvices={initialCategoryAdvices}
      initialInventoryActions={initialInventoryActions}
    />
  )
}
