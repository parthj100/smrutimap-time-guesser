-- === simple_multiplayer_rooms: was 'Anyone can update rooms' USING(true) — room hijacking ===
-- Client room writes (start game / next round / end game) are all host-only code paths.
-- Note: joining a room already requires auth (players.user_id is uuid checked vs auth.uid()),
-- so requiring an authenticated host breaks nothing that works today.
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.simple_multiplayer_rooms;
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.simple_multiplayer_rooms;
CREATE POLICY "Host can create own room" ON public.simple_multiplayer_rooms
  FOR INSERT TO authenticated WITH CHECK (host_user_id = (SELECT auth.uid())::text);
CREATE POLICY "Host can update own room" ON public.simple_multiplayer_rooms
  FOR UPDATE TO authenticated USING (host_user_id = (SELECT auth.uid())::text);

-- === simple_multiplayer_scores: was 'Anyone can insert scores' WITH CHECK(true) — score forgery ===
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.simple_multiplayer_scores;
CREATE POLICY "Players insert own scores" ON public.simple_multiplayer_scores
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid())::text);

-- === daily_challenges: drop duplicate SELECT, dead INSERT(false), and the open UPDATE (client never updates) ===
DROP POLICY IF EXISTS "Anyone can view daily challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "System can create daily challenges" ON public.daily_challenges;
DROP POLICY IF EXISTS "Allow system to update daily challenges" ON public.daily_challenges;

-- === feedback: authenticated INSERT had WITH CHECK(true), allowing user_id spoofing ===
DROP POLICY IF EXISTS "Users can insert feedback" ON public.feedback;
CREATE POLICY "Users can insert feedback" ON public.feedback
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- === photo_submissions: WITH CHECK(true) allowed attributing submissions to other users ===
DROP POLICY IF EXISTS "Users can insert photo submissions" ON public.photo_submissions;
CREATE POLICY "Users can insert photo submissions" ON public.photo_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- === storage: bucket served via public URLs; the broad SELECT policy only enabled API listing of all files ===
DROP POLICY IF EXISTS "Anyone can view photo submissions" ON storage.objects;
