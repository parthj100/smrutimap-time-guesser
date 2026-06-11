-- ============================================================================
-- DUELS: server-authoritative 1v1 competitive mode (GeoGuessr-style)
--
-- Identity: every player gets a secret uuid token at create/join time, stored
-- only in duel_player_secrets (RLS on, no policies). All writes go through
-- SECURITY DEFINER RPCs that validate the token — works for guests and
-- signed-in users alike, and scores/damage are computed server-side so
-- clients cannot forge them.
--
-- Visibility: duels / duel_players / duel_rounds are publicly readable
-- (spectators + realtime). duel_guesses is NOT readable: opponents cannot see
-- each other's pins before a round resolves; results come from RPCs that only
-- serve resolved rounds.
--
-- NOTE: duel_submit_guess below was superseded by 20260611010610 (late submits
-- must resolve the round instead of raising, since RAISE rolls back the
-- resolve). Kept here as originally applied.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.duels (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  status               text not null default 'waiting'
                       check (status in ('waiting','active','finished','cancelled')),
  current_round        int  not null default 0 check (current_round >= 0),
  starting_hp          int  not null default 12000 check (starting_hp between 1000 and 50000),
  guess_window_seconds int  not null default 15 check (guess_window_seconds between 5 and 60),
  round_seconds        int  not null default 120 check (round_seconds between 30 and 600),
  results_seconds      int  not null default 12 check (results_seconds between 5 and 60),
  winner_player_id     uuid,
  finish_reason        text check (finish_reason in ('knockout','forfeit','draw','exhausted','abandoned')),
  created_at           timestamptz not null default now(),
  started_at           timestamptz,
  finished_at          timestamptz,
  updated_at           timestamptz not null default now()
);

create table public.duel_players (
  id           uuid primary key default gen_random_uuid(),
  duel_id      uuid not null references public.duels(id) on delete cascade,
  user_id      uuid,
  display_name text not null check (char_length(display_name) between 1 and 20),
  is_host      boolean not null default false,
  hp           int not null check (hp >= 0),
  joined_at    timestamptz not null default now()
);
create index duel_players_duel_idx on public.duel_players(duel_id);

alter table public.duels
  add constraint duels_winner_fk foreign key (winner_player_id)
  references public.duel_players(id) on delete set null;

-- Secret per-player auth tokens. RLS on, no policies: only definer RPCs read it.
create table public.duel_player_secrets (
  player_id uuid primary key references public.duel_players(id) on delete cascade,
  token     uuid not null unique default gen_random_uuid()
);

-- Pre-picked image sequence per duel, hidden from clients so upcoming rounds
-- cannot be looked up in advance.
create table public.duel_secrets (
  duel_id   uuid primary key references public.duels(id) on delete cascade,
  image_ids uuid[] not null
);

create table public.duel_rounds (
  id               uuid primary key default gen_random_uuid(),
  duel_id          uuid not null references public.duels(id) on delete cascade,
  round_number     int  not null check (round_number >= 1),
  image_id         uuid not null references public.game_images(id),
  multiplier       numeric(6,2) not null default 1.0 check (multiplier >= 1.0),
  started_at       timestamptz not null default now(),
  base_deadline    timestamptz not null,
  guess_deadline   timestamptz,          -- set when the first guess lands
  resolved_at      timestamptz,
  next_round_at    timestamptz,          -- when the next round may be created
  winner_player_id uuid references public.duel_players(id) on delete set null,
  score_diff       int check (score_diff is null or score_diff >= 0),
  damage           int check (damage is null or damage >= 0),
  unique (duel_id, round_number)
);
create index duel_rounds_duel_idx on public.duel_rounds(duel_id);

create table public.duel_guesses (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references public.duel_rounds(id) on delete cascade,
  duel_id        uuid not null references public.duels(id) on delete cascade,
  player_id      uuid not null references public.duel_players(id) on delete cascade,
  guessed_year   int check (guessed_year is null or guessed_year between 1800 and 2100),
  guessed_lat    double precision check (guessed_lat is null or (guessed_lat between -90 and 90)),
  guessed_lng    double precision check (guessed_lng is null or (guessed_lng between -180 and 180)),
  year_score     int not null check (year_score between 0 and 5000),
  location_score int not null check (location_score between 0 and 5000),
  total_score    int not null check (total_score between 0 and 10000),
  distance_km    double precision,
  is_timeout     boolean not null default false,
  submitted_at   timestamptz not null default now(),
  unique (round_id, player_id),
  check (
    (is_timeout and guessed_year is null and guessed_lat is null and guessed_lng is null)
    or (not is_timeout and guessed_year is not null and guessed_lat is not null and guessed_lng is not null)
  )
);
create index duel_guesses_duel_idx on public.duel_guesses(duel_id);

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.duels enable row level security;
alter table public.duel_players enable row level security;
alter table public.duel_rounds enable row level security;
alter table public.duel_guesses enable row level security;
alter table public.duel_player_secrets enable row level security;
alter table public.duel_secrets enable row level security;

create policy "duels_public_read" on public.duels
  for select to anon, authenticated using (true);
create policy "duel_players_public_read" on public.duel_players
  for select to anon, authenticated using (true);
create policy "duel_rounds_public_read" on public.duel_rounds
  for select to anon, authenticated using (true);
-- duel_guesses / duel_player_secrets / duel_secrets: RLS on, no policies.

revoke all on public.duel_player_secrets from anon, authenticated;
revoke all on public.duel_secrets from anon, authenticated;
revoke all on public.duel_guesses from anon, authenticated;
revoke insert, update, delete on public.duels from anon, authenticated;
revoke insert, update, delete on public.duel_players from anon, authenticated;
revoke insert, update, delete on public.duel_rounds from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.duels;
alter publication supabase_realtime add table public.duel_players;
alter publication supabase_realtime add table public.duel_rounds;
alter table public.duels replica identity full;
alter table public.duel_players replica identity full;
alter table public.duel_rounds replica identity full;

-- ---------------------------------------------------------------------------
-- Scoring functions — EXACT ports of src/utils/scoringSystem.ts.
-- numeric (not float8) rounding: Postgres round(numeric) rounds .5 away from
-- zero, matching JS Math.round for positive values; round(float8) would
-- round half-to-even and diverge.
-- ---------------------------------------------------------------------------
create or replace function public.duel_year_score(p_actual int, p_guessed int)
returns int language sql immutable as $$
  select case
    when d = 0 then 100
    when d <= 2 then round((100 - d * 5)::numeric)::int
    when d <= 8 then round((90 - (d - 2) * 4)::numeric)::int
    when d <= 20 then round(66 - (d - 8) * 2.5)::int
    when d <= 40 then round(36 - (d - 20) * 1.2)::int
    when d <= 80 then round(12 - (d - 40) * 0.15)::int
    else greatest(1, round(6 - (d - 80) * 0.05)::int)
  end
  from (select abs(p_actual - p_guessed) as d) t;
$$;

create or replace function public.duel_distance_km(
  lat1 float8, lng1 float8, lat2 float8, lng2 float8
) returns float8 language sql immutable as $$
  select 6371 * 2 * atan2(sqrt(a), sqrt(1 - a)) from (
    select power(sin(radians(lat2 - lat1) / 2), 2)
         + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2) as a
  ) t;
$$;

create or replace function public.duel_location_score_from_km(p_km float8)
returns int language plpgsql immutable as $$
declare
  m numeric := (p_km * 0.621371)::numeric;
begin
  if m < 5 then return 100;
  elsif m < 25 then return round(100 - (m - 5) * 1.5)::int;
  elsif m < 75 then return round(70 - (m - 25) * 0.8)::int;
  elsif m < 200 then return round(30 - (m - 75) * 0.12)::int;
  elsif m < 500 then return round(15 - (m - 200) * 0.03)::int;
  elsif m < 1500 then return round(6 - (m - 500) * 0.003)::int;
  else return greatest(1, round(3 - (m - 1500) * 0.001)::int);
  end if;
end $$;

-- Damage multiplier ramp: rounds 1-4 at 1.0x, then +0.5x per round.
create or replace function public.duel_round_multiplier(p_round int)
returns numeric language sql immutable as $$
  select (case when p_round <= 4 then 1.0 else 1.0 + 0.5 * (p_round - 4) end)::numeric(6,2);
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers (no API access)
-- ---------------------------------------------------------------------------
create or replace function public._duel_player_by_token(p_token uuid)
returns public.duel_players
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v public.duel_players%rowtype;
begin
  if p_token is null then
    raise exception 'Missing player token' using errcode = '28000';
  end if;
  select p.* into v
  from public.duel_players p
  join public.duel_player_secrets s on s.player_id = p.id
  where s.token = p_token;
  if not found then
    raise exception 'Invalid player token' using errcode = '28000';
  end if;
  return v;
end $$;

-- Creates round p_round_number for a duel. Caller must hold the duel row lock.
-- If the image sequence is exhausted, finishes the duel instead.
create or replace function public._duel_create_round(p_duel_id uuid, p_round_number int)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels%rowtype;
  v_image_id uuid;
  v_winner uuid;
begin
  select * into v_duel from public.duels where id = p_duel_id;

  select image_ids[p_round_number] into v_image_id
  from public.duel_secrets where duel_id = p_duel_id;

  if v_image_id is null then
    -- Out of images: highest HP wins, equal HP is a draw.
    select id into v_winner from public.duel_players
    where duel_id = p_duel_id
    order by hp desc, joined_at asc limit 1;
    if (select count(distinct hp) from public.duel_players where duel_id = p_duel_id) = 1 then
      v_winner := null;
    end if;
    update public.duels
    set status = 'finished',
        winner_player_id = v_winner,
        finish_reason = case when v_winner is null then 'draw' else 'exhausted' end,
        finished_at = now(),
        updated_at = now()
    where id = p_duel_id;
    return;
  end if;

  insert into public.duel_rounds (duel_id, round_number, image_id, multiplier, started_at, base_deadline)
  values (
    p_duel_id,
    p_round_number,
    v_image_id,
    public.duel_round_multiplier(p_round_number),
    now(),
    now() + make_interval(secs => v_duel.round_seconds)
  );
end $$;

-- Resolves a round: synthesizes timeout guesses, applies damage, finishes the
-- duel on knockout. Caller must hold the round row lock and have verified the
-- round is resolvable (both guessed, or past its effective deadline).
create or replace function public._duel_resolve_round(p_round_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_round public.duel_rounds%rowtype;
  v_duel public.duels%rowtype;
  v_player record;
  v_top record;
  v_bottom record;
  v_diff int;
  v_damage int;
  v_loser_hp int;
begin
  select * into v_round from public.duel_rounds where id = p_round_id;
  if v_round.resolved_at is not null then
    return;
  end if;
  select * into v_duel from public.duels where id = v_round.duel_id;

  -- Synthesize zero-score timeout guesses for players who never submitted.
  for v_player in
    select p.id from public.duel_players p
    where p.duel_id = v_round.duel_id
      and not exists (
        select 1 from public.duel_guesses g
        where g.round_id = p_round_id and g.player_id = p.id
      )
  loop
    insert into public.duel_guesses
      (round_id, duel_id, player_id, year_score, location_score, total_score, is_timeout)
    values (p_round_id, v_round.duel_id, v_player.id, 0, 0, 0, true);
  end loop;

  select g.player_id, g.total_score into v_top
  from public.duel_guesses g join public.duel_players p on p.id = g.player_id
  where g.round_id = p_round_id
  order by g.total_score desc, p.joined_at asc limit 1;

  select g.player_id, g.total_score into v_bottom
  from public.duel_guesses g join public.duel_players p on p.id = g.player_id
  where g.round_id = p_round_id
  order by g.total_score asc, p.joined_at desc limit 1;

  v_diff := v_top.total_score - v_bottom.total_score;

  if v_diff = 0 then
    -- Tie round: no damage.
    update public.duel_rounds
    set resolved_at = now(), winner_player_id = null, score_diff = 0, damage = 0,
        next_round_at = now() + make_interval(secs => v_duel.results_seconds)
    where id = p_round_id;
    return;
  end if;

  v_damage := round(v_diff * v_round.multiplier)::int;

  update public.duel_players
  set hp = greatest(0, hp - v_damage)
  where id = v_bottom.player_id
  returning hp into v_loser_hp;

  update public.duel_rounds
  set resolved_at = now(),
      winner_player_id = v_top.player_id,
      score_diff = v_diff,
      damage = v_damage,
      next_round_at = case when v_loser_hp > 0
                           then now() + make_interval(secs => v_duel.results_seconds)
                           else null end
  where id = p_round_id;

  if v_loser_hp = 0 then
    update public.duels
    set status = 'finished',
        winner_player_id = v_top.player_id,
        finish_reason = 'knockout',
        finished_at = now(),
        updated_at = now()
    where id = v_round.duel_id and status = 'active';
  end if;
end $$;

-- Effective deadline of a round: base deadline, tightened by the post-first-
-- guess window when set.
create or replace function public._duel_effective_deadline(r public.duel_rounds)
returns timestamptz language sql immutable as $$
  select least(r.base_deadline, coalesce(r.guess_deadline, 'infinity'::timestamptz));
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Create a duel lobby. Returns the player's secret token — store it client-side.
create or replace function public.duel_create(p_display_name text, p_settings jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := left(btrim(coalesce(p_display_name, '')), 20);
  v_hp int := coalesce(nullif(p_settings->>'starting_hp', '')::int, 12000);
  v_window int := coalesce(nullif(p_settings->>'guess_window_seconds', '')::int, 15);
  v_round_secs int := coalesce(nullif(p_settings->>'round_seconds', '')::int, 120);
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_duel_id uuid;
  v_player_id uuid;
  v_token uuid;
  v_try int := 0;
  i int;
begin
  if length(v_name) < 1 then
    raise exception 'Display name is required' using errcode = '22023';
  end if;
  if v_hp not between 1000 and 50000 then
    raise exception 'starting_hp must be between 1000 and 50000' using errcode = '22023';
  end if;
  if v_window not between 5 and 60 then
    raise exception 'guess_window_seconds must be between 5 and 60' using errcode = '22023';
  end if;
  if v_round_secs not between 30 and 600 then
    raise exception 'round_seconds must be between 30 and 600' using errcode = '22023';
  end if;

  -- Opportunistic cleanup of abandoned duels.
  delete from public.duels
  where status in ('waiting', 'cancelled') and created_at < now() - interval '24 hours';
  update public.duels
  set status = 'finished', finish_reason = 'abandoned', finished_at = now(), updated_at = now()
  where status = 'active' and created_at < now() - interval '12 hours';

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.duels (code, starting_hp, guess_window_seconds, round_seconds)
      values (v_code, v_hp, v_window, v_round_secs)
      returning id into v_duel_id;
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;
    end;
  end loop;

  insert into public.duel_players (duel_id, user_id, display_name, is_host, hp)
  values (v_duel_id, auth.uid(), v_name, true, v_hp)
  returning id into v_player_id;

  insert into public.duel_player_secrets (player_id)
  values (v_player_id)
  returning token into v_token;

  return jsonb_build_object(
    'duel_id', v_duel_id, 'code', v_code,
    'player_id', v_player_id, 'token', v_token,
    'server_time', now()
  );
end $$;

-- Join an open duel as the second player.
create or replace function public.duel_join(p_code text, p_display_name text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name text := left(btrim(coalesce(p_display_name, '')), 20);
  v_duel public.duels%rowtype;
  v_count int;
  v_player_id uuid;
  v_token uuid;
begin
  if length(v_name) < 1 then
    raise exception 'Display name is required' using errcode = '22023';
  end if;

  select * into v_duel from public.duels
  where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    raise exception 'Duel not found' using errcode = 'P0002';
  end if;
  if v_duel.status <> 'waiting' then
    raise exception 'This duel has already started' using errcode = '55000';
  end if;

  select count(*) into v_count from public.duel_players where duel_id = v_duel.id;
  if v_count >= 2 then
    raise exception 'Duel is full — you can spectate instead' using errcode = '55000';
  end if;

  insert into public.duel_players (duel_id, user_id, display_name, is_host, hp)
  values (v_duel.id, auth.uid(), v_name, false, v_duel.starting_hp)
  returning id into v_player_id;

  insert into public.duel_player_secrets (player_id)
  values (v_player_id)
  returning token into v_token;

  return jsonb_build_object(
    'duel_id', v_duel.id, 'code', v_duel.code,
    'player_id', v_player_id, 'token', v_token,
    'server_time', now()
  );
end $$;

-- Host starts the duel: picks a hidden random image sequence, creates round 1.
create or replace function public.duel_start(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_player public.duel_players%rowtype;
  v_duel public.duels%rowtype;
  v_count int;
  v_images uuid[];
begin
  v_player := public._duel_player_by_token(p_token);

  select * into v_duel from public.duels where id = v_player.duel_id for update;
  if v_duel.status <> 'waiting' then
    raise exception 'Duel already started' using errcode = '55000';
  end if;
  if not v_player.is_host then
    raise exception 'Only the host can start the duel' using errcode = '42501';
  end if;
  select count(*) into v_count from public.duel_players where duel_id = v_duel.id;
  if v_count < 2 then
    raise exception 'Need an opponent before starting' using errcode = '55000';
  end if;

  select array_agg(id) into v_images
  from (select id from public.game_images order by random() limit 40) s;
  if coalesce(array_length(v_images, 1), 0) < 5 then
    raise exception 'Not enough images available' using errcode = '55000';
  end if;

  insert into public.duel_secrets (duel_id, image_ids) values (v_duel.id, v_images);

  perform public._duel_create_round(v_duel.id, 1);

  update public.duels
  set status = 'active', current_round = 1, started_at = now(), updated_at = now()
  where id = v_duel.id;

  return jsonb_build_object('started', true, 'server_time', now());
end $$;

-- Submit a guess for the current round. Computes scores server-side.
-- First guess of a round arms the short countdown for the opponent;
-- second guess resolves the round immediately.
-- (Superseded by 20260611010610 — see note at top.)
create or replace function public.duel_submit_guess(
  p_token uuid, p_round_number int, p_year int, p_lat float8, p_lng float8
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_player public.duel_players%rowtype;
  v_duel public.duels%rowtype;
  v_round public.duel_rounds%rowtype;
  v_deadline timestamptz;
  v_img record;
  v_year_raw int;
  v_loc_raw int;
  v_dist float8;
  v_guess_count int;
begin
  v_player := public._duel_player_by_token(p_token);

  select * into v_duel from public.duels where id = v_player.duel_id;
  if v_duel.status <> 'active' then
    raise exception 'Duel is not active' using errcode = '55000';
  end if;
  if p_round_number is distinct from v_duel.current_round then
    raise exception 'Round % is not the current round', p_round_number using errcode = '55000';
  end if;

  select * into v_round from public.duel_rounds
  where duel_id = v_duel.id and round_number = p_round_number for update;
  if v_round.resolved_at is not null then
    raise exception 'Round already resolved' using errcode = '55000';
  end if;

  v_deadline := public._duel_effective_deadline(v_round);
  if now() > v_deadline + interval '1 second' then
    perform public._duel_resolve_round(v_round.id);
    raise exception 'Time is up for this round' using errcode = 'P0003';
  end if;

  if p_year is null or p_year not between 1800 and 2100 then
    raise exception 'Invalid year' using errcode = '22023';
  end if;
  if p_lat is null or p_lat not between -90 and 90
     or p_lng is null or p_lng not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.duel_guesses
    where round_id = v_round.id and player_id = v_player.id
  ) then
    raise exception 'You already guessed this round' using errcode = '55000';
  end if;

  select year, location_lat, location_lng into v_img
  from public.game_images where id = v_round.image_id;

  v_year_raw := public.duel_year_score(v_img.year, p_year);
  v_dist := public.duel_distance_km(v_img.location_lat, v_img.location_lng, p_lat, p_lng);
  v_loc_raw := public.duel_location_score_from_km(v_dist);

  insert into public.duel_guesses
    (round_id, duel_id, player_id, guessed_year, guessed_lat, guessed_lng,
     year_score, location_score, total_score, distance_km)
  values
    (v_round.id, v_duel.id, v_player.id, p_year, p_lat, p_lng,
     v_year_raw * 50, v_loc_raw * 50, (v_year_raw + v_loc_raw) * 50, v_dist);

  select count(*) into v_guess_count
  from public.duel_guesses where round_id = v_round.id;

  if v_guess_count = 1 then
    update public.duel_rounds
    set guess_deadline = least(base_deadline, now() + make_interval(secs => v_duel.guess_window_seconds))
    where id = v_round.id and guess_deadline is null;
  elsif v_guess_count >= 2 then
    perform public._duel_resolve_round(v_round.id);
  end if;

  return jsonb_build_object(
    'submitted', true,
    'both_guessed', v_guess_count >= 2,
    'server_time', now()
  );
end $$;

-- Force-resolve a round whose effective deadline has passed (any client may
-- call this when its countdown hits zero; idempotent).
create or replace function public.duel_resolve_round(p_duel_id uuid, p_round_number int)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_round public.duel_rounds%rowtype;
  v_both boolean;
begin
  select * into v_round from public.duel_rounds
  where duel_id = p_duel_id and round_number = p_round_number for update;
  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;
  if v_round.resolved_at is not null then
    return jsonb_build_object('resolved', true, 'already_resolved', true, 'server_time', now());
  end if;

  v_both := (select count(*) from public.duel_guesses where round_id = v_round.id) >= 2;
  if not v_both and now() < public._duel_effective_deadline(v_round) then
    raise exception 'Round is not ready to resolve' using errcode = '55000';
  end if;

  perform public._duel_resolve_round(v_round.id);
  return jsonb_build_object('resolved', true, 'server_time', now());
end $$;

-- Create the next round once the results-viewing window has elapsed
-- (any client may call this; idempotent thanks to the duel row lock).
create or replace function public.duel_advance_round(p_duel_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels%rowtype;
  v_round public.duel_rounds%rowtype;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found then
    raise exception 'Duel not found' using errcode = 'P0002';
  end if;
  if v_duel.status = 'finished' then
    return jsonb_build_object('finished', true, 'server_time', now());
  end if;
  if v_duel.status <> 'active' then
    raise exception 'Duel is not active' using errcode = '55000';
  end if;

  select * into v_round from public.duel_rounds
  where duel_id = p_duel_id and round_number = v_duel.current_round;
  if v_round.resolved_at is null then
    raise exception 'Current round is not resolved yet' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.duel_rounds
    where duel_id = p_duel_id and round_number = v_duel.current_round + 1
  ) then
    return jsonb_build_object('advanced', true, 'already_advanced', true, 'server_time', now());
  end if;
  if v_round.next_round_at is null
     or now() < v_round.next_round_at - interval '500 milliseconds' then
    raise exception 'Results are still being shown' using errcode = '55000';
  end if;

  update public.duels
  set current_round = current_round + 1, updated_at = now()
  where id = p_duel_id;

  perform public._duel_create_round(p_duel_id, v_duel.current_round + 1);

  return jsonb_build_object('advanced', true, 'round', v_duel.current_round + 1, 'server_time', now());
end $$;

-- Leave a duel: in the lobby this removes you (host leaving cancels it);
-- mid-match it forfeits in the opponent's favor.
create or replace function public.duel_leave(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_player public.duel_players%rowtype;
  v_duel public.duels%rowtype;
  v_opponent uuid;
begin
  v_player := public._duel_player_by_token(p_token);
  select * into v_duel from public.duels where id = v_player.duel_id for update;

  if v_duel.status = 'waiting' then
    if v_player.is_host then
      update public.duels
      set status = 'cancelled', finished_at = now(), updated_at = now()
      where id = v_duel.id;
    else
      delete from public.duel_players where id = v_player.id;
    end if;
  elsif v_duel.status = 'active' then
    select id into v_opponent from public.duel_players
    where duel_id = v_duel.id and id <> v_player.id;
    update public.duels
    set status = 'finished', winner_player_id = v_opponent,
        finish_reason = 'forfeit', finished_at = now(), updated_at = now()
    where id = v_duel.id;
  end if;

  return jsonb_build_object('left', true, 'server_time', now());
end $$;

-- Full state snapshot: used on page load, refresh, reconnect and by spectators.
-- Pass your token to also get your own current-round guess back.
create or replace function public.duel_get_state(p_code text, p_token uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels%rowtype;
  v_me uuid;
  v_players jsonb;
  v_round public.duel_rounds%rowtype;
  v_round_json jsonb;
  v_my_guess jsonb;
  v_guessed jsonb;
begin
  select * into v_duel from public.duels where code = upper(btrim(coalesce(p_code, '')));
  if not found then
    raise exception 'Duel not found' using errcode = 'P0002';
  end if;

  if p_token is not null then
    select p.id into v_me
    from public.duel_players p
    join public.duel_player_secrets s on s.player_id = p.id
    where s.token = p_token and p.duel_id = v_duel.id;
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', id, 'display_name', display_name, 'is_host', is_host,
    'hp', hp, 'joined_at', joined_at
  ) order by joined_at) into v_players
  from public.duel_players where duel_id = v_duel.id;

  if v_duel.current_round >= 1 then
    select * into v_round from public.duel_rounds
    where duel_id = v_duel.id and round_number = v_duel.current_round;
    if found then
      select coalesce(jsonb_agg(g.player_id), '[]'::jsonb) into v_guessed
      from public.duel_guesses g where g.round_id = v_round.id;
      if v_me is not null then
        select to_jsonb(g.*) into v_my_guess
        from public.duel_guesses g
        where g.round_id = v_round.id and g.player_id = v_me;
      end if;
      v_round_json := jsonb_build_object(
        'id', v_round.id,
        'round_number', v_round.round_number,
        'image_id', v_round.image_id,
        'multiplier', v_round.multiplier,
        'started_at', v_round.started_at,
        'base_deadline', v_round.base_deadline,
        'guess_deadline', v_round.guess_deadline,
        'resolved_at', v_round.resolved_at,
        'next_round_at', v_round.next_round_at,
        'winner_player_id', v_round.winner_player_id,
        'score_diff', v_round.score_diff,
        'damage', v_round.damage,
        'guessed_player_ids', v_guessed
      );
    end if;
  end if;

  return jsonb_build_object(
    'duel', jsonb_build_object(
      'id', v_duel.id, 'code', v_duel.code, 'status', v_duel.status,
      'current_round', v_duel.current_round, 'starting_hp', v_duel.starting_hp,
      'guess_window_seconds', v_duel.guess_window_seconds,
      'round_seconds', v_duel.round_seconds, 'results_seconds', v_duel.results_seconds,
      'winner_player_id', v_duel.winner_player_id, 'finish_reason', v_duel.finish_reason,
      'created_at', v_duel.created_at, 'started_at', v_duel.started_at,
      'finished_at', v_duel.finished_at
    ),
    'players', coalesce(v_players, '[]'::jsonb),
    'me', v_me,
    'round', v_round_json,
    'my_guess', v_my_guess,
    'server_time', now()
  );
end $$;

-- Results of a RESOLVED round: both guesses + the image answer.
create or replace function public.duel_round_results(p_duel_id uuid, p_round_number int)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_round public.duel_rounds%rowtype;
  v_img record;
  v_guesses jsonb;
  v_players jsonb;
begin
  select * into v_round from public.duel_rounds
  where duel_id = p_duel_id and round_number = p_round_number;
  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;
  if v_round.resolved_at is null then
    raise exception 'Round is not resolved yet' using errcode = '55000';
  end if;

  select year, location_lat, location_lng, location_name, description, image_url
  into v_img from public.game_images where id = v_round.image_id;

  select jsonb_agg(jsonb_build_object(
    'player_id', g.player_id,
    'display_name', p.display_name,
    'guessed_year', g.guessed_year,
    'guessed_lat', g.guessed_lat,
    'guessed_lng', g.guessed_lng,
    'year_score', g.year_score,
    'location_score', g.location_score,
    'total_score', g.total_score,
    'distance_km', g.distance_km,
    'is_timeout', g.is_timeout,
    'submitted_at', g.submitted_at
  ) order by p.joined_at) into v_guesses
  from public.duel_guesses g
  join public.duel_players p on p.id = g.player_id
  where g.round_id = v_round.id;

  select jsonb_agg(jsonb_build_object('id', id, 'hp', hp) order by joined_at)
  into v_players
  from public.duel_players where duel_id = p_duel_id;

  return jsonb_build_object(
    'round_number', v_round.round_number,
    'multiplier', v_round.multiplier,
    'winner_player_id', v_round.winner_player_id,
    'score_diff', v_round.score_diff,
    'damage', v_round.damage,
    'resolved_at', v_round.resolved_at,
    'next_round_at', v_round.next_round_at,
    'actual', jsonb_build_object(
      'year', v_img.year, 'lat', v_img.location_lat, 'lng', v_img.location_lng,
      'location_name', v_img.location_name, 'description', v_img.description
    ),
    'guesses', coalesce(v_guesses, '[]'::jsonb),
    'players', coalesce(v_players, '[]'::jsonb),
    'server_time', now()
  );
end $$;

-- All resolved rounds of a duel (for the match-over summary screen).
create or replace function public.duel_rounds_summary(p_duel_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'round_number', r.round_number,
    'multiplier', r.multiplier,
    'winner_player_id', r.winner_player_id,
    'score_diff', r.score_diff,
    'damage', r.damage,
    'image_id', r.image_id,
    'guesses', (
      select jsonb_agg(jsonb_build_object(
        'player_id', g.player_id, 'total_score', g.total_score,
        'year_score', g.year_score, 'location_score', g.location_score,
        'is_timeout', g.is_timeout
      ) order by p.joined_at)
      from public.duel_guesses g
      join public.duel_players p on p.id = g.player_id
      where g.round_id = r.id
    )
  ) order by r.round_number) into v
  from public.duel_rounds r
  where r.duel_id = p_duel_id and r.resolved_at is not null;

  return coalesce(v, '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges: API functions for anon+authenticated, internals locked.
-- ---------------------------------------------------------------------------
revoke execute on function public._duel_player_by_token(uuid) from public, anon, authenticated;
revoke execute on function public._duel_create_round(uuid, int) from public, anon, authenticated;
revoke execute on function public._duel_resolve_round(uuid) from public, anon, authenticated;

grant execute on function public.duel_create(text, jsonb) to anon, authenticated;
grant execute on function public.duel_join(text, text) to anon, authenticated;
grant execute on function public.duel_start(uuid) to anon, authenticated;
grant execute on function public.duel_submit_guess(uuid, int, int, float8, float8) to anon, authenticated;
grant execute on function public.duel_resolve_round(uuid, int) to anon, authenticated;
grant execute on function public.duel_advance_round(uuid) to anon, authenticated;
grant execute on function public.duel_leave(uuid) to anon, authenticated;
grant execute on function public.duel_get_state(text, uuid) to anon, authenticated;
grant execute on function public.duel_round_results(uuid, int) to anon, authenticated;
grant execute on function public.duel_rounds_summary(uuid) to anon, authenticated;
