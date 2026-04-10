import prisma from './prisma';
import { getVendorBillingAccess } from './vendor-billing-access';

export type OfferBillingEnforcementAction = 'NONE' | 'PAUSE';

export const resolveOfferBillingEnforcementAction = (input: {
  offerState: string;
  active: boolean;
  isBillingAllowed: boolean;
}): OfferBillingEnforcementAction => {
  const state = String(input.offerState || '').toUpperCase();
  if (!input.isBillingAllowed && state === 'APPROVED' && input.active) {
    return 'PAUSE';
  }
  return 'NONE';
};

export const enforceLiveOfferBillingEligibility = async (options?: {
  applyChanges?: boolean;
  limit?: number;
}) => {
  const applyChanges = Boolean(options?.applyChanges);
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: {
      offerState: 'APPROVED',
      active: true,
    } as any,
    select: {
      id: true,
      vendorId: true,
      title: true,
      offerState: true,
      offerStatus: true,
      active: true,
      complianceNotes: true,
      vendor: {
        select: {
          companyName: true,
        },
      },
    } as any,
    orderBy: { updatedAt: 'desc' },
    ...(options?.limit && options.limit > 0 ? { take: options.limit } : {}),
  });

  const blockedOffers: Array<Record<string, unknown>> = [];
  let pausedCount = 0;

  for (const offer of offers as any[]) {
    const access = await getVendorBillingAccess(String(offer.vendorId), 'PUBLISH_OFFER', {
      excludeOfferId: String(offer.id),
    });
    const nextAction = resolveOfferBillingEnforcementAction({
      offerState: String((offer as any).offerState || ''),
      active: Boolean((offer as any).active),
      isBillingAllowed: access.allowed,
    });

    if (nextAction === 'NONE') continue;

    blockedOffers.push({
      id: offer.id,
      title: offer.title,
      vendorId: offer.vendorId,
      vendorName: offer.vendor?.companyName || null,
      reasonCode: access.reasonCode,
      associationStatus: access.billingAssociationStatus,
      planStatus: access.planStatus,
      message: access.message,
    });

    if (applyChanges) {
      const taggedComplianceNote = `[BILLING_BLOCKED:${access.reasonCode}] ${
        access.message || 'Blocked by billing enforcement'
      } @ ${now.toISOString()}`;
      await prisma.offer.update({
        where: { id: String(offer.id) },
        data: {
          active: false,
          offerStatus: 'PAUSED',
          offerState: 'APPROVED',
          pausedAt: now,
          pausedByUserId: null,
          complianceNotes: taggedComplianceNote,
        } as any,
      });
      pausedCount += 1;
    }
  }

  return {
    scannedOffers: offers.length,
    blockedOffers: blockedOffers.length,
    pausedOffers: pausedCount,
    applyChanges,
    results: blockedOffers,
  };
};
