"use server"

import * as partnerService from "@/src/services/partner-service"

export type { SupplierDTO, CustomerDTO } from "@/src/services/partner-service"

const VALID_DAY = (d: number) => (d >= 1 && d <= 28) || d === 31
const VALID_OFFSET = (o: number) => [0, 1, 2].includes(o)

export async function getSuppliersAction(): Promise<
  { success: true; data: partnerService.SupplierDTO[] } | { success: false; error: string }
> {
  try {
    const data = await partnerService.getSuppliers()
    return { success: true, data }
  } catch (e) {
    console.error("[getSuppliersAction]", e)
    return { success: false, error: "仕入先の取得に失敗しました" }
  }
}

export async function updateSupplierPaymentTermsAction(
  businessPartnerId: string,
  data: { closingDay: number; paymentMonthOffset: number; paymentDay: number },
): Promise<{ success: true; data: partnerService.SupplierDTO } | { success: false; error: string }> {
  try {
    if (!VALID_DAY(data.closingDay)) return { success: false, error: "締め日は1〜28または末日(31)で入力してください" }
    if (!VALID_OFFSET(data.paymentMonthOffset)) return { success: false, error: "支払月は当月・翌月・翌々月のいずれかです" }
    if (!VALID_DAY(data.paymentDay)) return { success: false, error: "支払日は1〜28または末日(31)で入力してください" }
    const result = await partnerService.updateSupplierPaymentTerms(businessPartnerId, data)
    return { success: true, data: result }
  } catch (e) {
    console.error("[updateSupplierPaymentTermsAction]", e)
    return { success: false, error: "支払条件の保存に失敗しました" }
  }
}

export async function getCustomersAction(): Promise<
  { success: true; data: partnerService.CustomerDTO[] } | { success: false; error: string }
> {
  try {
    const data = await partnerService.getCustomers()
    return { success: true, data }
  } catch (e) {
    console.error("[getCustomersAction]", e)
    return { success: false, error: "得意先の取得に失敗しました" }
  }
}

export async function updateCustomerCollectionTermsAction(
  businessPartnerId: string,
  data: { closingDay: number; collectionMonthOffset: number; collectionDay: number },
): Promise<{ success: true; data: partnerService.CustomerDTO } | { success: false; error: string }> {
  try {
    if (!VALID_DAY(data.closingDay)) return { success: false, error: "締め日は1〜28または末日(31)で入力してください" }
    if (!VALID_OFFSET(data.collectionMonthOffset)) return { success: false, error: "回収月は当月・翌月・翌々月のいずれかです" }
    if (!VALID_DAY(data.collectionDay)) return { success: false, error: "回収日は1〜28または末日(31)で入力してください" }
    const result = await partnerService.updateCustomerCollectionTerms(businessPartnerId, data)
    return { success: true, data: result }
  } catch (e) {
    console.error("[updateCustomerCollectionTermsAction]", e)
    return { success: false, error: "回収条件の保存に失敗しました" }
  }
}
