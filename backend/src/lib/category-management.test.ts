import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryDeleteSafety, slugifyCategoryName } from './category-management';

test('slugifyCategoryName normalizes category names', () => {
  assert.equal(slugifyCategoryName('  Banking & Finance  '), 'banking-finance');
  assert.equal(slugifyCategoryName('Telecom / Mobile Plans'), 'telecom-mobile-plans');
});

test('cannot delete parent category when subcategories exist', () => {
  const result = getCategoryDeleteSafety({
    isSubcategory: false,
    childCount: 2,
    offerCount: 0,
    leadEventCount: 0,
  });
  assert.equal(result.canDelete, false);
  if (!result.canDelete) {
    assert.equal(result.code, 'CATEGORY_HAS_SUBCATEGORIES');
  }
});

test('cannot delete subcategory when linked offers exist', () => {
  const result = getCategoryDeleteSafety({
    isSubcategory: true,
    childCount: 0,
    offerCount: 3,
    leadEventCount: 0,
  });
  assert.equal(result.canDelete, false);
  if (!result.canDelete) {
    assert.equal(result.code, 'CATEGORY_HAS_OFFERS');
  }
});

test('cannot delete category when lead history exists', () => {
  const result = getCategoryDeleteSafety({
    isSubcategory: false,
    childCount: 0,
    offerCount: 0,
    leadEventCount: 5,
  });
  assert.equal(result.canDelete, false);
  if (!result.canDelete) {
    assert.equal(result.code, 'CATEGORY_HAS_LEAD_EVENTS');
  }
});

test('allows delete when category is unused', () => {
  const result = getCategoryDeleteSafety({
    isSubcategory: false,
    childCount: 0,
    offerCount: 0,
    leadEventCount: 0,
  });
  assert.equal(result.canDelete, true);
});
