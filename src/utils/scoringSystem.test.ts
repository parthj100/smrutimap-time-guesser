import { describe, it, expect } from 'vitest';
import type { GuessResult } from '@/types/game';
import {
  calculateYearScore,
  calculateLocationScore,
  calculateTotalScore,
  calculateTimeBonus,
  calculateCompleteScore,
  calculateFinalScore,
  getScoreFeedback,
  getFinalScoreFeedback,
  SCORE_CONSTANTS,
} from './scoringSystem';

describe('calculateYearScore', () => {
  it('gives a perfect 100 for an exact match', () => {
    expect(calculateYearScore(1969, 1969)).toBe(100);
  });

  it('steps down across each difficulty band', () => {
    expect(calculateYearScore(2000, 1999)).toBe(95); // 1 yr off
    expect(calculateYearScore(2000, 1998)).toBe(90); // 2 yr off
    expect(calculateYearScore(2000, 1992)).toBe(66); // 8 yr off
    expect(calculateYearScore(2000, 1980)).toBe(36); // 20 yr off
    expect(calculateYearScore(2000, 1960)).toBe(12); // 40 yr off
    expect(calculateYearScore(2000, 1920)).toBe(6); // 80 yr off
  });

  it('is symmetric in the direction of error', () => {
    expect(calculateYearScore(2000, 1990)).toBe(calculateYearScore(1990, 2000));
  });

  it('scores the worst possible in-game miss (125 years) at 4, not 0', () => {
    // The full 1900-2025 range is the largest gap a player can produce.
    expect(calculateYearScore(2025, 1900)).toBe(4);
  });

  it('floors at 1 for gaps beyond the game range', () => {
    expect(calculateYearScore(2000, 1700)).toBe(1); // 300-year gap
  });

  it('always returns a value within [1, 100]', () => {
    for (let diff = 0; diff <= 125; diff++) {
      const score = calculateYearScore(2025, 2025 - diff);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('calculateLocationScore', () => {
  it('gives a perfect 100 when the guess is the actual location', () => {
    expect(calculateLocationScore(40.7128, -74.006, 40.7128, -74.006)).toBe(100);
  });

  it('gives 100 within the 5-mile bullseye radius', () => {
    // ~3 miles north of the target
    expect(calculateLocationScore(40.7128, -74.006, 40.756, -74.006)).toBe(100);
  });

  it('falls off for a far guess but never below 1', () => {
    // New York target, London guess — thousands of miles away
    const score = calculateLocationScore(40.7128, -74.006, 51.5074, -0.1278);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThan(20);
  });
});

describe('calculateTotalScore', () => {
  it('weights location 60% and year 40%', () => {
    expect(calculateTotalScore(100, 100)).toBe(100);
    expect(calculateTotalScore(100, 0)).toBe(40);
    expect(calculateTotalScore(0, 100)).toBe(60);
  });
});

describe('calculateTimeBonus', () => {
  it('is zero when not in timed mode', () => {
    expect(calculateTimeBonus(30, false, 'per-round')).toBe(0);
  });

  it('is zero for the total-game timer (only per-round earns a bonus)', () => {
    expect(calculateTimeBonus(30, true, 'total-game')).toBe(0);
  });

  it('awards 1.5x the remaining seconds for a per-round timer', () => {
    expect(calculateTimeBonus(20, true, 'per-round')).toBe(30);
  });

  it('never goes negative', () => {
    expect(calculateTimeBonus(-10, true, 'per-round')).toBe(0);
  });
});

describe('calculateCompleteScore', () => {
  it('produces a 10000 display score for a perfect untimed round', () => {
    const result = calculateCompleteScore(1969, 40.7128, -74.006, 1969, 40.7128, -74.006);
    expect(result.displayYearScore).toBe(5000);
    expect(result.displayLocationScore).toBe(5000);
    expect(result.displayTotalScore).toBe(10000);
    expect(result.timeBonus).toBe(0);
  });

  it('adds the time bonus on top of the display total in timed per-round mode', () => {
    const result = calculateCompleteScore(
      1969, 40.7128, -74.006, 1969, 40.7128, -74.006,
      20, true, 'per-round'
    );
    expect(result.displayTotalScore).toBe(10000 + 30);
  });

  it('respects the documented per-category display ceiling', () => {
    const result = calculateCompleteScore(1969, 40.7128, -74.006, 1969, 40.7128, -74.006);
    expect(result.displayYearScore).toBeLessThanOrEqual(SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY);
    expect(result.displayLocationScore).toBeLessThanOrEqual(SCORE_CONSTANTS.MAX_DISPLAY_SCORE_PER_CATEGORY);
  });
});

describe('calculateFinalScore', () => {
  it('returns 0 for no rounds', () => {
    expect(calculateFinalScore([])).toBe(0);
  });

  it('prefers the precomputed scaledScore when present', () => {
    const results = [{ scaledScore: 5000 }, { scaledScore: 3200 }] as unknown as GuessResult[];
    expect(calculateFinalScore(results)).toBe(8200);
  });

  it('falls back to summing display fields when scaledScore is absent', () => {
    const results = [
      { displayYearScore: 4000, displayLocationScore: 4500, timeBonus: 100 },
    ] as unknown as GuessResult[];
    expect(calculateFinalScore(results)).toBe(8600);
  });
});

describe('feedback helpers', () => {
  it('maps a perfect display score to the top tier', () => {
    expect(getScoreFeedback(10000, true)).toBe('Amazing!');
  });

  it('maps a zero score to the bottom tier', () => {
    expect(getScoreFeedback(0, true)).toBe('Try again!');
  });

  it('treats a raw (non-display) score on its own 0-100 scale', () => {
    expect(getScoreFeedback(90, false)).toBe('Amazing!');
  });

  it('summarizes a strong game across rounds', () => {
    // 5 rounds averaging 8500/round -> 85% of max -> top tier
    expect(getFinalScoreFeedback(42500, 5)).toBe('Outstanding performance!');
  });
});
