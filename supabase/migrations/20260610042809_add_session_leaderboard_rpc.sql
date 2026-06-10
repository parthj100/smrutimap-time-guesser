-- Server-side leaderboard aggregation. Replaces the client fetching up to 2000
-- raw game_sessions rows (with a silent cap) plus a second user_profiles query,
-- then grouping in JavaScript. The caller still computes the timeframe window
-- (preserving its local-timezone semantics) and passes it as start_ts/end_ts.
-- SECURITY INVOKER: relies on the existing public-read RLS on completed sessions
-- and leaderboard-visible profiles, so it grants no extra access.
CREATE OR REPLACE FUNCTION public.get_session_leaderboard(
  start_ts timestamptz DEFAULT NULL,
  end_ts timestamptz DEFAULT NULL,
  game_mode_filter text DEFAULT 'all',
  limit_count int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  center text,
  total_games_played bigint,
  total_score bigint,
  best_single_game_score int,
  average_score numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    up.id,
    up.user_id,
    up.username,
    up.display_name,
    up.avatar_url,
    up.center,
    count(gs.id)::bigint AS total_games_played,
    coalesce(sum(gs.total_score), 0)::bigint AS total_score,
    coalesce(max(gs.total_score), 0)::int AS best_single_game_score,
    coalesce(round(avg(gs.total_score), 2), 0)::numeric AS average_score
  FROM game_sessions gs
  JOIN user_profiles up ON up.user_id = gs.user_id
  WHERE gs.completed_at IS NOT NULL
    AND (start_ts IS NULL OR gs.completed_at >= start_ts)
    AND (end_ts IS NULL OR gs.completed_at < end_ts)
    AND (game_mode_filter = 'all' OR gs.game_mode = game_mode_filter)
  GROUP BY up.id, up.user_id, up.username, up.display_name, up.avatar_url, up.center
  ORDER BY total_score DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_leaderboard(timestamptz, timestamptz, text, int) TO anon, authenticated;
