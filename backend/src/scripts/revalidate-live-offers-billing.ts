import { enforceLiveOfferBillingEligibility } from '../lib/vendor-offer-enforcement';

const args = new Set(process.argv.slice(2));
const applyChanges = args.has('--apply');

async function main() {
  const result = await enforceLiveOfferBillingEligibility({ applyChanges });
  console.log('Live offer billing revalidation');
  console.table({
    applyChanges: result.applyChanges,
    scannedOffers: result.scannedOffers,
    blockedOffers: result.blockedOffers,
    pausedOffers: result.pausedOffers,
  });

  if (result.results.length) {
    console.log('Blocked offers (sample up to 50 rows)');
    console.table(result.results.slice(0, 50));
  }
}

main().catch((error) => {
  console.error('Live offer revalidation failed:', error);
  process.exit(1);
});
