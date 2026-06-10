-- Bound score values so forged rows can't exceed legitimate maxima (verified: max existing MP points 10064, max session 50000)
ALTER TABLE public.simple_multiplayer_scores
  ADD CONSTRAINT simple_mp_scores_points_range CHECK (points >= 0 AND points <= 12000),
  ADD CONSTRAINT simple_mp_scores_one_per_round UNIQUE (room_id, user_id, round_number);

-- 19 legacy rows have negative guess_time_seconds (old timer bug); NOT VALID grandfathers them, new rows are enforced
ALTER TABLE public.simple_multiplayer_scores
  ADD CONSTRAINT simple_mp_scores_time_nonneg CHECK (guess_time_seconds IS NULL OR guess_time_seconds >= 0) NOT VALID;

ALTER TABLE public.game_sessions
  ADD CONSTRAINT game_sessions_score_range CHECK (total_score IS NULL OR (total_score >= 0 AND total_score <= 60000)),
  ADD CONSTRAINT game_sessions_rounds_range CHECK (rounds_completed IS NULL OR (rounds_completed >= 0 AND rounds_completed <= 20));

-- One completed daily challenge per user per Eastern-Time day.
-- Forward-only (>= 2026-06-10 ET): 8 legacy duplicate pairs predate the cutoff.
CREATE UNIQUE INDEX uniq_daily_completion_per_user_day
  ON public.game_sessions (user_id, ((timezone('America/New_York', completed_at))::date))
  WHERE game_mode = 'daily' AND completed_at IS NOT NULL AND completed_at >= '2026-06-10 04:00:00+00';

-- Index the two unindexed foreign keys flagged by the performance advisor
CREATE INDEX IF NOT EXISTS idx_round_results_image_id ON public.round_results (image_id);
CREATE INDEX IF NOT EXISTS idx_simple_mp_players_user_id ON public.simple_multiplayer_players (user_id);

-- Deduplicate username indexes (keep user_profiles_username_key)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS unique_username;
DROP INDEX IF EXISTS public.unique_username;
DROP INDEX IF EXISTS public.idx_user_profiles_username;
