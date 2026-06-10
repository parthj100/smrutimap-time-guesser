import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameSession, GameMode, GuessResult, RoundResult } from '@/types/game';
import { safeQuery } from '@/utils/databaseUtils';

interface UseGameSessionProps {
  onProfileUpdate?: (userId: string) => Promise<void>;
}

export const useGameSession = ({ onProfileUpdate }: UseGameSessionProps = {}) => {
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);

  const startGameSession = async (
    userId: string, 
    gameMode: GameMode, 
    roundsCount: number = 5
  ) => {
    console.log('🎮 Starting game session for user:', userId, 'Mode:', gameMode);
    
    const { data, error, timedOut } = await safeQuery(
      async () => {
        return await supabase
          .from('game_sessions' as any)
          .insert({
            user_id: userId,
            game_mode: gameMode,
            total_score: 0,
            rounds_completed: 0,
          })
          .select()
          .single();
      },
      { operation: 'Start game session', timeoutMs: 5000 }
    );

    if (timedOut) {
      console.error('⏱️ Game session start timed out');
      return { data: null, error: new Error('Game session start timed out') };
    }

    if (error || data?.error) {
      console.error('❌ Error starting game session:', error || data?.error);
      return { data: null, error: error || data?.error };
    }

    if (data?.data) {
      console.log('✅ Game session started successfully:', data.data);
      const sessionData = data.data as unknown as GameSession;
      setCurrentSession(sessionData);
      return { data: sessionData, error: null };
    }

    return { data: null, error: new Error('No session data returned') };
  };

  const saveRoundResult = async (
    sessionId: string,
    userId: string,
    roundNumber: number,
    guessResult: GuessResult,
    imageId: string,
    actualYear: number,
    actualLocation: { lat: number; lng: number }
  ) => {
    console.log('💾 Saving round result for session:', sessionId, 'Round:', roundNumber);
    
    const roundResult: Omit<RoundResult, 'id' | 'created_at'> = {
      session_id: sessionId,
      user_id: userId,
      image_id: imageId,
      round_number: roundNumber,
      year_guess: guessResult.yearGuess,
      actual_year: actualYear,
      location_guess_lat: guessResult.locationGuess.lat,
      location_guess_lng: guessResult.locationGuess.lng,
      actual_location_lat: actualLocation.lat,
      actual_location_lng: actualLocation.lng,
      year_score: guessResult.yearScore,
      location_score: guessResult.locationScore,
      total_round_score: guessResult.totalScore,
      time_used: guessResult.timeUsed,
    };

    const { data, error, timedOut } = await safeQuery(
      async () => {
        return await supabase
          .from('round_results' as any)
          .insert(roundResult)
          .select()
          .single();
      },
      { operation: 'Save round result', timeoutMs: 3000 }
    );

    if (timedOut) {
      console.error('⏱️ Round result save timed out');
      return { data: null, error: new Error('Round result save timed out') };
    }

    if (error || data?.error) {
      console.error('❌ Error saving round result:', error || data?.error);
      return { data: null, error: error || data?.error };
    }

    console.log('✅ Round result saved successfully');
    return { data: data?.data, error: null };
  };

  const completeGameSession = async (
    sessionId: string,
    totalScore: number,
    roundsCompleted: number,
    totalTime?: number
  ) => {
    console.log('🏁 Completing game session:', sessionId, 'Score:', totalScore, 'Rounds:', roundsCompleted);
    
    const { data, error, timedOut } = await safeQuery(
      async () => {
        return await supabase
          .from('game_sessions' as any)
          .update({
            total_score: totalScore,
            rounds_completed: roundsCompleted,
            time_taken: totalTime,
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .select()
          .single();
      },
      { operation: 'Complete game session', timeoutMs: 5000 }
    );

    if (timedOut) {
      console.error('⏱️ Game session completion timed out');
      return { data: null, error: new Error('Game session completion timed out') };
    }

    if (error || data?.error) {
      console.error('❌ Error completing game session:', error || data?.error);
      return { data: null, error: error || data?.error };
    }

    const sessionData = data?.data as any;
    
    // Update user profile stats
    if (sessionData && sessionData.user_id) {
      console.log('📊 Updating user stats after game completion...');
      await updateUserStats(sessionData.user_id, totalScore, roundsCompleted);
    }
    
    const typedSessionData = sessionData as unknown as GameSession;
    setCurrentSession(typedSessionData);
    console.log('✅ Game session completed successfully');
    return { data: typedSessionData, error: null };
  };

  const updateUserStats = async (
    userId: string,
    gameScore: number,
    roundsCompleted: number
  ) => {
    console.log('📊 Updating user stats for user:', userId, 'Score:', gameScore, 'Rounds:', roundsCompleted);

    // Single atomic RPC: the database increments stats in one statement, so
    // concurrent game completions can't clobber each other. The function also
    // enforces user_uuid = auth.uid() server-side.
    const { data: updateData, error: updateError, timedOut: updateTimeout } = await safeQuery(
      async () => {
        return await supabase.rpc('update_user_stats', {
          user_uuid: userId,
          game_score: Math.round(gameScore),
          rounds_completed: roundsCompleted,
        });
      },
      { operation: 'Update user stats', timeoutMs: 5000 }
    );

    if (updateTimeout) {
      console.error('⏱️ User stats update timed out');
      return { data: null, error: new Error('User stats update timed out') };
    }

    if (updateError || updateData?.error) {
      console.error('❌ Error updating user stats:', updateError || updateData?.error);
      return { data: null, error: updateError || updateData?.error };
    }

    console.log('✅ User stats updated successfully');

    // Call the onProfileUpdate callback
    if (onProfileUpdate) {
      console.log('🔄 Refreshing user profile after stats update...');
      try {
        await onProfileUpdate(userId);
        console.log('✅ Profile refresh completed');
      } catch (error) {
        console.error('❌ Profile refresh failed:', error);
      }
    } else {
      console.log('⚠️ No profile update callback provided');
    }

    return { data: updateData?.data, error: null };
  };

  return {
    currentSession,
    setCurrentSession,
    startGameSession,
    saveRoundResult,
    completeGameSession,
    updateUserStats,
  };
}; 