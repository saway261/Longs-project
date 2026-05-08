import { getWeekStart } from "@/src/lib/news-week"
import { getNewsViewAction, listActiveQueriesAction } from "@/src/actions/news-actions"
import { AdviceNewsShell } from "@/components/feature/advice/advice-news-shell"

export default async function AIAdviceNewsPage() {
  const weekStart = getWeekStart(new Date())
  const weekStartIso = weekStart.toISOString()

  const [newsRes, queriesRes] = await Promise.all([
    getNewsViewAction(weekStartIso),
    listActiveQueriesAction(),
  ])

  const initialData = newsRes.success ? newsRes.data : []
  const initialQueries = queriesRes.success ? queriesRes.data : []

  return (
    <AdviceNewsShell
      initialData={initialData}
      initialWeekStart={weekStart}
      initialQueries={initialQueries}
    />
  )
}
