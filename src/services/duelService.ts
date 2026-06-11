// Thin client over the duel_* RPCs plus localStorage identity persistence.
// All game rules run server-side; this layer only ferries data.

import { supabase } from '@/integrations/supabase/client';
import type {
  DuelIdentity,
  DuelRoundResults,
  DuelRoundSummary,
  DuelSettings,
  DuelState,
} from '@/types/duel';

const IDENTITY_STORAGE_KEY = 'smrutimap_duel_identities';

type IdentityMap = Record<string, DuelIdentity>;

const readIdentities = (): IdentityMap => {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeIdentities = (map: IdentityMap) => {
  try {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full/unavailable: the player can still finish this session,
    // they just won't survive a refresh.
  }
};

export const getDuelIdentity = (code: string): DuelIdentity | null =>
  readIdentities()[code.toUpperCase()] ?? null;

export const storeDuelIdentity = (code: string, identity: DuelIdentity) => {
  const map = readIdentities();
  map[code.toUpperCase()] = identity;
  // Keep only the 20 most recent entries to bound storage.
  const codes = Object.keys(map);
  if (codes.length > 20) {
    codes.slice(0, codes.length - 20).forEach((c) => delete map[c]);
  }
  writeIdentities(map);
};

export const clearDuelIdentity = (code: string) => {
  const map = readIdentities();
  delete map[code.toUpperCase()];
  writeIdentities(map);
};

/** Unwraps a supabase query, throwing the server's message on error. */
const unwrap = async <T>(
  q: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T> => {
  const { data, error } = await q;
  if (error) {
    throw new Error(error.message || 'Something went wrong');
  }
  return data as T;
};

interface CreateJoinResponse {
  duel_id: string;
  code: string;
  player_id: string;
  token: string;
  server_time: string;
}

export const createDuel = async (
  displayName: string,
  settings: DuelSettings = {}
): Promise<CreateJoinResponse> => {
  const data = await unwrap<CreateJoinResponse>(
    supabase.rpc('duel_create', {
      p_display_name: displayName,
      p_settings: settings,
    })
  );
  storeDuelIdentity(data.code, {
    token: data.token,
    playerId: data.player_id,
    duelId: data.duel_id,
  });
  return data;
};

export const joinDuel = async (
  code: string,
  displayName: string
): Promise<CreateJoinResponse> => {
  const data = await unwrap<CreateJoinResponse>(
    supabase.rpc('duel_join', { p_code: code, p_display_name: displayName })
  );
  storeDuelIdentity(data.code, {
    token: data.token,
    playerId: data.player_id,
    duelId: data.duel_id,
  });
  return data;
};

export const startDuel = (token: string) =>
  unwrap<{ started: boolean; server_time: string }>(
    supabase.rpc('duel_start', { p_token: token })
  );

export interface SubmitGuessResponse {
  submitted: boolean;
  both_guessed?: boolean;
  timed_out?: boolean;
  server_time: string;
}

export const submitDuelGuess = (
  token: string,
  roundNumber: number,
  year: number,
  lat: number,
  lng: number
) =>
  unwrap<SubmitGuessResponse>(
    supabase.rpc('duel_submit_guess', {
      p_token: token,
      p_round_number: roundNumber,
      p_year: year,
      p_lat: lat,
      p_lng: lng,
    })
  );

export const resolveDuelRound = (duelId: string, roundNumber: number) =>
  unwrap<{ resolved: boolean; already_resolved?: boolean }>(
    supabase.rpc('duel_resolve_round', {
      p_duel_id: duelId,
      p_round_number: roundNumber,
    })
  );

export const advanceDuelRound = (duelId: string) =>
  unwrap<{ advanced?: boolean; finished?: boolean; round?: number }>(
    supabase.rpc('duel_advance_round', { p_duel_id: duelId })
  );

export const leaveDuel = (token: string) =>
  unwrap<{ left: boolean }>(supabase.rpc('duel_leave', { p_token: token }));

export const getDuelState = (code: string, token?: string | null) =>
  unwrap<DuelState>(
    supabase.rpc('duel_get_state', {
      p_code: code,
      ...(token ? { p_token: token } : {}),
    })
  );

export const getDuelRoundResults = (duelId: string, roundNumber: number) =>
  unwrap<DuelRoundResults>(
    supabase.rpc('duel_round_results', {
      p_duel_id: duelId,
      p_round_number: roundNumber,
    })
  );

export const getDuelRoundsSummary = (duelId: string) =>
  unwrap<DuelRoundSummary[]>(
    supabase.rpc('duel_rounds_summary', { p_duel_id: duelId })
  );

/** The image shown during a duel round. The answer (year/location) is never
 *  fetched here — it arrives only via duel_round_results after resolution. */
export interface DuelRoundImage {
  id: string;
  image_url: string;
  description: string;
}

export const getDuelRoundImage = (imageId: string) =>
  unwrap<DuelRoundImage>(
    supabase
      .from('game_images')
      .select('id, image_url, description')
      .eq('id', imageId)
      .single()
  );
