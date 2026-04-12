import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCountedOfferWhere,
  COUNTED_OFFER_STATE,
  COUNTED_OFFER_STATUSES,
  isOfferCountedForPlanLimit,
} from './offer-counting';

test('buildCountedOfferWhere uses approved+active/live filters', () => {
  const where = buildCountedOfferWhere({ vendorId: 'vendor-1' }) as any;
  assert.equal(where.active, true);
  assert.equal(where.offerState, COUNTED_OFFER_STATE);
  assert.deepEqual(where.offerStatus?.in, [...COUNTED_OFFER_STATUSES]);
  assert.equal(where.vendorId, 'vendor-1');
});

test('counted offer includes approved+active+approved status', () => {
  assert.equal(
    isOfferCountedForPlanLimit({ active: true, offerState: 'APPROVED', offerStatus: 'APPROVED' }),
    true
  );
});

test('counted offer includes approved+active+live status', () => {
  assert.equal(
    isOfferCountedForPlanLimit({ active: true, offerState: 'APPROVED', offerStatus: 'LIVE' }),
    true
  );
});

for (const nonCountedStatus of ['DRAFT', 'SUBMITTED', 'REJECTED', 'CANCELLED', 'PAUSED']) {
  test(`offer status ${nonCountedStatus} does not count toward plan limit`, () => {
    assert.equal(
      isOfferCountedForPlanLimit({
        active: true,
        offerState: 'APPROVED',
        offerStatus: nonCountedStatus,
      }),
      false
    );
  });
}

for (const nonCountedState of ['DRAFT', 'SUBMITTED', 'REJECTED', 'CANCELLED']) {
  test(`offer state ${nonCountedState} does not count toward plan limit`, () => {
    assert.equal(
      isOfferCountedForPlanLimit({
        active: true,
        offerState: nonCountedState,
        offerStatus: 'LIVE',
      }),
      false
    );
  });
}

test('inactive approved/live offer does not count toward plan limit', () => {
  assert.equal(
    isOfferCountedForPlanLimit({ active: false, offerState: 'APPROVED', offerStatus: 'LIVE' }),
    false
  );
});

