-- Align feedback RPCs with the table's real status enum
-- (open | in_progress | resolved | closed; default 'open').
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
    'status', coalesce(status, 'open'), 'admin_notes', admin_notes,
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
  if p_status not in ('open', 'in_progress', 'resolved', 'closed') then
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
