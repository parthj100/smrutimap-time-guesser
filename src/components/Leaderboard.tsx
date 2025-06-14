import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeaderboardEntry, LeaderboardFilters } from '@/types/game';
import { Trophy, Medal, Award, Calendar, Clock, Target, Users, X } from 'lucide-react';
import { safeQuery, testDatabaseConnectivity } from '@/utils/databaseUtils';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timeframe: 'all-time',
    gameMode: 'all',
    metric: 'total_score'
  });

  // Helper function to map metric names to database column names
  const getDbColumnName = (metric: string) => {
    switch (metric) {
      case 'games_played':
        return 'total_games_played';
      case 'best_single_game':
        return 'best_single_game_score';
      default:
        return metric; // total_score, average_score remain the same
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, filters]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏆 Starting leaderboard fetch with filters:', filters);

      // Test connectivity first
      const isConnected = await testDatabaseConnectivity();
      if (!isConnected) {
        throw new Error('Database connectivity test failed. Check your internet connection and Supabase configuration.');
      }

      let data;
      let queryError;
      let timedOut = false;

      if (filters.gameMode === 'all') {
        // For "all modes", continue using user_profiles with aggregated stats
        console.log('📊 Querying user_profiles for all modes');
        
        const { data: profilesData, error: profilesError, timedOut: profilesTimeout } = await safeQuery(
          async () => {
            return await supabase
              .from('user_profiles' as any)
              .select('*')
              .order(getDbColumnName(filters.metric), { ascending: false })
              .limit(50);
          },
          { operation: 'Fetch user profiles for leaderboard', timeoutMs: 5000 }
        );

        data = profilesData?.data;
        queryError = profilesError || profilesData?.error;
        timedOut = profilesTimeout;
        
        console.log('✅ User profiles query result:', { 
          dataLength: data?.length, 
          error: queryError?.message,
          timedOut,
          sampleData: data?.slice(0, 2) // Show first 2 profiles
        });

      } else {
        // For specific game modes, query game_sessions
        console.log(`🎮 Querying game_sessions for mode: ${filters.gameMode}`);
        
        // Note: Previous issue was RLS policy limiting sessions to current user only
        // Fixed by adding "Public can view completed sessions for leaderboard" policy
        
        const { data: sessionsData, error: sessionsError, timedOut: sessionsTimeout } = await safeQuery(
          async () => {
            // Build the query - more explicit approach
            console.log('🔧 Building query for game mode:', filters.gameMode);
            
            let sessionQuery = supabase
              .from('game_sessions' as any)
              .select('*')
              .eq('game_mode', filters.gameMode)
              .not('completed_at', 'is', null)
              .order('completed_at', { ascending: false })
              .limit(1000);

            // Apply timeframe filters
            if (filters.timeframe !== 'all-time') {
              const now = new Date();
              let startDate: Date;

              switch (filters.timeframe) {
                case 'daily':
                  startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  break;
                case 'weekly':
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  break;
                case 'monthly':
                  startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                  break;
                default:
                  startDate = new Date(0); // All time fallback
              }

              console.log('📅 Filtering from date:', startDate.toISOString());
              sessionQuery = sessionQuery.gte('completed_at', startDate.toISOString());
            }

            console.log('📊 Executing sessions query...');
            const result = await sessionQuery;
            console.log('📊 Raw query result:', result);
            
            // Additional validation
            if (result.data && Array.isArray(result.data)) {
              console.log('✅ Sessions data is valid array with length:', result.data.length);
              console.log('📋 All session user_ids:', result.data.map((s: any) => s.user_id));
              console.log('📋 All session details:', result.data.map((s: any) => ({ 
                id: s.id, 
                user_id: s.user_id, 
                score: s.total_score,
                completed: s.completed_at 
              })));
            } else {
              console.warn('⚠️ Sessions data is not a valid array:', result.data);
            }
            
            return result;
          },
          { operation: `Fetch ${filters.gameMode} game sessions`, timeoutMs: 8000 } // Increased timeout
        );

        timedOut = sessionsTimeout;
        queryError = sessionsError || sessionsData?.error;
        
        console.log('🎯 Game sessions query result:', { 
          dataLength: sessionsData?.data?.length, 
          error: queryError?.message,
          timedOut,
          sampleData: sessionsData?.data?.slice(0, 2), // Show first 2 sessions
          allSessionData: sessionsData?.data // Show all session data for debugging
        });
        
        // DEBUG: Let's also try a direct query to compare
        try {
          const directQuery = await supabase
            .from('game_sessions' as any)
            .select('*')
            .eq('game_mode', filters.gameMode)
            .not('completed_at', 'is', null);
          
          console.log('🔍 Direct comparison query result:', {
            directDataLength: directQuery.data?.length,
            directError: directQuery.error?.message,
            directData: directQuery.data
          });
        } catch (directError) {
          console.log('🔍 Direct query failed:', directError);
        }

        if (queryError) {
          throw queryError;
        }

        if (!sessionsData?.data || sessionsData.data.length === 0) {
          console.log('📭 No game sessions found for this mode/timeframe');
          setEntries([]);
          return;
        }

        // Get unique user IDs from sessions
        const userIds = [...new Set(sessionsData.data.map((session: any) => session.user_id))];
        console.log('👥 Found unique users:', userIds.length, 'User IDs:', userIds);

        // Get user profiles for these users
        const { data: profilesData, error: profilesError, timedOut: profilesTimeout } = await safeQuery(
          async () => {
            return await supabase
              .from('user_profiles' as any)
              .select('*')
              .in('user_id', userIds);
          },
          { operation: 'Fetch user profiles for sessions', timeoutMs: 3000 }
        );

        console.log('👤 User profiles query result:', { 
          dataLength: profilesData?.data?.length, 
          error: profilesError?.message || profilesData?.error?.message,
          timedOut: profilesTimeout
        });

        if (profilesError || profilesTimeout) {
          console.warn('⚠️ Profile fetch failed, continuing with session data only');
        }

        // Create profiles map for easy lookup
        const profilesMap = new Map();
        (profilesData?.data || []).forEach((profile: any) => {
          profilesMap.set(profile.user_id, profile);
        });
        
        console.log('🗺️ Profiles map created:', {
          profilesMapSize: profilesMap.size,
          profilesData: profilesData?.data,
          userIdsFromSessions: userIds
        });

        // Group sessions by user and calculate statistics
        const userStats = new Map();
        
        sessionsData.data.forEach((session: any) => {
          const userId = session.user_id;
          const profile = profilesMap.get(userId);
          
          console.log(`📊 Processing session for user ${userId}:`, {
            sessionId: session.id,
            hasProfile: !!profile,
            profileUsername: profile?.username
          });
          
          if (!userStats.has(userId)) {
            userStats.set(userId, {
              id: profile?.id || userId,
              username: profile?.username || `user_${userId.slice(0, 8)}`,
              display_name: profile?.display_name || profile?.username || `User ${userId.slice(0, 8)}`,
              avatar_url: profile?.avatar_url,
              sessions: [],
              total_score: 0,
              total_games_played: 0,
              best_single_game_score: 0,
            });
          }

          const userStat = userStats.get(userId);
          userStat.sessions.push(session);
          userStat.total_score += session.total_score || 0;
          userStat.total_games_played += 1;
          userStat.best_single_game_score = Math.max(
            userStat.best_single_game_score,
            session.total_score || 0
          );
        });

        console.log('📈 Calculated user stats:', {
          userStatsSize: userStats.size,
          userStatsEntries: Array.from(userStats.entries())
        });

        // Convert to array and calculate averages
        data = Array.from(userStats.values()).map((userStat: any) => ({
          ...userStat,
          average_score: userStat.total_games_played > 0 
            ? userStat.total_score / userStat.total_games_played 
            : 0,
        }));
      }

      if (timedOut) {
        throw new Error('Database query timed out. This may indicate connectivity issues or server problems.');
      }

      if (queryError) {
        throw queryError;
      }

      // Sort by selected metric
      if (data) {
        console.log('🔢 Sorting by metric:', filters.metric);
        data.sort((a: any, b: any) => {
          const aValue = a[filters.metric] || 0;
          const bValue = b[filters.metric] || 0;
          return bValue - aValue; // Descending order
        });

        // Limit to top 50
        data = data.slice(0, 50);
        console.log('🏆 Final leaderboard entries:', data.length);
      }

      // Transform data to match LeaderboardEntry interface
      const transformedEntries: LeaderboardEntry[] = (data || []).map((profile: any, index: number) => ({
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        total_games_played: profile.total_games_played || 0,
        total_score: profile.total_score || 0,
        best_single_game_score: profile.best_single_game_score || 0,
        average_score: profile.average_score || 0,
        best_daily_score: profile.best_single_game_score || 0, // For specific modes, this equals best single game
        games_this_week: profile.total_games_played || 0, // For filtered results, this equals total games in timeframe
        score_this_week: profile.total_score || 0, // For filtered results, this equals total score in timeframe
        games_this_month: profile.total_games_played || 0, // For filtered results, this equals total games in timeframe
        score_this_month: profile.total_score || 0, // For filtered results, this equals total score in timeframe
      }));

      setEntries(transformedEntries);
      console.log('✅ Leaderboard updated with', transformedEntries.length, 'entries');
      
    } catch (error: any) {
      console.error('❌ Error fetching leaderboard:', error);
      setError(error.message || 'Failed to fetch leaderboard data');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-semibold">{rank}</span>;
    }
  };

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (filters.metric) {
      case 'total_score':
        return entry.total_score.toLocaleString();
      case 'average_score':
        return Math.round(entry.average_score).toLocaleString();
      case 'best_single_game':
        return entry.best_single_game_score.toLocaleString();
      case 'games_played':
        return entry.total_games_played.toLocaleString();
      default:
        return '0';
    }
  };

  const getMetricLabel = () => {
    switch (filters.metric) {
      case 'total_score':
        return 'Total Score';
      case 'average_score':
        return 'Average Score';
      case 'best_single_game':
        return 'Best Game';
      case 'games_played':
        return 'Games Played';
      default:
        return 'Score';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea384c] to-[#d63384] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Leaderboard</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Timeframe Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Timeframe
              </label>
              <select
                value={filters.timeframe}
                onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30"
              >
                <option value="all-time">All Time</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
                <option value="daily">Today</option>
              </select>
            </div>

            {/* Game Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                Game Mode
              </label>
              <select
                value={filters.gameMode}
                onChange={(e) => setFilters(prev => ({ ...prev, gameMode: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30"
              >
                <option value="all">All Modes</option>
                <option value="random">Random</option>
                <option value="daily">Daily Challenge</option>
                <option value="timed">Timed</option>
              </select>
            </div>

            {/* Metric Filter */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Ranking By
              </label>
              <select
                value={filters.metric}
                onChange={(e) => setFilters(prev => ({ ...prev, metric: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30"
              >
                <option value="total_score">Total Score</option>
                <option value="average_score">Average Score</option>
                <option value="best_single_game">Best Single Game</option>
                <option value="games_played">Games Played</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 animate-spin rounded-full border-2 border-[#ea384c] border-t-transparent"></div>
              <span className="ml-3 text-gray-600">Loading leaderboard...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-600 mb-2">
                Error Loading Leaderboard
              </h3>
              <p className="text-red-500 mb-4">
                {error}
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Possible causes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Internet connection issues</li>
                  <li>Database server temporarily unavailable</li>
                  <li>Query timeout (server overloaded)</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  console.log('🔄 Manual leaderboard refresh triggered');
                  fetchLeaderboard();
                }}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {filters.gameMode === 'all' 
                  ? 'No Players Found' 
                  : `No ${filters.gameMode.charAt(0).toUpperCase() + filters.gameMode.slice(1)} Games`
                }
              </h3>
              <p className="text-gray-500 mb-4">
                {filters.gameMode === 'all' 
                  ? 'No player profiles found in the database.'
                  : `No games have been completed in ${filters.gameMode} mode${filters.timeframe !== 'all-time' ? ` ${filters.timeframe.replace('-', ' ')}` : ''}.`
                }
              </p>
              {filters.gameMode !== 'all' && (
                <div className="text-sm text-gray-400">
                  <p>Try switching to "All Modes" to see overall rankings,</p>
                  <p>or play some {filters.gameMode} games to populate this leaderboard!</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  console.log('🔄 Manual leaderboard refresh triggered');
                  fetchLeaderboard();
                }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                    index < 3 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#ea384c] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {entry.display_name?.[0]?.toUpperCase() || entry.username[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-grow">
                    <div className="font-semibold text-gray-900">
                      {entry.display_name || entry.username}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.total_games_played} games • Avg: {Math.round(entry.average_score)}
                    </div>
                  </div>

                  {/* Metric Value */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#ea384c]">
                      {getMetricValue(entry)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getMetricLabel()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
          Rankings update in real-time • Play more games to climb the leaderboard!
        </div>
      </div>
    </div>
  );
}; 