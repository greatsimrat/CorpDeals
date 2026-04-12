export const COUNTED_OFFER_STATE = 'APPROVED' as const;
export const COUNTED_OFFER_STATUSES = ['APPROVED', 'LIVE'] as const;

export const isOfferCountedForPlanLimit = (input: {
  active: boolean;
  offerState?: string | null;
  offerStatus?: string | null;
}) =>
  Boolean(input.active) &&
  String(input.offerState || '').toUpperCase() === COUNTED_OFFER_STATE &&
  COUNTED_OFFER_STATUSES.includes(String(input.offerStatus || '').toUpperCase() as any);

export const buildCountedOfferWhere = (input: {
  vendorId?: string;
  excludeOfferId?: string | null;
}) => {
  const where: Record<string, unknown> = {
    active: true,
    offerState: COUNTED_OFFER_STATE,
    offerStatus: { in: [...COUNTED_OFFER_STATUSES] as any },
  };

  if (input.vendorId) {
    where.vendorId = input.vendorId;
  }

  if (input.excludeOfferId) {
    where.id = { not: input.excludeOfferId };
  }

  return where;
};
