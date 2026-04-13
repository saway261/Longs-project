import { prisma } from "@/src/lib/prisma"

export type InventoryPlanMonthDTO = {
  month: string
  monthDate: string // "YYYY-MM-DD"
  purchaseBudget: number
  purchaseBudgetLastYear: number
  purchaseBudgetPrediction: number
  shipmentAmount: number
  shipmentAmountLastYear: number
  shipmentAmountPrediction: number
  shipmentGrossProfitRate: number
  shipmentGrossProfitRateLastYear: number
  shipmentGrossProfitRatePrediction: number
  shipmentCost: number
  shipmentCostLastYear: number
  shipmentCostPrediction: number
  waste: number
  wasteLastYear: number
  wastePrediction: number
  monthEndInventory: number
  monthEndInventoryLastYear: number
  monthEndInventoryPrediction: number
  inventoryPlan: number
  planDiff: number // derived: monthEndInventory - inventoryPlan
  lastYearInventory: number
}

export type PlanMonthInput = {
  monthDate: string // "YYYY-MM-DD"
  purchaseBudget: number
  shipmentAmount: number
  shipmentGrossProfitRate: number
  shipmentCost: number
  waste: number
  monthEndInventory: number
  inventoryPlan: number
}

const MONTH_NAMES = ["4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "1月", "2月", "3月"]

function fiscalMonthDate(fiscalYear: number, idx: number): string {
  const calYear = idx <= 8 ? fiscalYear : fiscalYear + 1
  const calMonth = ((idx + 3) % 12) + 1
  return `${calYear}-${String(calMonth).padStart(2, "0")}-01`
}

function toBigIntNum(v: bigint | null | undefined): number {
  return v != null ? Number(v) : 0
}

function toDecimalNum(v: any): number {
  return v != null ? Number(v) : 0
}

export async function getAvailableFiscalYears(): Promise<number[]> {
  const rows = await prisma.inventoryPlanYear.findMany({
    orderBy: { fiscalYear: "desc" },
    select: { fiscalYear: true },
  })
  const fromDb = rows.map((r) => r.fiscalYear)

  // 現在の会計年度と翌年度を常に含める（4月始まり）
  const now = new Date()
  const calYear = now.getFullYear()
  const calMonth = now.getMonth() + 1
  const currentFY = calMonth >= 4 ? calYear : calYear - 1
  const nextFY = currentFY + 1

  const set = new Set(fromDb)
  set.add(currentFY)
  set.add(nextFY)

  return Array.from(set).sort((a, b) => b - a)
}

export async function getInventoryPlan(fiscalYear: number): Promise<InventoryPlanMonthDTO[]> {
  const [currentYear, lastYear] = await Promise.all([
    prisma.inventoryPlanYear.findUnique({
      where: { fiscalYear },
      include: { months: { orderBy: { monthDate: "asc" } } },
    }),
    prisma.inventoryPlanYear.findUnique({
      where: { fiscalYear: fiscalYear - 1 },
      include: { months: { orderBy: { monthDate: "asc" } } },
    }),
  ])

  const currentMonths = currentYear?.months ?? []
  const lastYearMonths = lastYear?.months ?? []

  const currentMap = new Map<string, (typeof currentMonths)[0]>()
  for (const m of currentMonths) {
    currentMap.set(m.monthDate.toISOString().slice(0, 10), m)
  }

  const lastYearMap = new Map<string, (typeof lastYearMonths)[0]>()
  for (const m of lastYearMonths) {
    lastYearMap.set(m.monthDate.toISOString().slice(0, 10), m)
  }

  return MONTH_NAMES.map((monthName, idx) => {
    const monthDate = fiscalMonthDate(fiscalYear, idx)
    const lastMonthDate = fiscalMonthDate(fiscalYear - 1, idx)

    const cur = currentMap.get(monthDate)
    const ly = lastYearMap.get(lastMonthDate)

    const purchaseBudget = toBigIntNum(cur?.purchaseBudgetYen)
    const purchaseBudgetLastYear = toBigIntNum(ly?.purchaseBudgetYen)
    const shipmentAmount = toBigIntNum(cur?.shipmentAmountYen)
    const shipmentAmountLastYear = toBigIntNum(ly?.shipmentAmountYen)
    const shipmentGrossProfitRate = toDecimalNum(cur?.shipmentGrossProfitRate)
    const shipmentGrossProfitRateLastYear = toDecimalNum(ly?.shipmentGrossProfitRate)
    const shipmentCost = toBigIntNum(cur?.shipmentCostYen)
    const shipmentCostLastYear = toBigIntNum(ly?.shipmentCostYen)
    const waste = toBigIntNum(cur?.wasteYen)
    const wasteLastYear = toBigIntNum(ly?.wasteYen)
    const monthEndInventory = toBigIntNum(cur?.monthEndInventoryYen)
    const monthEndInventoryLastYear = toBigIntNum(ly?.monthEndInventoryYen)
    const inventoryPlan = toBigIntNum(cur?.inventoryPlanYen)

    return {
      month: monthName,
      monthDate,
      purchaseBudget,
      purchaseBudgetLastYear,
      purchaseBudgetPrediction: purchaseBudgetLastYear,
      shipmentAmount,
      shipmentAmountLastYear,
      shipmentAmountPrediction: shipmentAmountLastYear,
      shipmentGrossProfitRate,
      shipmentGrossProfitRateLastYear,
      shipmentGrossProfitRatePrediction: shipmentGrossProfitRateLastYear,
      shipmentCost,
      shipmentCostLastYear,
      shipmentCostPrediction: shipmentCostLastYear,
      waste,
      wasteLastYear,
      wastePrediction: wasteLastYear,
      monthEndInventory,
      monthEndInventoryLastYear,
      monthEndInventoryPrediction: monthEndInventoryLastYear,
      inventoryPlan,
      planDiff: monthEndInventory - inventoryPlan,
      lastYearInventory: monthEndInventoryLastYear,
    }
  })
}

export async function saveInventoryPlan(fiscalYear: number, months: PlanMonthInput[]): Promise<void> {
  const year = await prisma.inventoryPlanYear.upsert({
    where: { fiscalYear },
    update: {},
    create: { fiscalYear },
  })

  for (const m of months) {
    await prisma.inventoryPlanMonth.upsert({
      where: {
        planYearId_monthDate: {
          planYearId: year.id,
          monthDate: new Date(m.monthDate),
        },
      },
      update: {
        purchaseBudgetYen: BigInt(m.purchaseBudget),
        shipmentAmountYen: BigInt(m.shipmentAmount),
        shipmentGrossProfitRate: m.shipmentGrossProfitRate,
        shipmentCostYen: BigInt(m.shipmentCost),
        wasteYen: BigInt(m.waste),
        monthEndInventoryYen: BigInt(m.monthEndInventory),
        inventoryPlanYen: BigInt(m.inventoryPlan),
      },
      create: {
        planYearId: year.id,
        monthDate: new Date(m.monthDate),
        purchaseBudgetYen: BigInt(m.purchaseBudget),
        shipmentAmountYen: BigInt(m.shipmentAmount),
        shipmentGrossProfitRate: m.shipmentGrossProfitRate,
        shipmentCostYen: BigInt(m.shipmentCost),
        wasteYen: BigInt(m.waste),
        monthEndInventoryYen: BigInt(m.monthEndInventory),
        inventoryPlanYen: BigInt(m.inventoryPlan),
      },
    })
  }
}
