import { getActionRecommendationsAction } from "@/src/actions/advice-actions"
import { AIAdviceActionCandidates } from "@/components/feature/advice/advice-actions"

export default async function AIAdviceActionCandidatesPage() {
  const res = await getActionRecommendationsAction()
  const initialActions = res.success ? res.data : []

  return <AIAdviceActionCandidates initialActions={initialActions} />
}
