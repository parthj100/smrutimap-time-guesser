import { supabase } from '@/integrations/supabase/client';

export interface QueryWithTimeoutOptions {
  timeoutMs?: number;
  operation?: string;
}

/**
 * Executes a database query with timeout protection
 * @param queryPromise The Supabase query promise
 * @param options Configuration options including timeout duration and operation name
 * @returns Promise that resolves with query result or rejects with timeout error
 */
export const queryWithTimeout = async <T>(
  queryPromise: Promise<T>,
  options: QueryWithTimeoutOptions = {}
): Promise<T> => {
  const { timeoutMs = 5000, operation = 'Database query' } = options;

  console.log(`⏱️ Starting ${operation} with ${timeoutMs}ms timeout`);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.error(`❌ ${operation} timed out after ${timeoutMs}ms`);
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([queryPromise, timeoutPromise]);
    console.log(`✅ ${operation} completed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ ${operation} failed:`, error);
    throw error;
  }
};

/**
 * Test basic database connectivity
 */
export const testDatabaseConnectivity = async (): Promise<boolean> => {
  try {
    const result = await queryWithTimeout(
      (async () => {
        return await supabase
          .from('user_profiles' as any)
          .select('count', { count: 'exact', head: true });
      })(),
      { operation: 'Database connectivity test', timeoutMs: 3000 }
    );
    
    console.log('🔌 Database connectivity test result:', {
      success: !result.error,
      count: result.count,
      error: result.error
    });
    
    return !result.error;
  } catch (error) {
    console.error('🔌 Database connectivity test failed:', error);
    return false;
  }
};

/**
 * Safe query helper that includes connectivity test and timeout protection
 */
export const safeQuery = async <T>(
  queryFn: () => Promise<T>,
  options: QueryWithTimeoutOptions = {}
): Promise<{ data: T | null; error: any; timedOut: boolean }> => {
  try {
    // First test connectivity if this is a critical operation
    if (options.operation?.includes('critical')) {
      const isConnected = await testDatabaseConnectivity();
      if (!isConnected) {
        return {
          data: null,
          error: new Error('Database connectivity test failed'),
          timedOut: false
        };
      }
    }

    const data = await queryWithTimeout(queryFn(), options);
    return { data, error: null, timedOut: false };
  } catch (error: any) {
    const timedOut = error.message?.includes('timed out');
    return { data: null, error, timedOut };
  }
}; 

/**
 * Fix user profile stats by recalculating from completed game sessions
 */
export const fixUserStatsFromSessions = async (userId: string) => {
  try {
    console.log(`🔧 Fixing stats for user: ${userId}`);

    // Get all completed sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      console.log('📭 No completed sessions found, setting stats to zero');
      // Set stats to zero if no sessions
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          total_games_played: 0,
          total_score: 0,
          best_single_game_score: 0,
          average_score: 0,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to reset stats: ${updateError.message}`);
      }

      return { success: true, correctedStats: { totalGames: 0, totalScore: 0, bestSingleGame: 0, averageScore: 0 } };
    }

    // Calculate correct stats
    const totalGames = sessions.length;
    const totalScore = sessions.reduce((sum, session) => sum + (session.total_score || 0), 0);
    const bestSingleGame = sessions.reduce((max, session) => Math.max(max, session.total_score || 0), 0);
    const averageScore = totalScore / totalGames;

    console.log('📊 Calculated correct stats:', { totalGames, totalScore, bestSingleGame, averageScore });

    // Update profile with correct stats
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        total_games_played: totalGames,
        total_score: totalScore,
        best_single_game_score: bestSingleGame,
        average_score: averageScore,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ Profile stats corrected successfully');

    return {
      success: true,
      correctedStats: { totalGames, totalScore, bestSingleGame, averageScore }
    };

  } catch (error: any) {
    console.error('❌ Failed to fix user stats:', error);
    return { success: false, error: error.message };
  }
}; 