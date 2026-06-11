-- A guess that arrives after the effective deadline must still RESOLVE the
-- round (synthesizing the timeout). The original code resolved then RAISEd,
-- but the exception rolled the resolve back. Return a structured response
-- instead of raising so the resolve persists.
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
    return jsonb_build_object('submitted', false, 'timed_out', true, 'server_time', now());
  end if;

  v_deadline := public._duel_effective_deadline(v_round);
  if now() > v_deadline + interval '1 second' then
    -- Too late: resolve the round (this player becomes a timeout) and say so.
    perform public._duel_resolve_round(v_round.id);
    return jsonb_build_object('submitted', false, 'timed_out', true, 'server_time', now());
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
