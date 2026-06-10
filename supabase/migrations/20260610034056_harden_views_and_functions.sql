-- 1. Views: enforce querying user's RLS instead of creator's (advisor ERROR: security_definer_view)
ALTER VIEW public.leaderboards SET (security_invoker = on);
ALTER VIEW public.user_rankings SET (security_invoker = on);
ALTER VIEW public.daily_game_stats SET (security_invoker = on);

-- 2. Pin search_path on all functions (advisor WARN: function_search_path_mutable)
ALTER FUNCTION public.cleanup_expired_rooms() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_unique_room_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_leaderboard(text, text, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_multiplayer_game_images(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_by_username(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_room_player_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_user_last_active() SET search_path = public, pg_temp;

-- 3. Read-only RPCs don't need definer rights (they read publicly-readable tables)
ALTER FUNCTION public.get_leaderboard(text, text, text, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_user_by_username(text) SECURITY INVOKER;

-- 4. handle_new_user is an auth trigger; clients must not call it directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 5. Harden update_user_stats: auth check, atomic single-statement update (fixes lost-update race),
--    numeric average (was integer division), bounded input, pinned search_path
CREATE OR REPLACE FUNCTION public.update_user_stats(user_uuid uuid, game_score integer, rounds_completed integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR user_uuid IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'update_user_stats: not authorized';
    END IF;
    IF game_score < 0 OR game_score > 60000 THEN
        RAISE EXCEPTION 'update_user_stats: game_score out of range';
    END IF;

    UPDATE user_profiles SET
        total_games_played = COALESCE(total_games_played, 0) + 1,
        total_score = COALESCE(total_score, 0) + game_score,
        average_score = ROUND((COALESCE(total_score, 0) + game_score)::numeric / (COALESCE(total_games_played, 0) + 1), 2),
        best_single_game_score = GREATEST(COALESCE(best_single_game_score, 0), game_score),
        updated_at = now()
    WHERE user_id = user_uuid;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_user_stats(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_user_stats(uuid, integer, integer) TO authenticated;

-- 6. App uses PostgREST only; remove the GraphQL surface entirely
--    (eliminates pg_graphql_*_table_exposed warnings; re-enable any time with CREATE EXTENSION)
DROP EXTENSION IF EXISTS pg_graphql;
