import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  seededShuffle,
  getTodayChallengeSeed,
} from './dailyChallenge';

describe('getTodayChallengeSeed', () => {
  // Regression guard: the seed used to mix in Math.random()/Date.now(), so two
  // players (or the same player twice) could get different "daily" image sets.
  // It must now be a pure function of the Eastern-Time date.
  it('is stable across repeated calls within the same day', () => {
    expect(getTodayChallengeSeed()).toBe(getTodayChallengeSeed());
  });

  it('has the deterministic date-only shape', () => {
    expect(getTodayChallengeSeed()).toMatch(/^smrutimap-daily-\d{4}-\d{2}-\d{2}$/);
  });
});

describe('createSeededRandom', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createSeededRandom('seed-xyz');
    const b = createSeededRandom('seed-xyz');
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createSeededRandom('seed-A');
    const b = createSeededRandom('seed-B');
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('returns values in the [0, 1) range', () => {
    const rng = createSeededRandom('range-check');
    for (let i = 0; i < 50; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('seededShuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('is deterministic for a given seed', () => {
    expect(seededShuffle(items, 'daily-2026-06-10')).toEqual(seededShuffle(items, 'daily-2026-06-10'));
  });

  it('preserves every element exactly once', () => {
    const shuffled = seededShuffle(items, 'daily-2026-06-10');
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    seededShuffle(items, 'whatever');
    expect(items).toEqual(copy);
  });

  it('actually reorders for at least one seed (not the identity)', () => {
    // Find a seed that permutes a small list, proving the shuffle does work.
    const small = [0, 1, 2, 3, 4, 5, 6, 7];
    const reordered = ['a', 'b', 'c', 'd'].some(
      (seed) => JSON.stringify(seededShuffle(small, seed)) !== JSON.stringify(small)
    );
    expect(reordered).toBe(true);
  });
});
