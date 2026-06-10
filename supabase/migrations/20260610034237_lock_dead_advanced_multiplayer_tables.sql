-- The advanced multiplayer system (multiplayer_rooms / room_participants / multiplayer_sessions /
-- multiplayer_round_results) is unreachable dead code in the client and has been deleted.
-- Its policies had 'OR user_id IS NULL' escape hatches making writes effectively public.
-- Dropping all write policies = default-deny under RLS. Reads stay for historical data.
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Host can update their room" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Host can delete their room" ON public.multiplayer_rooms;

DROP POLICY IF EXISTS "Anyone can join rooms" ON public.room_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON public.room_participants;
DROP POLICY IF EXISTS "Users can delete their own participant record" ON public.room_participants;

DROP POLICY IF EXISTS "Host can create sessions" ON public.multiplayer_sessions;
DROP POLICY IF EXISTS "Host can update sessions" ON public.multiplayer_sessions;

DROP POLICY IF EXISTS "Participants can insert their own results" ON public.multiplayer_round_results;
