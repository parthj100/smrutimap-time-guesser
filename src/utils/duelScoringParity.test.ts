// Pins the TS scoring formulas to the values produced by their plpgsql ports
// (duel_year_score / duel_location_score_from_km / duel_round_multiplier in
// supabase/migrations/20260611010351_duels_schema_and_rpcs.sql). Each expected
// value below was verified against the live database on 2026-06-10. If one of
// these fails, the client and the duel server have diverged — fix the SQL or
// the TS, never just the test.

import { describe, expect, it } from 'vitest';
import {
  calculateLocationScore,
  calculateYearScore,
} from './scoringSystem';

describe('duel scoring parity (TS vs SQL ports)', () => {
  it('year scores match duel_year_score for verified inputs', () => {
    // [actual, guessed, expected raw score] — expected values are the SQL
    // function's outputs.
    const cases: Array<[number, number, number]> = [
      [1980, 1980, 100],
      [1980, 1979, 95],
      [1980, 1975, 78],
      [1980, 1960, 36],
      [1980, 1950, 24],
      [1980, 1900, 6],
      [2025, 1800, 1],
    ];
    for (const [actual, guessed, expected] of cases) {
      expect(calculateYearScore(actual, guessed), `year ${actual} vs ${guessed}`).toBe(expected);
    }
  });

  it('location scores match duel_location_score_from_km for verified distances', () => {
    // calculateLocationScore takes coordinates; create points at a known
    // distance by moving along a meridian (1 degree latitude ≈ 111.19 km
    // under the haversine model both sides use, R=6371).
    const kmPerDegLat = (6371 * Math.PI) / 180;
    const at = (km: number) => calculateLocationScore(0, 0, km / kmPerDegLat, 0);

    expect(at(0)).toBe(100); // duel_location_score_from_km(0) = 100
    expect(at(10)).toBe(98); // duel_location_score_from_km(10) = 98
    expect(at(50)).toBe(65); // duel_location_score_from_km(50) = 65
    expect(at(500)).toBe(12); // duel_location_score_from_km(500) = 12
    expect(at(5000)).toBe(1); // duel_location_score_from_km(5000) = 1
  });

  it('display scale: raw × 50, two categories, 10000 max per round', () => {
    expect(calculateYearScore(1980, 1980) * 50).toBe(5000);
    expect(calculateLocationScore(0, 0, 0, 0) * 50).toBe(5000);
  });
});

// Mirrors duel_round_multiplier so the UI can explain damage; the server
// remains authoritative.
export const duelRoundMultiplier = (round: number): number =>
  round <= 4 ? 1 : 1 + 0.5 * (round - 4);

describe('duel damage multiplier ramp', () => {
  it('matches duel_round_multiplier verified outputs', () => {
    expect(duelRoundMultiplier(1)).toBe(1);
    expect(duelRoundMultiplier(4)).toBe(1);
    expect(duelRoundMultiplier(5)).toBe(1.5);
    expect(duelRoundMultiplier(8)).toBe(3);
  });
});
