import prisma from '../lib/prisma';
import { getVendorBillingAccess } from '../lib/vendor-billing-access';
import { enforceLiveOfferBillingEligibility } from '../lib/vendor-offer-enforcement';

const args = new Set(process.argv.slice(2));
const applyStatus = args.has('--apply-status');

const AUDIT_STATES = ['SUBMITTED', 'APPROVED'] as const;

async function main() {
  const offers = await (prisma as any).offer.findMany({
    where: {
      offerState: { in: AUDIT_STATES as any },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      offerState: true,
      offerStatus: true,
      active: true,
      vendorId: true,
      vendor: {
        select: {
          companyName: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const nonCompliantOffers: Array<Record<string, unknown>> = [];
  const byStatus: Record<string, number> = {};
  const byVendor: Record<string, number> = {};

  for (const offer of offers as any[]) {
    const access = await getVendorBillingAccess(String(offer.vendorId), 'PUBLISH_OFFER', {
      excludeOfferId: String(offer.id),
    });
    if (access.allowed) continue;

    nonCompliantOffers.push({
      id: offer.id,
      slug: offer.slug,
      title: offer.title,
      offerState: offer.offerState,
      offerStatus: offer.offerStatus,
      active: offer.active,
      vendor: offer.vendor?.companyName || null,
      reasonCode: access.reasonCode,
      associationStatus: access.billingAssociationStatus,
      planStatus: access.planStatus,
      message: access.message,
    });
    byStatus[String(offer.offerState || 'UNKNOWN')] =
      (byStatus[String(offer.offerState || 'UNKNOWN')] || 0) + 1;
    byVendor[String(offer.vendor?.companyName || 'Unknown')] =
      (byVendor[String(offer.vendor?.companyName || 'Unknown')] || 0) + 1;
  }

  const revalidationResult = await enforceLiveOfferBillingEligibility({
    applyChanges: applyStatus,
  });

  console.log('Offer billing compliance audit');
  console.table({
    offersScanned: offers.length,
    nonCompliantOffers: nonCompliantOffers.length,
    applyStatus,
    liveOffersPaused: revalidationResult.pausedOffers,
  });

  if (Object.keys(byStatus).length) {
    console.log('Non-compliant offer count by status');
    console.table(byStatus);
  }

  if (Object.keys(byVendor).length) {
    console.log('Non-compliant offer count by vendor');
    console.table(byVendor);
  }

  if (nonCompliantOffers.length) {
    console.log('Non-compliant offers (sample up to 50 rows)');
    console.table(nonCompliantOffers.slice(0, 50));
  } else {
    console.log('No non-compliant offers found.');
  }
}

main()
  .catch((error) => {
    if ((error as any)?.code === 'P2022') {
      console.error(
        'Offer audit failed because billing-association columns are missing. Run `npx prisma migrate deploy` first.'
      );
    }
    console.error('Offer audit failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
