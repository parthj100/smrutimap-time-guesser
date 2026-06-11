// Types for the Duels mode. These mirror the jsonb payloads returned by the
// duel_* RPCs (see supabase/migrations/20260611010351_duels_schema_and_rpcs.sql).

export type DuelStatus = 'waiting' | 'active' | 'finished' | 'cancelled';

export type DuelFinishReason =
  | 'knockout'
  | 'forfeit'
  | 'draw'
  | 'exhausted'
  | 'abandoned';

export interface DuelInfo {
  id: string;
  code: string;
  status: DuelStatus;
  current_round: number;
  starting_hp: number;
  guess_window_seconds: number;
  round_seconds: number;
  results_seconds: number;
  winner_player_id: string | null;
  finish_reason: DuelFinishReason | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DuelPlayer {
  id: string;
  display_name: string;
  is_host: boolean;
  hp: number;
  joined_at: string;
}

export interface DuelRoundInfo {
  id: string;
  round_number: number;
  image_id: string;
  multiplier: number;
  started_at: string;
  base_deadline: string;
  guess_deadline: string | null;
  resolved_at: string | null;
  next_round_at: string | null;
  winner_player_id: string | null;
  score_diff: number | null;
  damage: number | null;
  guessed_player_ids: string[];
}

export interface DuelGuess {
  id?: string;
  player_id: string;
  guessed_year: number | null;
  guessed_lat: number | null;
  guessed_lng: number | null;
  year_score: number;
  location_score: number;
  total_score: number;
  distance_km: number | null;
  is_timeout: boolean;
  submitted_at?: string;
}

export interface DuelState {
  duel: DuelInfo;
  players: DuelPlayer[];
  /** My player id when a valid token was supplied, else null (spectator). */
  me: string | null;
  round: DuelRoundInfo | null;
  my_guess: DuelGuess | null;
  server_time: string;
}

export interface DuelRoundResultGuess extends DuelGuess {
  display_name: string;
}

export interface DuelRoundResults {
  round_number: number;
  multiplier: number;
  winner_player_id: string | null;
  score_diff: number | null;
  damage: number | null;
  resolved_at: string;
  next_round_at: string | null;
  actual: {
    year: number;
    lat: number;
    lng: number;
    location_name: string;
    description: string;
  };
  guesses: DuelRoundResultGuess[];
  players: { id: string; hp: number }[];
  server_time: string;
}

export interface DuelRoundSummary {
  round_number: number;
  multiplier: number;
  winner_player_id: string | null;
  score_diff: number | null;
  damage: number | null;
  image_id: string;
  guesses: {
    player_id: string;
    total_score: number;
    year_score: number;
    location_score: number;
    is_timeout: boolean;
  }[];
}

export interface DuelIdentity {
  token: string;
  playerId: string;
  duelId: string;
}

export interface DuelSettings {
  starting_hp?: number;
  guess_window_seconds?: number;
  round_seconds?: number;
}

/** High-level UI phase derived from duel + round state. */
export type DuelPhase =
  | 'loading'
  | 'error'
  | 'lobby'
  | 'round'
  | 'results'
  | 'over';
