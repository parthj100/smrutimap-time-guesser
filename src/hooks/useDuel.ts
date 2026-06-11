// Orchestrates a duel from the client side.
//
// The server is the source of truth: all deadlines live in the DB as
// timestamps and all transitions happen in RPCs. This hook
//   1. keeps a DuelState snapshot fresh (realtime postgres_changes signal a
//      debounced refetch, with slow polling as a safety net),
//   2. converts server timestamps into countdowns using a measured
//      client-server clock skew,
//   3. fires the idempotent resolve/advance RPCs when a countdown elapses
//      (whichever client gets there first wins; the others no-op), and
//   4. tracks presence so players can see who is connected.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { convertGoogleDriveUrl } from '@/utils/gameUtils';
import {
  advanceDuelRound,
  getDuelIdentity,
  getDuelRoundImage,
  getDuelRoundResults,
  getDuelRoundsSummary,
  getDuelState,
  leaveDuel,
  resolveDuelRound,
  startDuel,
  submitDuelGuess,
  type DuelRoundImage,
} from '@/services/duelService';
import type {
  DuelIdentity,
  DuelPhase,
  DuelPlayer,
  DuelRoundResults,
  DuelRoundSummary,
  DuelState,
} from '@/types/duel';

interface PendingGuess {
  year: number;
  lat: number;
  lng: number;
}

interface AttemptTracker {
  key: string;
  tries: number;
  lastTryAt: number;
  inFlight: boolean;
}

const freshAttempt = (key: string): AttemptTracker => ({
  key,
  tries: 0,
  lastTryAt: 0,
  inFlight: false,
});

const MAX_AUTO_RPC_TRIES = 10;
const AUTO_RPC_RETRY_MS = 1200;

export interface UseDuelResult {
  phase: DuelPhase;
  error: string | null;
  state: DuelState | null;
  players: DuelPlayer[];
  me: DuelPlayer | null;
  opponent: DuelPlayer | null;
  isPlayer: boolean;
  isSpectator: boolean;
  isHost: boolean;
  image: DuelRoundImage | null;
  roundResults: DuelRoundResults | null;
  summary: DuelRoundSummary[] | null;
  iHaveGuessed: boolean;
  opponentHasGuessed: boolean;
  submitting: boolean;
  starting: boolean;
  /** ms until the current round force-resolves (null when no active round). */
  roundRemainingMs: number | null;
  /** True once the opponent's first guess armed the short countdown. */
  guessWindowArmed: boolean;
  /** ms until the next round starts while results are shown. */
  resultsRemainingMs: number | null;
  onlinePlayerIds: Set<string>;
  spectatorCount: number;
  serverNow: () => number;
  submitGuess: (year: number, lat: number, lng: number) => Promise<void>;
  startMatch: () => Promise<void>;
  leave: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useDuel = (code: string | undefined): UseDuelResult => {
  const [state, setState] = useState<DuelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<DuelRoundImage | null>(null);
  const [roundResults, setRoundResults] = useState<DuelRoundResults | null>(null);
  const [summary, setSummary] = useState<DuelRoundSummary[] | null>(null);
  const [pendingGuess, setPendingGuess] = useState<PendingGuess | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [onlineKeys, setOnlineKeys] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const identityRef = useRef<DuelIdentity | null>(
    code ? getDuelIdentity(code) : null
  );
  const stateRef = useRef<DuelState | null>(null);
  const skewRef = useRef(0);
  const refreshSeq = useRef(0);
  const debounceRef = useRef<number | undefined>(undefined);
  const resolveAttempt = useRef<AttemptTracker>(freshAttempt(''));
  const advanceAttempt = useRef<AttemptTracker>(freshAttempt(''));

  const applyServerTime = useCallback((serverTime: string | undefined) => {
    if (!serverTime) return;
    const parsed = Date.parse(serverTime);
    if (!Number.isNaN(parsed)) {
      skewRef.current = parsed - Date.now();
    }
  }, []);

  const serverNow = useCallback(() => Date.now() + skewRef.current, []);

  const refreshState = useCallback(async () => {
    if (!code) return;
    const seq = ++refreshSeq.current;
    try {
      const next = await getDuelState(code, identityRef.current?.token);
      if (seq !== refreshSeq.current) return;
      applyServerTime(next.server_time);
      stateRef.current = next;
      setState(next);
      setError(null);
    } catch (e) {
      if (seq !== refreshSeq.current) return;
      if (!stateRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to load duel');
      }
    }
  }, [code, applyServerTime]);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void refreshState();
    }, 150);
  }, [refreshState]);

  // Initial load + refetch when the tab becomes visible again (mobile tabs
  // lose websockets in the background).
  useEffect(() => {
    identityRef.current = code ? getDuelIdentity(code) : null;
    stateRef.current = null;
    setState(null);
    setError(null);
    setImage(null);
    setRoundResults(null);
    setSummary(null);
    setPendingGuess(null);
    void refreshState();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshState();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearTimeout(debounceRef.current);
    };
  }, [code, refreshState]);

  const duelId = state?.duel.id;
  const duelStatus = state?.duel.status;

  // Realtime: any change to this duel's rows triggers a debounced refetch.
  useEffect(() => {
    if (!duelId) return;
    const channel = supabase
      .channel(`duel-db-${duelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duel_players', filter: `duel_id=eq.${duelId}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duel_rounds', filter: `duel_id=eq.${duelId}` },
        scheduleRefresh
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [duelId, scheduleRefresh]);

  // Presence: players track under their player id, spectators under spec-*.
  const myPlayerId = state?.me ?? null;
  useEffect(() => {
    if (!code || !duelId) return;
    const key =
      myPlayerId || `spec-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(`duel-presence-${code.toUpperCase()}`, {
      // realtime-js 2.11 only relays presence when explicitly enabled.
      config: { presence: { key, enabled: true } },
    });
    const sync = () => {
      setOnlineKeys(new Set(Object.keys(channel.presenceState())));
    };
    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ role: myPlayerId ? 'player' : 'spectator' });
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, duelId, myPlayerId]);

  // Polling safety net while the duel is live.
  useEffect(() => {
    if (!duelStatus || duelStatus === 'finished' || duelStatus === 'cancelled')
      return;
    const interval = duelStatus === 'active' ? 4000 : 5000;
    const t = window.setInterval(() => void refreshState(), interval);
    return () => window.clearInterval(t);
  }, [duelStatus, refreshState]);

  // Countdown ticker while a deadline is in play.
  const round = state?.round ?? null;
  const roundActive = duelStatus === 'active' && !!round;
  useEffect(() => {
    if (!roundActive) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(t);
  }, [roundActive]);

  // Round image (only id/url/description — never the answer).
  const imageId = round?.image_id;
  useEffect(() => {
    if (!imageId) return;
    let cancelled = false;
    getDuelRoundImage(imageId)
      .then((img) => {
        if (cancelled) return;
        setImage({ ...img, image_url: convertGoogleDriveUrl(img.image_url) });
      })
      .catch(() => {
        if (!cancelled) setImage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  // Once a round resolves, pull its full results (guesses + actual answer).
  const resolvedRoundNumber = round?.resolved_at ? round.round_number : null;
  useEffect(() => {
    if (!duelId || resolvedRoundNumber == null) return;
    let cancelled = false;
    getDuelRoundResults(duelId, resolvedRoundNumber)
      .then((r) => {
        if (cancelled) return;
        applyServerTime(r.server_time);
        setRoundResults(r);
        setPendingGuess(null);
      })
      .catch(() => {
        // transient; polling will retry via state change
      });
    return () => {
      cancelled = true;
    };
  }, [duelId, resolvedRoundNumber, applyServerTime]);

  // New round: clear the previous round's artifacts.
  const currentRoundNumber = round?.round_number;
  useEffect(() => {
    setPendingGuess(null);
    setRoundResults((prev) =>
      prev && prev.round_number !== currentRoundNumber ? null : prev
    );
  }, [currentRoundNumber]);

  // Match summary once the duel ends.
  useEffect(() => {
    if (!duelId) return;
    if (duelStatus !== 'finished' && duelStatus !== 'cancelled') return;
    let cancelled = false;
    getDuelRoundsSummary(duelId)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [duelId, duelStatus]);

  // ---- Deadline math -------------------------------------------------------
  const effectiveDeadlineMs = useMemo(() => {
    if (!round || round.resolved_at) return null;
    const base = Date.parse(round.base_deadline);
    const guess = round.guess_deadline ? Date.parse(round.guess_deadline) : null;
    return guess != null ? Math.min(base, guess) : base;
  }, [round]);

  const nowMs = serverNow();
  const roundRemainingMs =
    effectiveDeadlineMs != null ? Math.max(0, effectiveDeadlineMs - nowMs) : null;
  const resultsRemainingMs =
    round?.resolved_at && round.next_round_at
      ? Math.max(0, Date.parse(round.next_round_at) - nowMs)
      : null;

  // ---- Auto resolve / advance (idempotent server-side) ---------------------
  const runThrottledAttempt = useCallback(
    (
      tracker: React.MutableRefObject<AttemptTracker>,
      key: string,
      fn: () => Promise<unknown>
    ) => {
      if (tracker.current.key !== key) tracker.current = freshAttempt(key);
      const t = tracker.current;
      if (t.inFlight || t.tries >= MAX_AUTO_RPC_TRIES) return;
      if (Date.now() - t.lastTryAt < AUTO_RPC_RETRY_MS) return;
      t.inFlight = true;
      t.tries += 1;
      t.lastTryAt = Date.now();
      fn()
        .then(() => void refreshState())
        .catch(() => {
          // "not ready" or a race with the other client; bounded retry above
        })
        .finally(() => {
          t.inFlight = false;
        });
    },
    [refreshState]
  );

  useEffect(() => {
    if (!state || state.duel.status !== 'active' || !round) return;
    if (!round.resolved_at && effectiveDeadlineMs != null) {
      if (serverNow() >= effectiveDeadlineMs + 250) {
        runThrottledAttempt(resolveAttempt, `resolve-${round.id}`, () =>
          resolveDuelRound(state.duel.id, round.round_number)
        );
      }
    }
    if (round.resolved_at && round.next_round_at) {
      if (serverNow() >= Date.parse(round.next_round_at)) {
        runThrottledAttempt(advanceAttempt, `advance-${round.id}`, () =>
          advanceDuelRound(state.duel.id)
        );
      }
    }
  });

  // ---- Derived view model --------------------------------------------------
  const players = useMemo(() => state?.players ?? [], [state?.players]);
  const me = useMemo(
    () => players.find((p) => p.id === state?.me) ?? null,
    [players, state?.me]
  );
  const opponent = useMemo(
    () => (me ? players.find((p) => p.id !== me.id) ?? null : null),
    [players, me]
  );

  const iHaveGuessed =
    !!pendingGuess ||
    !!state?.my_guess ||
    (!!state?.me && !!round?.guessed_player_ids?.includes(state.me));
  const opponentHasGuessed =
    !!opponent && !!round?.guessed_player_ids?.includes(opponent.id);
  const guessWindowArmed = !!round?.guess_deadline && !round?.resolved_at;

  const phase: DuelPhase = !state
    ? error
      ? 'error'
      : 'loading'
    : state.duel.status === 'waiting'
      ? 'lobby'
      : state.duel.status === 'active'
        ? round?.resolved_at
          ? 'results'
          : 'round'
        : 'over';

  const onlinePlayerIds = useMemo(() => {
    const ids = new Set<string>();
    players.forEach((p) => {
      if (onlineKeys.has(p.id)) ids.add(p.id);
    });
    return ids;
  }, [players, onlineKeys]);

  const spectatorCount = useMemo(
    () => [...onlineKeys].filter((k) => k.startsWith('spec-')).length,
    [onlineKeys]
  );

  // ---- Actions -------------------------------------------------------------
  const submitGuess = useCallback(
    async (year: number, lat: number, lng: number) => {
      const identity = identityRef.current;
      const current = stateRef.current;
      if (!identity || !current?.round) {
        throw new Error('You are not a player in this duel');
      }
      setSubmitting(true);
      setPendingGuess({ year, lat, lng });
      try {
        const res = await submitDuelGuess(
          identity.token,
          current.round.round_number,
          year,
          lat,
          lng
        );
        applyServerTime(res.server_time);
        if (!res.submitted) {
          setPendingGuess(null);
        }
        await refreshState();
        if (!res.submitted) {
          throw new Error("Time ran out before your guess was locked in");
        }
      } catch (e) {
        if (e instanceof Error && /time ran out/i.test(e.message)) throw e;
        setPendingGuess(null);
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [applyServerTime, refreshState]
  );

  const startMatch = useCallback(async () => {
    const identity = identityRef.current;
    if (!identity) throw new Error('Only the host can start the duel');
    setStarting(true);
    try {
      const res = await startDuel(identity.token);
      applyServerTime(res.server_time);
      await refreshState();
    } finally {
      setStarting(false);
    }
  }, [applyServerTime, refreshState]);

  const leave = useCallback(async () => {
    const identity = identityRef.current;
    if (!identity) return;
    await leaveDuel(identity.token);
    await refreshState();
  }, [refreshState]);

  return {
    phase,
    error,
    state,
    players,
    me,
    opponent,
    isPlayer: !!me,
    isSpectator: !!state && !me,
    isHost: !!me?.is_host,
    image,
    roundResults,
    summary,
    iHaveGuessed,
    opponentHasGuessed,
    submitting,
    starting,
    roundRemainingMs,
    guessWindowArmed,
    resultsRemainingMs,
    onlinePlayerIds,
    spectatorCount,
    serverNow,
    submitGuess,
    startMatch,
    leave,
    refresh: refreshState,
  };
};
