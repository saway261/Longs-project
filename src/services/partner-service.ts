import { prisma } from "@/src/lib/prisma"

export type SupplierDTO = {
  businessPartnerId: string
  name: string
  closingDay: number
  paymentMonthOffset: number
  paymentDay: number
}

export type CustomerDTO = {
  businessPartnerId: string
  name: string
  closingDay: number
  collectionMonthOffset: number
  collectionDay: number
}

export async function getSuppliers(): Promise<SupplierDTO[]> {
  const rows = await prisma.supplier.findMany({
    include: { businessPartner: { select: { name: true } } },
    orderBy: { businessPartner: { name: "asc" } },
  })
  return rows.map((r) => ({
    businessPartnerId: r.businessPartnerId,
    name: r.businessPartner.name,
    closingDay: r.closingDay,
    paymentMonthOffset: r.paymentMonthOffset,
    paymentDay: r.paymentDay,
  }))
}

export async function updateSupplierPaymentTerms(
  businessPartnerId: string,
  data: { closingDay: number; paymentMonthOffset: number; paymentDay: number },
): Promise<SupplierDTO> {
  const updated = await prisma.supplier.update({
    where: { businessPartnerId },
    data,
    include: { businessPartner: { select: { name: true } } },
  })
  return {
    businessPartnerId: updated.businessPartnerId,
    name: updated.businessPartner.name,
    closingDay: updated.closingDay,
    paymentMonthOffset: updated.paymentMonthOffset,
    paymentDay: updated.paymentDay,
  }
}

export async function getCustomers(): Promise<CustomerDTO[]> {
  const rows = await prisma.customer.findMany({
    include: { businessPartner: { select: { name: true } } },
    orderBy: { businessPartner: { name: "asc" } },
  })
  return rows.map((r) => ({
    businessPartnerId: r.businessPartnerId,
    name: r.businessPartner.name,
    closingDay: r.closingDay,
    collectionMonthOffset: r.collectionMonthOffset,
    collectionDay: r.collectionDay,
  }))
}

export async function updateCustomerCollectionTerms(
  businessPartnerId: string,
  data: { closingDay: number; collectionMonthOffset: number; collectionDay: number },
): Promise<CustomerDTO> {
  const updated = await prisma.customer.update({
    where: { businessPartnerId },
    data,
    include: { businessPartner: { select: { name: true } } },
  })
  return {
    businessPartnerId: updated.businessPartnerId,
    name: updated.businessPartner.name,
    closingDay: updated.closingDay,
    collectionMonthOffset: updated.collectionMonthOffset,
    collectionDay: updated.collectionDay,
  }
}
