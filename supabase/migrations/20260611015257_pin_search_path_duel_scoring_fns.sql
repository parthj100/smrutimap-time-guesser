-- Pin search_path on the pure duel scoring/helper functions (advisor
-- function_search_path_mutable; project convention since 20260610034056).
alter function public.duel_year_score(int, int) set search_path = public, pg_temp;
alter function public.duel_distance_km(float8, float8, float8, float8) set search_path = public, pg_temp;
alter function public.duel_location_score_from_km(float8) set search_path = public, pg_temp;
alter function public.duel_round_multiplier(int) set search_path = public, pg_temp;
alter function public._duel_effective_deadline(public.duel_rounds) set search_path = public, pg_temp;
