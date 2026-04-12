import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveVendorSubscriptionPlanTier,
  VENDOR_SUBSCRIPTION_PLAN_PRESETS,
} from './vendor-subscription-plan';

test('resolves supported plan tiers', () => {
  assert.equal(resolveVendorSubscriptionPlanTier('FREE'), 'FREE');
  assert.equal(resolveVendorSubscriptionPlanTier('gold'), 'GOLD');
  assert.equal(resolveVendorSubscriptionPlanTier('PREMIUM'), 'PREMIUM');
});

test('maps legacy tier aliases to supported plans', () => {
  assert.equal(resolveVendorSubscriptionPlanTier('growth'), 'GOLD');
  assert.equal(resolveVendorSubscriptionPlanTier('pro'), 'PREMIUM');
});

test('returns null for unsupported tier values', () => {
  assert.equal(resolveVendorSubscriptionPlanTier('enterprise'), null);
  assert.equal(resolveVendorSubscriptionPlanTier(''), null);
});

test('default plan presets are CAD and non-negative', () => {
  for (const [tier, preset] of Object.entries(VENDOR_SUBSCRIPTION_PLAN_PRESETS)) {
    assert.equal(preset.currency, 'CAD', `${tier} must remain CAD-only`);
    assert.ok(preset.monthlyFee >= 0, `${tier} monthly fee must be non-negative`);
    assert.ok(
      preset.includedLeadsPerMonth >= 0,
      `${tier} included leads must be non-negative`
    );
  }
});

