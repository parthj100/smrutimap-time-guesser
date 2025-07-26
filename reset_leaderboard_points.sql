-- Reset all user leaderboard points for fresh start
-- This script will clear all score data so everyone starts from zero

-- Clear all game sessions (this will cascade to scores)
DELETE FROM game_sessions;

-- Clear all multiplayer scores
DELETE FROM simple_multiplayer_scores;

-- Clear all multiplayer rooms (this will cascade to scores and players)
DELETE FROM simple_multiplayer_rooms;

-- Clear all multiplayer players
DELETE FROM simple_multiplayer_players;

-- Reset user profile stats to zero
UPDATE user_profiles 
SET 
  total_score = 0,
  total_games_played = 0,
  average_score = 0,
  best_score = 0,
  games_won = 0,
  total_rounds_played = 0,
  average_round_score = 0,
  updated_at = now()
WHERE total_score > 0 OR total_games_played > 0;

-- Verify the reset
SELECT 
  'User Profiles Reset' as table_name,
  COUNT(*) as records_affected
FROM user_profiles 
WHERE total_score = 0 AND total_games_played = 0

UNION ALL

SELECT 
  'Game Sessions' as table_name,
  COUNT(*) as records_affected
FROM game_sessions

UNION ALL

SELECT 
  'Multiplayer Scores' as table_name,
  COUNT(*) as records_affected
FROM simple_multiplayer_scores

UNION ALL

SELECT 
  'Multiplayer Rooms' as table_name,
  COUNT(*) as records_affected
FROM simple_multiplayer_rooms;

-- Display confirmation message
SELECT '✅ All leaderboard points have been reset successfully!' as message;
