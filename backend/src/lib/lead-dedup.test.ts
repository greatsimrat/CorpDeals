import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLeadDuplicateWindowStart,
  isDuplicateLeadWithinWindow,
  LEAD_DUPLICATE_WINDOW_DAYS,
} from './lead-dedup';

test('duplicate window starts exactly 30 days before reference date', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');
  const start = getLeadDuplicateWindowStart(now, LEAD_DUPLICATE_WINDOW_DAYS);
  assert.equal(start.toISOString(), '2026-03-13T00:00:00.000Z');
});

test('lead is duplicate when previous inquiry is within 30 days', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');
  const previous = new Date('2026-04-01T12:00:00.000Z');
  assert.equal(isDuplicateLeadWithinWindow(previous, now), true);
});

test('lead is not duplicate when previous inquiry is outside 30 days', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');
  const previous = new Date('2026-03-01T12:00:00.000Z');
  assert.equal(isDuplicateLeadWithinWindow(previous, now), false);
});

