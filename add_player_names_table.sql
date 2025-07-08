-- Migration: Add player display names table for multiplayer rooms
-- Run this SQL in your Supabase SQL editor to add display name support

-- Add image_sequence column to existing rooms table if it doesn't exist
ALTER TABLE simple_multiplayer_rooms 
ADD COLUMN IF NOT EXISTS image_sequence uuid[];

-- Player display names for multiplayer rooms
CREATE TABLE IF NOT EXISTS simple_multiplayer_players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES simple_multiplayer_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  display_name text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE simple_multiplayer_players ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Anyone can read players" ON simple_multiplayer_players FOR SELECT USING (true);
CREATE POLICY "Users can insert their own player record" ON simple_multiplayer_players FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_simple_players_room ON simple_multiplayer_players(room_id);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL ON simple_multiplayer_players TO authenticated;
-- GRANT ALL ON simple_multiplayer_players TO anon; 