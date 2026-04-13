import { prisma } from "@/src/lib/prisma"

// ── システム設定キー定数 ────────────────────────────────────────────────────
export const SYSTEM_SETTING_KEYS = {
  INVENTORY_TURNOVER_PERIOD_MONTHS: "inventory_turnover_period_months",
} as const

export type RecurringEntryDTO = {
  id: string
  description: string | null
  amountYen: number
  category: string
  dueDay: number
  sortOrder: number
}

export type ReservePolicyDTO = {
  id: string
  name: string
  description: string | null
  percent: number
  sortOrder: number
}

export type CategoryDTO = {
  id: string
  categoryCode: string | null
  name: string
  sellThroughDays: number
}

export async function getCategories(): Promise<CategoryDTO[]> {
  const rows = await prisma.productCategory.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  })
  return rows.map((c) => ({ id: c.id, categoryCode: c.categoryCode, name: c.name, sellThroughDays: c.sellThroughDays }))
}

export async function createCategory(
  name: string,
  sellThroughDays: number,
  categoryCode?: string | null,
): Promise<CategoryDTO> {
  const c = await prisma.productCategory.create({
    data: { name, sellThroughDays, categoryCode: categoryCode ?? null },
  })
  return { id: c.id, categoryCode: c.categoryCode, name: c.name, sellThroughDays: c.sellThroughDays }
}

export async function updateCategory(
  id: string,
  name: string,
  sellThroughDays: number,
  categoryCode?: string | null,
): Promise<CategoryDTO> {
  const c = await prisma.productCategory.update({
    where: { id },
    data: { name, sellThroughDays, categoryCode: categoryCode ?? null },
  })
  return { id: c.id, categoryCode: c.categoryCode, name: c.name, sellThroughDays: c.sellThroughDays }
}

// ── システム設定 ──────────────────────────────────────────────────────────────

export async function getSystemSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

export async function getInventoryTurnoverPeriodMonths(): Promise<number> {
  const val = await getSystemSetting(SYSTEM_SETTING_KEYS.INVENTORY_TURNOVER_PERIOD_MONTHS)
  const parsed = val ? Number(val) : NaN
  return isNaN(parsed) ? 12 : parsed
}

export async function setInventoryTurnoverPeriodMonths(months: number): Promise<void> {
  await setSystemSetting(SYSTEM_SETTING_KEYS.INVENTORY_TURNOVER_PERIOD_MONTHS, String(months))
}

export async function deleteCategory(
  id: string,
): Promise<{ success: boolean; reason?: string }> {
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) {
    return {
      success: false,
      reason: `このカテゴリを参照している商品が ${count} 件あるため削除できません。`,
    }
  }
  await prisma.productCategory.update({ where: { id }, data: { deletedAt: new Date() } })
  return { success: true }
}

// ── 固定費（RecurringEntry） ───────────────────────────────────────────────────

const FIXED_COST_CATEGORY = "固定費"

export async function getRecurringEntries(): Promise<RecurringEntryDTO[]> {
  const rows = await prisma.recurringEntry.findMany({
    where: { deletedAt: null, category: FIXED_COST_CATEGORY },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map((r) => ({ id: r.id, description: r.description, amountYen: Number(r.amountYen), category: r.category, dueDay: r.dueDay, sortOrder: r.sortOrder }))
}

export async function saveRecurringEntries(
  items: Array<{ id?: string; description: string; amountYen: number; dueDay: number }>,
): Promise<RecurringEntryDTO[]> {
  return prisma.$transaction(async (tx) => {
    // 固定費カテゴリのエントリのみを対象にする
    const existing = await tx.recurringEntry.findMany({
      where: { deletedAt: null, category: FIXED_COST_CATEGORY },
      select: { id: true },
    })
    const existingIds = existing.map((r) => r.id)
    const incomingIds = items.filter((i) => i.id).map((i) => i.id as string)
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id))

    if (toDelete.length > 0) {
      await tx.recurringEntry.updateMany({ where: { id: { in: toDelete } }, data: { deletedAt: new Date() } })
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.id) {
        await tx.recurringEntry.update({
          where: { id: item.id },
          data: { description: item.description, amountYen: item.amountYen, dueDay: item.dueDay, sortOrder: i },
        })
      } else {
        await tx.recurringEntry.create({
          data: { description: item.description, amountYen: item.amountYen, dueDay: item.dueDay, sortOrder: i, flow: "expense", category: FIXED_COST_CATEGORY },
        })
      }
    }

    const updated = await tx.recurringEntry.findMany({
      where: { deletedAt: null, category: FIXED_COST_CATEGORY },
      orderBy: { sortOrder: "asc" },
    })
    return updated.map((r) => ({ id: r.id, description: r.description, amountYen: Number(r.amountYen), category: r.category, dueDay: r.dueDay, sortOrder: r.sortOrder }))
  })
}

// ── 内部留保 ──────────────────────────────────────────────────────────────────

export async function getReservePolicies(): Promise<ReservePolicyDTO[]> {
  const rows = await prisma.reservePolicy.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, percent: Number(r.percent), sortOrder: r.sortOrder }))
}

export async function saveReservePolicies(
  items: Array<{ id: string; percent: number }>,
): Promise<ReservePolicyDTO[]> {
  return prisma.$transaction(async (tx) => {
    for (let i = 0; i < items.length; i++) {
      await tx.reservePolicy.update({
        where: { id: items[i].id },
        data: { percent: items[i].percent, sortOrder: i },
      })
    }
    const updated = await tx.reservePolicy.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
    return updated.map((r) => ({ id: r.id, name: r.name, description: r.description, percent: Number(r.percent), sortOrder: r.sortOrder }))
  })
}
