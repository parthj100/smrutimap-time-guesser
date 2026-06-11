import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { formatCountdown } from './DuelHud';
import {
  clearDuelIdentity,
  getDuelIdentity,
  storeDuelIdentity,
} from '@/services/duelService';

// The vitest environment is plain node; give the identity store a minimal
// in-memory localStorage.
beforeAll(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

describe('formatCountdown', () => {
  it('formats whole and partial seconds (ceil)', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(1)).toBe('0:01');
    expect(formatCountdown(15000)).toBe('0:15');
    expect(formatCountdown(14999)).toBe('0:15');
    expect(formatCountdown(60000)).toBe('1:00');
    expect(formatCountdown(125000)).toBe('2:05');
  });

  it('clamps negatives to zero', () => {
    expect(formatCountdown(-500)).toBe('0:00');
  });
});

describe('duel identity storage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('stores and retrieves identities case-insensitively', () => {
    storeDuelIdentity('abc123', { token: 't', playerId: 'p', duelId: 'd' });
    expect(getDuelIdentity('ABC123')).toEqual({
      token: 't',
      playerId: 'p',
      duelId: 'd',
    });
  });

  it('clears identities', () => {
    storeDuelIdentity('ABC123', { token: 't', playerId: 'p', duelId: 'd' });
    clearDuelIdentity('abc123');
    expect(getDuelIdentity('ABC123')).toBeNull();
  });

  it('keeps at most 20 identities', () => {
    for (let i = 0; i < 25; i++) {
      storeDuelIdentity(`CODE${String(i).padStart(2, '0')}`, {
        token: `t${i}`,
        playerId: `p${i}`,
        duelId: `d${i}`,
      });
    }
    const raw = JSON.parse(
      localStorage.getItem('smrutimap_duel_identities') || '{}'
    );
    expect(Object.keys(raw).length).toBeLessThanOrEqual(20);
    expect(getDuelIdentity('CODE24')).not.toBeNull();
  });
});
