export type ReportDecision = {
  title: string
  body: string
  source: string
}

export type ReportAction = {
  priority: number
  body: string
  timing: string
}

export type ReportSourceSnapshot = {
  id: string
  label: string
  pageLabel: string
  group: "finance" | "inventory" | "data" | "advice"
  insight: string
  decision: string
}

export type GroupPeriodRanges = {
  finance?: { from: string; to: string }
  inventory?: { from: string; to: string }
  data?: { from: string; to: string }
  advice?: { from: string; to: string }
}

export type ManagementReportStatus = "generating" | "done" | "error"

export type ManagementReportDTO = {
  id: string
  lensId: string
  sourceIds: string[]
  customInstruction: string | null
  periodRanges: GroupPeriodRanges | null
  executiveSummary: string | null
  decisions: ReportDecision[] | null
  actions: ReportAction[] | null
  riskNotes: string[] | null
  status: ManagementReportStatus
  aiModel: string | null
  generatedAt: string | null
  createdAt: string
}
