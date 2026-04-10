import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOfferBillingEnforcementAction } from './vendor-offer-enforcement';

test('live offer gets paused when billing becomes invalid', () => {
  const action = resolveOfferBillingEnforcementAction({
    offerState: 'APPROVED',
    active: true,
    isBillingAllowed: false,
  });
  assert.equal(action, 'PAUSE');
});

test('non-live offer does not get paused by revalidation', () => {
  const action = resolveOfferBillingEnforcementAction({
    offerState: 'APPROVED',
    active: false,
    isBillingAllowed: false,
  });
  assert.equal(action, 'NONE');
});

test('live offer remains unchanged when billing is valid', () => {
  const action = resolveOfferBillingEnforcementAction({
    offerState: 'APPROVED',
    active: true,
    isBillingAllowed: true,
  });
  assert.equal(action, 'NONE');
});
