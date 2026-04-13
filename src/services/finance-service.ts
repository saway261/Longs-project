import { prisma } from "@/src/lib/prisma"

export type ReservePolicyRow = {
  id: string
  name: string
  description: string
  percent: number
  sortOrder: number
}

export async function getReservePolicies(): Promise<ReservePolicyRow[]> {
  const rows = await prisma.reservePolicy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    percent: Number(r.percent),
    sortOrder: r.sortOrder,
  }))
}

export async function updateReservePolicy(id: string, percent: number): Promise<void> {
  await prisma.reservePolicy.update({ where: { id }, data: { percent } })
}

export type FinanceOverviewStats = {
  totalAssetsYen: number
  salesTotalYen: number
  payablesTotalYen: number
  receivablesTotalYen: number
  fiscalYear: number
}

/** 今日が属する会計年度（4月始まり）の開始・終了日と年度を返す */
function currentFiscalYearRange(): { fiscalYear: number; start: Date; end: Date } {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const fiscalYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1
  return {
    fiscalYear,
    start: new Date(fiscalYear, 3, 1),      // 4月1日
    end: new Date(fiscalYear + 1, 3, 1),    // 翌4月1日（exclusive）
  }
}

export async function updateTotalAssetsYen(yen: number): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: "total_assets_yen" },
    update: { value: String(yen) },
    create: { key: "total_assets_yen", value: String(yen) },
  })
}

export async function getFinanceOverviewStats(): Promise<FinanceOverviewStats> {
  const { fiscalYear, start, end } = currentFiscalYearRange()
  const periodFilter = { gte: start, lt: end }
  const [setting, salesAgg, payablesAgg, receivablesAgg] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "total_assets_yen" } }),
    prisma.salesFact.aggregate({ _sum: { netSalesYen: true }, where: { deletedAt: null, periodYm: periodFilter } }),
    prisma.payablesFact.aggregate({ _sum: { paymentYen: true }, where: { deletedAt: null, periodYm: periodFilter } }),
    prisma.receivablesFact.aggregate({ _sum: { receivedYen: true }, where: { deletedAt: null, periodYm: periodFilter } }),
  ])
  return {
    totalAssetsYen: setting ? Number(setting.value) : 15_000_000,
    salesTotalYen: Number(salesAgg._sum.netSalesYen ?? 0),
    payablesTotalYen: Number(payablesAgg._sum.paymentYen ?? 0),
    receivablesTotalYen: Number(receivablesAgg._sum.receivedYen ?? 0),
    fiscalYear,
  }
}

export type GanttEntryRow = {
  id: string
  partner: string
  description: string
  amountYen: bigint
  flow: "income" | "expense"
  category: string
  cycle: string | null
  offsetMonths: number
  dueDay: number
  tags: string[]
  seasonality: number[]
  isFixed: boolean
  invoiceDate: Date | null
}

function formatCycle(offsetMonths: number, day: number): string {
  if (offsetMonths === 0) return `当月${day}日払い`
  if (offsetMonths === 1) return `翌月${day}日払い`
  if (offsetMonths === 2) return `翌々月${day}日払い`
  return `${offsetMonths}ヶ月後${day}日払い`
}

export async function getGanttEntries(): Promise<GanttEntryRow[]> {
  const [salesGroups, payablesGroups, fixedEntries] = await Promise.all([
    // 入金: SalesFact GROUP BY (businessPartnerId, periodYm)
    prisma.salesFact.groupBy({
      by: ["businessPartnerId", "periodYm"],
      where: { deletedAt: null, businessPartnerId: { not: null }, periodYm: { not: null } },
      _sum: { netSalesYen: true },
    }),
    // 出金: PayablesFact GROUP BY (businessPartnerId, periodYm)
    prisma.payablesFact.groupBy({
      by: ["businessPartnerId", "periodYm"],
      where: { deletedAt: null, businessPartnerId: { not: null }, periodYm: { not: null } },
      _sum: { paymentYen: true },
    }),
    // 固定費: RecurringEntry WHERE category = '固定費'
    prisma.recurringEntry.findMany({
      where: { deletedAt: null, category: "固定費" },
      include: { tagMaps: { include: { tag: { select: { name: true } } } } },
      orderBy: [{ flow: "asc" }, { sortOrder: "asc" }],
    }),
  ])

  const partnerIds = [
    ...new Set([
      ...salesGroups.map((g) => g.businessPartnerId).filter(Boolean),
      ...payablesGroups.map((g) => g.businessPartnerId).filter(Boolean),
    ]),
  ] as string[]

  const partners =
    partnerIds.length > 0
      ? await prisma.businessPartner.findMany({
          where: { id: { in: partnerIds } },
          include: { customer: true, supplier: true },
        })
      : []
  const partnerMap = new Map(partners.map((p) => [p.id, p]))

  const rows: GanttEntryRow[] = []

  // 入金エントリ
  for (const group of salesGroups) {
    if (!group.businessPartnerId || !group.periodYm) continue
    const partner = partnerMap.get(group.businessPartnerId)
    if (!partner?.customer) continue
    const { collectionDay, collectionMonthOffset } = partner.customer
    const amountYen = group._sum.netSalesYen ?? 0n
    if (amountYen === 0n) continue
    rows.push({
      id: `sales-${group.businessPartnerId}-${group.periodYm.toISOString().slice(0, 7)}`,
      partner: partner.name,
      description: "",
      amountYen,
      flow: "income",
      category: "売掛入金",
      cycle: formatCycle(collectionMonthOffset, collectionDay),
      offsetMonths: collectionMonthOffset,
      dueDay: collectionDay,
      tags: [],
      seasonality: [],
      isFixed: false,
      invoiceDate: group.periodYm,
    })
  }

  // 出金エントリ
  for (const group of payablesGroups) {
    if (!group.businessPartnerId || !group.periodYm) continue
    const partner = partnerMap.get(group.businessPartnerId)
    if (!partner?.supplier) continue
    const { paymentDay, paymentMonthOffset } = partner.supplier
    const amountYen = group._sum.paymentYen ?? 0n
    if (amountYen === 0n) continue
    rows.push({
      id: `payables-${group.businessPartnerId}-${group.periodYm.toISOString().slice(0, 7)}`,
      partner: partner.name,
      description: "",
      amountYen,
      flow: "expense",
      category: "仕入支払い",
      cycle: formatCycle(paymentMonthOffset, paymentDay),
      offsetMonths: paymentMonthOffset,
      dueDay: paymentDay,
      tags: [],
      seasonality: [],
      isFixed: false,
      invoiceDate: group.periodYm,
    })
  }

  // 固定費エントリ
  for (const r of fixedEntries) {
    rows.push({
      id: r.id,
      partner: r.description ?? "",
      description: r.description ?? "",
      amountYen: r.amountYen,
      flow: r.flow as "income" | "expense",
      category: r.category,
      cycle: r.cycle,
      offsetMonths: r.offsetMonths,
      dueDay: r.dueDay,
      tags: r.tagMaps.map((m) => m.tag.name),
      seasonality: r.seasonality.map((d) => Number(d)),
      isFixed: true,
      invoiceDate: null,
    })
  }

  return rows
}
