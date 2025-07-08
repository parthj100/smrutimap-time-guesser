-- Simplified Multiplayer Schema
-- Run this SQL in your Supabase SQL editor to enable the multiplayer features

-- Simple room management
CREATE TABLE IF NOT EXISTS simple_multiplayer_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text UNIQUE NOT NULL,
  host_user_id uuid REFERENCES auth.users(id),
  current_round integer DEFAULT 1,
  total_rounds integer DEFAULT 5,
  time_per_round integer DEFAULT 60,
  current_image_id uuid,
  image_sequence uuid[], -- Array of image IDs for all rounds
  game_status text DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'playing', 'finished')),
  round_start_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Player display names for multiplayer rooms
CREATE TABLE IF NOT EXISTS simple_multiplayer_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES simple_multiplayer_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  display_name text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(room_id, user_id)
);

-- Simple player scores (reuse existing user system)
CREATE TABLE IF NOT EXISTS simple_multiplayer_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES simple_multiplayer_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  round_number integer,
  guessed_year integer,
  actual_year integer,
  points integer,
  guess_time_seconds real,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(room_id, user_id, round_number)
);

-- Enable RLS
ALTER TABLE simple_multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_multiplayer_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_multiplayer_scores ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Anyone can read rooms" ON simple_multiplayer_rooms FOR SELECT USING (true);
CREATE POLICY "Host can update their room" ON simple_multiplayer_rooms FOR UPDATE USING (host_user_id = auth.uid());
CREATE POLICY "Anyone can insert rooms" ON simple_multiplayer_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read players" ON simple_multiplayer_players FOR SELECT USING (true);
CREATE POLICY "Users can insert their own player record" ON simple_multiplayer_players FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read scores" ON simple_multiplayer_scores FOR SELECT USING (true);
CREATE POLICY "Users can insert their own scores" ON simple_multiplayer_scores FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simple_rooms_code ON simple_multiplayer_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_simple_rooms_status ON simple_multiplayer_rooms(game_status);
CREATE INDEX IF NOT EXISTS idx_simple_players_room ON simple_multiplayer_players(room_id);
CREATE INDEX IF NOT EXISTS idx_simple_scores_room ON simple_multiplayer_scores(room_id);
CREATE INDEX IF NOT EXISTS idx_simple_scores_user_round ON simple_multiplayer_scores(user_id, round_number);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_simple_multiplayer_rooms_updated_at 
    BEFORE UPDATE ON simple_multiplayer_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 