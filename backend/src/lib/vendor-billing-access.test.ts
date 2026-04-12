import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canApplyAdminBillingOverride,
  evaluateVendorBillingAccessFromState,
} from './vendor-billing-access';

const baseState = () =>
  ({
    billingProfile: {},
    associationStatus: 'ACTIVE',
    hasAllowedAssociationStatus: true,
    latestPlan: { id: 'plan-1' },
    activePlan: { id: 'plan-1' },
    planStatus: 'ACTIVE',
    planDisplayName: 'Paid',
    offerLimit: 25,
    managedOfferCount: 3,
    liveOfferCount: 2,
    remainingOfferSlots: 22,
    canCreateOffer: true,
    canPublishOffer: true,
    createOfferMessage: '',
    publishOfferMessage: '',
  }) as any;

test('compliant vendor can create offer', () => {
  const result = evaluateVendorBillingAccessFromState(baseState(), 'CREATE_OFFER');
  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, 'OK');
});

test('blocked billing association cannot create offer', () => {
  const state = baseState();
  state.associationStatus = 'PAST_DUE';
  state.hasAllowedAssociationStatus = false;
  state.createOfferMessage = 'Your billing account is past due.';

  const result = evaluateVendorBillingAccessFromState(state, 'CREATE_OFFER');
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'VENDOR_BILLING_BLOCKED');
});

test('vendor with no active plan gets plan required error', () => {
  const state = baseState();
  state.activePlan = null;
  state.planStatus = 'NONE';
  state.publishOfferMessage = 'Active plan required.';

  const result = evaluateVendorBillingAccessFromState(state, 'SUBMIT_OFFER');
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'VENDOR_PLAN_REQUIRED');
});

test('offer limit reached blocks create', () => {
  const state = baseState();
  state.offerLimit = 5;
  state.managedOfferCount = 5;
  state.remainingOfferSlots = 0;
  state.createOfferMessage = 'Plan limit reached.';

  const result = evaluateVendorBillingAccessFromState(state, 'CREATE_OFFER');
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'VENDOR_PLAN_LIMIT_REACHED');
});

test('free plan threshold 49/50 allows one more counted offer', () => {
  const state = baseState();
  state.offerLimit = 50;
  state.managedOfferCount = 49;
  state.remainingOfferSlots = 1;

  const result = evaluateVendorBillingAccessFromState(state, 'CREATE_OFFER');
  assert.equal(result.allowed, true);
  assert.equal(result.reasonCode, 'OK');
});

test('free plan threshold 50/50 blocks next counted offer', () => {
  const state = baseState();
  state.offerLimit = 50;
  state.managedOfferCount = 50;
  state.remainingOfferSlots = 0;
  state.createOfferMessage = 'Plan limit reached.';

  const result = evaluateVendorBillingAccessFromState(state, 'CREATE_OFFER');
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'VENDOR_PLAN_LIMIT_REACHED');
});

test('gold plan threshold 99/100 allows one more counted offer', () => {
  const state = baseState();
  state.planDisplayName = 'Gold';
  state.offerLimit = 100;
  state.managedOfferCount = 99;
  state.remainingOfferSlots = 1;

  const result = evaluateVendorBillingAccessFromState(state, 'CREATE_OFFER');
  assert.equal(result.allowed, true);
});

test('gold plan threshold 100/100 blocks additional counted offer', () => {
  const state = baseState();
  state.planDisplayName = 'Gold';
  state.offerLimit = 100;
  state.managedOfferCount = 100;
  state.remainingOfferSlots = 0;
  state.createOfferMessage = 'Plan limit reached.';

  const result = evaluateVendorBillingAccessFromState(state, 'PUBLISH_OFFER');
  assert.equal(result.allowed, false);
  assert.equal(result.reasonCode, 'VENDOR_PLAN_LIMIT_REACHED');
});

test('non-compliant vendor cannot submit or publish', () => {
  const state = baseState();
  state.hasAllowedAssociationStatus = false;
  state.associationStatus = 'INACTIVE';
  state.publishOfferMessage = 'Billing inactive.';

  const submitResult = evaluateVendorBillingAccessFromState(state, 'SUBMIT_OFFER');
  const publishResult = evaluateVendorBillingAccessFromState(state, 'PUBLISH_OFFER');

  assert.equal(submitResult.allowed, false);
  assert.equal(submitResult.reasonCode, 'VENDOR_BILLING_BLOCKED');
  assert.equal(publishResult.allowed, false);
  assert.equal(publishResult.reasonCode, 'VENDOR_BILLING_BLOCKED');
});

test('admin override helper requires explicit request and reason', () => {
  assert.equal(
    canApplyAdminBillingOverride({ requested: true, reason: 'Billing approved manually for hotfix' }),
    true
  );
  assert.equal(canApplyAdminBillingOverride({ requested: true, reason: 'short' }), false);
  assert.equal(
    canApplyAdminBillingOverride({ requested: false, reason: 'Billing approved manually for hotfix' }),
    false
  );
});
