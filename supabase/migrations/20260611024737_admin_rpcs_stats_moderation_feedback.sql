-- ============================================================================
-- ADMIN RPCs — server-authoritative admin surface.
--
-- Why: the dashboard read paths fired ~10 client round-trips per refresh and
-- aggregated in JS; user moderation (ban / reset stats) wrote straight to
-- user_profiles where only a "users update OWN row" RLS policy exists, so it
-- silently no-op'd; and feedback/photo submissions were unreadable by admins
-- (owner-only SELECT). These SECURITY DEFINER functions centralise the work,
-- each gated by _is_admin(), mirroring the project's hardening convention
-- (search_path pinned; execute granted to authenticated only).
--
-- NOTE: admin_list_feedback / admin_set_feedback_status were corrected in the
-- follow-up migration 20260611025103 to match the feedback.status CHECK enum
-- (open | in_progress | resolved | closed). Kept here as originally applied.
-- ============================================================================

create or replace function public._is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;
revoke execute on function public._is_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Overview stats: one call replaces ~10 client queries. Eastern-time "today"
-- to match the existing visitor-tracking convention.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_today date := (now() at time zone 'America/New_York')::date;
  v jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from public.user_profiles),
    'totalGamesPlayed', (select count(*) from public.game_sessions),
    'totalScore', (select coalesce(sum(total_score), 0) from public.user_profiles),
    'activeUsers', (select count(distinct user_id) from public.game_sessions
                    where created_at >= now() - interval '7 days'),
    'todayVisitors', (select count(*) from public.analytics_visitors where visit_date = v_today),
    'todayUniqueVisitors', (select count(distinct session_id) from public.analytics_visitors where visit_date = v_today),
    'todayAnonymousVisitors', (select count(distinct session_id) from public.analytics_visitors where visit_date = v_today and user_id is null),
    'todayRegisteredVisitors', (select count(distinct session_id) from public.analytics_visitors where visit_date = v_today and user_id is not null),
    'todayGamesPlayed', (select count(*) from public.game_sessions
                         where (created_at at time zone 'America/New_York')::date = v_today),
    'todayNewUsers', (select count(*) from public.user_profiles
                      where (created_at at time zone 'America/New_York')::date = v_today)
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Recent activity: merge of registrations / games / rooms / visits, sorted
-- server-side. Last 24h, capped by p_limit.
-- ---------------------------------------------------------------------------
create or replace function public.admin_recent_activity(p_limit int default 10)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 50);
  v_since timestamptz := now() - interval '24 hours';
  v jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with events as (
    select 'user_registered' as type, 'New user registered' as title,
           coalesce(display_name, username) || ' joined the game' as description,
           created_at as ts, user_id::text as user_id, 'user_' || user_id as id
    from public.user_profiles where created_at >= v_since
    union all
    select 'game_completed', 'Game completed',
           'Score: ' || total_score || ' points', created_at, user_id::text, 'game_' || id
    from public.game_sessions where created_at >= v_since
    union all
    select 'room_created', 'Multiplayer room created',
           'Room code: ' || room_code, created_at, host_user_id::text, 'room_' || id
    from public.simple_multiplayer_rooms where created_at >= v_since
    union all
    select 'visitor', 'Page visited',
           (case when user_id is null then 'Anonymous' else 'Registered user' end)
             || ' visited ' || page_visited,
           visit_time, user_id::text, 'visitor_' || id
    from public.analytics_visitors where visit_time >= v_since
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'type', type, 'title', title,
    'description', description, 'timestamp', ts, 'userId', user_id
  ) order by ts desc), '[]'::jsonb)
  into v
  from (select * from events order by ts desc limit v_limit) e;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Daily summary: real per-day aggregation over the window (replaces the
-- client-side fallback loop). returning_visitors = sessions seen that day that
-- also visited on an earlier day within the window.
-- ---------------------------------------------------------------------------
create or replace function public.admin_daily_summary(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_start date := (now() at time zone 'America/New_York')::date - v_days;
  v jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with v_in_window as (
    select session_id, visit_date, user_id
    from public.analytics_visitors
    where visit_date >= v_start
  ),
  first_seen as (
    select session_id, min(visit_date) as first_date
    from v_in_window group by session_id
  ),
  per_day as (
    select w.visit_date as date,
           count(*) as total_visitors,
           count(distinct w.session_id) as unique_visitors,
           count(distinct w.session_id) filter (where fs.first_date < w.visit_date) as returning_visitors
    from v_in_window w
    join first_seen fs on fs.session_id = w.session_id
    group by w.visit_date
  ),
  games as (
    select (created_at at time zone 'America/New_York')::date as date, count(*) as games_played
    from public.game_sessions
    where (created_at at time zone 'America/New_York')::date >= v_start
    group by 1
  ),
  newu as (
    select (created_at at time zone 'America/New_York')::date as date, count(*) as new_users
    from public.user_profiles
    where (created_at at time zone 'America/New_York')::date >= v_start
    group by 1
  ),
  dates as (
    select date from per_day
    union select date from games
    union select date from newu
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', 'day_' || d.date,
    'date', d.date,
    'total_visitors', coalesce(pd.total_visitors, 0),
    'unique_visitors', coalesce(pd.unique_visitors, 0),
    'returning_visitors', coalesce(pd.returning_visitors, 0),
    'new_users', coalesce(nu.new_users, 0),
    'games_played', coalesce(g.games_played, 0),
    'created_at', now()
  ) order by d.date desc), '[]'::jsonb)
  into v
  from dates d
  left join per_day pd on pd.date = d.date
  left join games g on g.date = d.date
  left join newu nu on nu.date = d.date;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- User list with REAL last_active, server-side search + pagination + total.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search text default '', p_limit int default 50, p_offset int default 0
)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_search text := '%' || btrim(coalesce(p_search, '')) || '%';
  v_total int;
  v_rows jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select count(*) into v_total
  from public.user_profiles
  where username ilike v_search or coalesce(display_name, '') ilike v_search;

  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', user_id,
    'username', username,
    'displayName', coalesce(display_name, username),
    'gamesPlayed', coalesce(total_games_played, 0),
    'totalScore', coalesce(total_score, 0),
    'averageScore', case when coalesce(total_games_played, 0) > 0
                         then round(total_score::numeric / total_games_played)::int else 0 end,
    'lastActive', coalesce(last_active, created_at),
    'isAdmin', coalesce(is_admin, false),
    'banned', coalesce(banned, false),
    'bannedReason', banned_reason
  ) order by total_score desc nulls last), '[]'::jsonb)
  into v_rows
  from (
    select * from public.user_profiles
    where username ilike v_search or coalesce(display_name, '') ilike v_search
    order by total_score desc nulls last
    limit v_limit offset v_offset
  ) u;

  return jsonb_build_object('total', v_total, 'users', v_rows);
end $$;

-- ---------------------------------------------------------------------------
-- Moderation: ban/unban and reset stats. These run as the function owner, so
-- they bypass the "users update own row" policy that was silently blocking the
-- admin. Guards: can't act on yourself or another admin.
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_ban(
  p_target uuid, p_banned boolean, p_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_target public.user_profiles%rowtype;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_target = auth.uid() then
    raise exception 'You cannot ban yourself' using errcode = '22023';
  end if;
  select * into v_target from public.user_profiles where user_id = p_target;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if v_target.is_admin then
    raise exception 'You cannot ban another admin' using errcode = '42501';
  end if;

  update public.user_profiles
  set banned = p_banned,
      banned_at = case when p_banned then now() else null end,
      banned_reason = case when p_banned then left(coalesce(p_reason, ''), 200) else null end,
      updated_at = now()
  where user_id = p_target;

  return jsonb_build_object('ok', true, 'banned', p_banned);
end $$;

create or replace function public.admin_reset_user_stats(p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.user_profiles where user_id = p_target) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  update public.user_profiles
  set total_score = 0, total_games_played = 0,
      average_score = 0, best_single_game_score = 0, updated_at = now()
  where user_id = p_target;

  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Safe maintenance: prune old analytics rows only (never game_sessions, which
-- feed the leaderboard). Returns the number deleted.
-- ---------------------------------------------------------------------------
create or replace function public.admin_clean_old_analytics(p_days int default 90)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_days int := greatest(coalesce(p_days, 90), 7);
  v_deleted int;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with del as (
    delete from public.analytics_visitors
    where visit_time < now() - make_interval(days => v_days)
    returning 1
  )
  select count(*) into v_deleted from del;

  return jsonb_build_object('deleted', v_deleted, 'days', v_days);
end $$;

-- ---------------------------------------------------------------------------
-- Feedback: list + triage. Previously unreadable by admins (owner-only RLS).
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_feedback(p_limit int default 100)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
  v jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'category', category, 'message', message, 'email', email,
    'status', coalesce(status, 'new'), 'admin_notes', admin_notes,
    'page_url', page_url, 'user_id', user_id, 'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v
  from (select * from public.feedback order by created_at desc limit v_limit) f;
  return v;
end $$;

create or replace function public.admin_set_feedback_status(
  p_id uuid, p_status text, p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_status not in ('new', 'reviewed', 'resolved') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  update public.feedback
  set status = p_status,
      admin_notes = coalesce(p_notes, admin_notes),
      updated_at = now()
  where id = p_id;
  if not found then
    raise exception 'Feedback not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

-- ---------------------------------------------------------------------------
-- Grants: admins are always signed in, so authenticated only (never anon).
-- ---------------------------------------------------------------------------
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_recent_activity(int) to authenticated;
grant execute on function public.admin_daily_summary(int) to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_user_ban(uuid, boolean, text) to authenticated;
grant execute on function public.admin_reset_user_stats(uuid) to authenticated;
grant execute on function public.admin_clean_old_analytics(int) to authenticated;
grant execute on function public.admin_list_feedback(int) to authenticated;
grant execute on function public.admin_set_feedback_status(uuid, text, text) to authenticated;
