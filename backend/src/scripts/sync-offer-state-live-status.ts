import prisma from '../lib/prisma';

async function main() {
  const before = await prisma.offer.groupBy({
    by: ['offerState', 'active'],
    _count: { _all: true },
  } as any);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      UPDATE "offers"
      SET "offer_state" = CASE
        WHEN "offer_status" = 'CANCELLED'::"OfferStatus" THEN 'CANCELLED'::"OfferState"
        WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferState"
        WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferState"
        WHEN "compliance_status" = 'approved' THEN 'APPROVED'::"OfferState"
        ELSE 'DRAFT'::"OfferState"
      END
    `);

    await tx.$executeRawUnsafe(`
      UPDATE "offers"
      SET "active" = FALSE
      WHERE "offer_state" <> 'APPROVED'::"OfferState"
        AND "active" = TRUE
    `);

    await tx.$executeRawUnsafe(`
      UPDATE "offers"
      SET "offer_status" = CASE
        WHEN "offer_state" = 'CANCELLED'::"OfferState" THEN 'CANCELLED'::"OfferStatus"
        WHEN "offer_state" = 'SUBMITTED'::"OfferState" THEN 'SUBMITTED'::"OfferStatus"
        WHEN "offer_state" = 'REJECTED'::"OfferState" THEN 'REJECTED'::"OfferStatus"
        WHEN "offer_state" = 'APPROVED'::"OfferState" AND "active" = TRUE THEN 'LIVE'::"OfferStatus"
        WHEN "offer_state" = 'APPROVED'::"OfferState" AND "active" = FALSE THEN 'APPROVED'::"OfferStatus"
        ELSE 'DRAFT'::"OfferStatus"
      END
    `);
  });

  const after = await prisma.offer.groupBy({
    by: ['offerState', 'active'],
    _count: { _all: true },
  } as any);

  console.log('Offer state/live sync completed.');
  console.log('Before:', before);
  console.log('After:', after);
}

main()
  .catch((error) => {
    console.error('Offer state/live sync failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

