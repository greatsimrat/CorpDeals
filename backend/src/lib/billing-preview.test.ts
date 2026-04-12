import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BILLING_GST_RATE,
  calculateBillingPreviewTotals,
  resolveLeadUsageForCycle,
} from './billing-preview';

test('billing preview applies fixed 5% GST to subtotal', () => {
  const totals = calculateBillingPreviewTotals({
    monthlySubscriptionAmount: 100,
    paidLeadCharges: 75,
  });
  assert.equal(totals.subtotal, 175);
  assert.equal(totals.gstRate, BILLING_GST_RATE);
  assert.equal(totals.gstAmount, 8.75);
  assert.equal(totals.estimatedTotal, 183.75);
});

test('billing preview rounds deterministic currency values', () => {
  const totals = calculateBillingPreviewTotals({
    monthlySubscriptionAmount: 99.999,
    paidLeadCharges: 10.005,
  });
  assert.equal(totals.monthlySubscriptionAmount, 100);
  assert.equal(totals.paidLeadCharges, 10.01);
  assert.equal(totals.subtotal, 110.01);
  assert.equal(totals.gstAmount, 5.5);
  assert.equal(totals.estimatedTotal, 115.51);
});

test('lead usage consumes free leads first and then paid leads', () => {
  const usage = resolveLeadUsageForCycle({
    uniqueValidLeadCount: 25,
    includedFreeLeads: 20,
  });
  assert.equal(usage.freeLeadsUsed, 20);
  assert.equal(usage.paidLeadCount, 5);
});

test('lead usage handles low-volume cycle safely', () => {
  const usage = resolveLeadUsageForCycle({
    uniqueValidLeadCount: 3,
    includedFreeLeads: 20,
  });
  assert.equal(usage.freeLeadsUsed, 3);
  assert.equal(usage.paidLeadCount, 0);
});

test('gold scenario fixture: 20 free leads and 5 paid leads', () => {
  const usage = resolveLeadUsageForCycle({
    uniqueValidLeadCount: 25,
    includedFreeLeads: 20,
  });
  assert.equal(usage.freeLeadsUsed, 20);
  assert.equal(usage.paidLeadCount, 5);

  const totals = calculateBillingPreviewTotals({
    monthlySubscriptionAmount: 100,
    paidLeadCharges: 75,
  });
  assert.equal(totals.subtotal, 175);
  assert.equal(totals.gstAmount, 8.75);
  assert.equal(totals.estimatedTotal, 183.75);
});
