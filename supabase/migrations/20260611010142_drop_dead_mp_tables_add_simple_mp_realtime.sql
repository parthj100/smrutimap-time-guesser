-- 1) Drop the dead "advanced multiplayer" tables.
-- Their client code (~2,800 LOC) was deleted in commit 5de83e9; tables were locked
-- (no policies) by 20260610034237 and have 0 rows. Only generated types reference them.
drop table if exists public.multiplayer_round_results cascade;
drop table if exists public.multiplayer_sessions cascade;
drop table if exists public.room_participants cascade;
drop table if exists public.multiplayer_rooms cascade;

-- 2) The supabase_realtime publication had NO tables, so the simple multiplayer's
-- postgres_changes subscriptions never received events (it survived on 2s polling).
-- Add its tables so realtime actually works.
alter publication supabase_realtime add table public.simple_multiplayer_rooms;
alter publication supabase_realtime add table public.simple_multiplayer_scores;
alter publication supabase_realtime add table public.simple_multiplayer_players;
