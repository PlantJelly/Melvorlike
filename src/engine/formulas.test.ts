import { describe, expect, it } from 'vitest';
import { MIN_ACTION_DURATION_MS, clampProbabilityPercent, getActualDurationMs } from './formulas';

describe('getActualDurationMs', () => {
  it('halves duration at +100% speed bonus', () => {
    expect(getActualDurationMs(3000, 1)).toBe(1500);
  });

  it('never drops below the hard cap, even at extreme speed bonus (regression: legacy negative-time bug)', () => {
    expect(getActualDurationMs(3000, 999)).toBeGreaterThanOrEqual(MIN_ACTION_DURATION_MS);
    expect(getActualDurationMs(3000, 1_000_000)).toBe(MIN_ACTION_DURATION_MS);
  });

  it('never goes negative even with a negative bonus input', () => {
    expect(getActualDurationMs(3000, -50)).toBeGreaterThan(0);
  });
});

describe('clampProbabilityPercent', () => {
  it('never exceeds 100 (regression: legacy 240% probability bug)', () => {
    expect(clampProbabilityPercent(240)).toBe(100);
  });

  it('never goes below 0', () => {
    expect(clampProbabilityPercent(-10)).toBe(0);
  });

  it('passes through valid values unchanged', () => {
    expect(clampProbabilityPercent(42)).toBe(42);
  });
});
