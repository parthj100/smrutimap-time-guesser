-- ============================================================================
-- Admin review for community photo_submissions.
--
-- Like feedback, submissions were unreadable by admins (SELECT is anon→false,
-- authenticated→own-only) and had a full status workflow
-- (pending|reviewing|approved|rejected|needs_info) with no UI. These RPCs
-- surface them and make approval meaningful: approving inserts a real
-- game_images row (the submission stores only a free-text location, so the
-- admin supplies coordinates at review time), so the photo enters the live
-- game pool. Mirrors the admin_* hardening pattern (definer, _is_admin gate,
-- search_path pinned, execute to authenticated only).
-- ============================================================================

create or replace function public.admin_list_photo_submissions(p_limit int default 200)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 200), 1), 500);
  v jsonb;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'submitter_name', submitter_name,
    'email', email,
    'photo_url', photo_url,
    'location_description', location_description,
    'year_taken', year_taken,
    'year_confidence', year_confidence,
    'description', description,
    'clues_description', clues_description,
    'status', coalesce(status, 'pending'),
    'admin_notes', admin_notes,
    'rejection_reason', rejection_reason,
    'approval_date', approval_date,
    'user_id', user_id,
    'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  into v
  from (select * from public.photo_submissions order by created_at desc limit v_limit) s;
  return v;
end $$;

-- Approve a submission AND publish it to game_images. Idempotent-ish: a second
-- approve is rejected so the photo can't be added to the pool twice.
create or replace function public.admin_approve_photo_submission(
  p_id uuid,
  p_image_url text,
  p_year int,
  p_lat float8,
  p_lng float8,
  p_location_name text,
  p_description text,
  p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_sub public.photo_submissions%rowtype;
  v_image_id uuid;
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_sub from public.photo_submissions where id = p_id for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if v_sub.status = 'approved' then
    raise exception 'This submission has already been approved' using errcode = '55000';
  end if;

  if coalesce(btrim(p_image_url), '') = '' then
    raise exception 'Image URL is required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_location_name), '') = '' then
    raise exception 'Location name is required' using errcode = '22023';
  end if;
  if coalesce(btrim(p_description), '') = '' then
    raise exception 'Description is required' using errcode = '22023';
  end if;
  if p_year is null or p_year not between 1800 and 2100 then
    raise exception 'Year must be between 1800 and 2100' using errcode = '22023';
  end if;
  if p_lat is null or p_lat not between -90 and 90
     or p_lng is null or p_lng not between -180 and 180 then
    raise exception 'Valid map coordinates are required' using errcode = '22023';
  end if;

  insert into public.game_images (image_url, year, location_lat, location_lng, location_name, description)
  values (btrim(p_image_url), p_year, p_lat, p_lng, btrim(p_location_name), btrim(p_description))
  returning id into v_image_id;

  update public.photo_submissions
  set status = 'approved',
      approval_date = now(),
      admin_notes = coalesce(p_notes, admin_notes),
      rejection_reason = null,
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'image_id', v_image_id);
end $$;

-- Set a non-approval status (reject / needs_info / reviewing / back to pending).
-- Approval is intentionally excluded — it must go through the approve RPC so a
-- game_images row is always created alongside.
create or replace function public.admin_set_photo_submission_status(
  p_id uuid, p_status text, p_notes text default null, p_rejection_reason text default null
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public._is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'reviewing', 'rejected', 'needs_info') then
    raise exception 'Invalid status (use the approve action to approve)' using errcode = '22023';
  end if;

  update public.photo_submissions
  set status = p_status,
      admin_notes = coalesce(p_notes, admin_notes),
      rejection_reason = case when p_status = 'rejected'
                              then left(coalesce(p_rejection_reason, ''), 500)
                              else null end,
      updated_at = now()
  where id = p_id;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'status', p_status);
end $$;

grant execute on function public.admin_list_photo_submissions(int) to authenticated;
grant execute on function public.admin_approve_photo_submission(uuid, text, int, float8, float8, text, text, text) to authenticated;
grant execute on function public.admin_set_photo_submission_status(uuid, text, text, text) to authenticated;
