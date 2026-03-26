import prisma from './prisma';

export const recordLeadDeliveryBillingEvent = async (leadId: string, vendorId: string) => {
  if (!leadId || !vendorId) return null;
  return (prisma as any).leadBillingEvent.upsert({
    where: { leadId },
    update: {},
    create: {
      leadId,
      vendorId,
      billedAt: new Date(),
      billingStatus: 'PENDING',
    },
  });
};
