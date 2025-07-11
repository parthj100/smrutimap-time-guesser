import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { LeaderboardEntry, LeaderboardFilters } from '@/types/game';
import { Trophy, Medal, Award, Calendar, Clock, Target, Users, X, Star, Crown, Zap } from 'lucide-react';
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    },
    exit: { opacity: 0, scale: 0.9 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

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

      // Calculate timeframe dates with proper precision
      let startDate: Date | null = null;
      if (filters.timeframe !== 'all-time') {
        const now = new Date();
        
        switch (filters.timeframe) {
          case 'daily':
            // Start of today in local timezone
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'weekly':
            // Start of this week (Monday)
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we need 6 days back
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
            break;
          case 'monthly':
            // Start of this month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        
        if (startDate) {
          console.log('📅 Filtering from date:', startDate.toISOString(), 'for timeframe:', filters.timeframe);
        }
      }

      if (filters.gameMode === 'all') {
        // For "all modes", we need to query game_sessions for ALL modes within the timeframe
        console.log('📊 Querying all game sessions for all modes with timeframe filter');
        
        const { data: sessionsData, error: sessionsError, timedOut: sessionsTimeout } = await safeQuery(
          async () => {
            let sessionQuery = supabase
              .from('game_sessions' as any)
              .select('*')
              .not('completed_at', 'is', null)
              .order('completed_at', { ascending: false })
              .limit(2000); // Higher limit for all modes

            // Apply timeframe filters
            if (startDate) {
              sessionQuery = sessionQuery.gte('completed_at', startDate.toISOString());
            }

            console.log('📊 Executing all modes query...');
            return await sessionQuery;
          },
          { operation: 'Fetch all game sessions for leaderboard', timeoutMs: 8000 }
        );

        queryError = sessionsError || sessionsData?.error;
        timedOut = sessionsTimeout;
        
        console.log('✅ All modes query result:', { 
          dataLength: sessionsData?.data?.length, 
          error: queryError?.message,
          timedOut,
          timeframe: filters.timeframe,
          startDate: startDate?.toISOString()
        });

        if (queryError) {
          throw queryError;
        }

        if (!sessionsData?.data || sessionsData.data.length === 0) {
          console.log('📭 No game sessions found for timeframe');
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
          { operation: 'Fetch user profiles for all modes', timeoutMs: 3000 }
        );

        if (profilesError || profilesTimeout) {
          console.error('❌ Error fetching profiles for all modes:', profilesError);
          throw profilesError || new Error('Profile fetch timed out');
        }

        if (!profilesData?.data) {
          console.log('📭 No profiles found for session users');
          setEntries([]);
          return;
        }

        console.log('👤 Found profiles for all modes:', profilesData.data.length);

        // Create a map of user sessions for easy lookup
        const userSessionsMap = new Map();
        sessionsData.data.forEach((session: any) => {
          if (!userSessionsMap.has(session.user_id)) {
            userSessionsMap.set(session.user_id, []);
          }
          userSessionsMap.get(session.user_id).push(session);
        });

        // Transform profiles with session data
        const transformedEntries = profilesData.data.map((profile: any) => {
          const userSessions = userSessionsMap.get(profile.user_id) || [];
          
          // Calculate metrics based on sessions in this timeframe
          const totalScore = userSessions.reduce((sum: number, session: any) => sum + (session.total_score || 0), 0);
          const totalGames = userSessions.length;
          const averageScore = totalGames > 0 ? totalScore / totalGames : 0;
          const bestSingleGame = userSessions.reduce((max: number, session: any) => Math.max(max, session.total_score || 0), 0);

          return {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            total_games_played: totalGames,
            total_score: totalScore,
            best_single_game_score: bestSingleGame,
            average_score: averageScore,
            best_daily_score: bestSingleGame,
            games_this_week: totalGames,
            score_this_week: totalScore,
            games_this_month: totalGames,
            score_this_month: totalScore,
          };
        });

        // Sort by the selected metric
        transformedEntries.sort((a: any, b: any) => {
          const aValue = a[getDbColumnName(filters.metric)] || 0;
          const bValue = b[getDbColumnName(filters.metric)] || 0;
          return bValue - aValue;
        });

        data = transformedEntries;

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
            if (startDate) {
              sessionQuery = sessionQuery.gte('completed_at', startDate.toISOString());
            }

            console.log('📊 Executing sessions query...');
            return await sessionQuery;
          },
          { operation: `Fetch ${filters.gameMode} game sessions`, timeoutMs: 8000 } // Increased timeout
        );

        timedOut = sessionsTimeout;
        queryError = sessionsError || sessionsData?.error;
        
        console.log('🎯 Game sessions query result:', { 
          dataLength: sessionsData?.data?.length, 
          error: queryError?.message,
          timedOut,
          gameMode: filters.gameMode,
          timeframe: filters.timeframe,
          startDate: startDate?.toISOString()
        });

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

        if (profilesError || profilesTimeout) {
          console.error('❌ Error fetching profiles for sessions:', profilesError);
          throw profilesError || new Error('Profile fetch timed out');
        }

        if (!profilesData?.data) {
          console.log('📭 No profiles found for session users');
          setEntries([]);
          return;
        }
        
        console.log('👤 Found profiles:', profilesData.data.length);

        // Create a map of user sessions for easy lookup
        const userSessionsMap = new Map();
        sessionsData.data.forEach((session: any) => {
          if (!userSessionsMap.has(session.user_id)) {
            userSessionsMap.set(session.user_id, []);
          }
          userSessionsMap.get(session.user_id).push(session);
        });

        // Transform profiles with session data
        const transformedEntries = profilesData.data.map((profile: any) => {
          const userSessions = userSessionsMap.get(profile.user_id) || [];
          
          // Calculate metrics based on sessions in this timeframe/mode
          const totalScore = userSessions.reduce((sum: number, session: any) => sum + (session.total_score || 0), 0);
          const totalGames = userSessions.length;
          const averageScore = totalGames > 0 ? totalScore / totalGames : 0;
          const bestSingleGame = userSessions.reduce((max: number, session: any) => Math.max(max, session.total_score || 0), 0);

          return {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            total_games_played: totalGames,
            total_score: totalScore,
            best_single_game_score: bestSingleGame,
            average_score: averageScore,
            best_daily_score: bestSingleGame,
            games_this_week: totalGames,
            score_this_week: totalScore,
            games_this_month: totalGames,
            score_this_month: totalScore,
          };
        });

        // Sort by the selected metric
        transformedEntries.sort((a: any, b: any) => {
          const aValue = a[getDbColumnName(filters.metric)] || 0;
          const bValue = b[getDbColumnName(filters.metric)] || 0;
          return bValue - aValue;
        });

        data = transformedEntries;
      }

      if (!data || data.length === 0) {
        console.log('📭 No leaderboard data found');
        setEntries([]);
        return;
      }

      // Transform data to match LeaderboardEntry interface
      const transformedEntries = data.map((profile: any) => ({
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
        return <Crown className="w-7 h-7 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-7 h-7 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-600">{rank}</span>
          </div>
        );
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

  const getMetricIcon = () => {
    switch (filters.metric) {
      case 'total_score':
        return <Star className="w-4 h-4" />;
      case 'average_score':
        return <Target className="w-4 h-4" />;
      case 'best_single_game':
        return <Zap className="w-4 h-4" />;
      case 'games_played':
        return <Users className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-indigo-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <AnimatePresence>
        <motion.div 
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-white/20"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        {/* Header */}
          <div className="bg-gradient-to-r from-[#ea384c] via-red-500 to-pink-600 text-white p-8">
            <motion.div 
              className="flex items-center justify-between"
              variants={itemVariants}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold">Leaderboard</h2>
                  <p className="text-white/80 text-lg">Compete with players worldwide</p>
                </div>
              </div>
              <motion.button
              onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
              </motion.button>
            </motion.div>

          {/* Filters */}
            <motion.div 
              className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={itemVariants}
            >
            {/* Timeframe Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/90 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                Timeframe
              </label>
              <select
                value={filters.timeframe}
                onChange={(e) => setFilters(prev => ({ ...prev, timeframe: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
              >
                <option value="all-time">All Time</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
                <option value="daily">Today</option>
              </select>
            </div>

            {/* Game Mode Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/90 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                Game Mode
              </label>
              <select
                value={filters.gameMode}
                onChange={(e) => setFilters(prev => ({ ...prev, gameMode: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
              >
                <option value="all">All Modes</option>
                <option value="random">Random</option>
                <option value="daily">Daily Challenge</option>
                <option value="timed">Timed</option>
              </select>
            </div>

            {/* Metric Filter */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/90 flex items-center gap-2">
                  {getMetricIcon()}
                Ranking By
              </label>
              <select
                value={filters.metric}
                onChange={(e) => setFilters(prev => ({ ...prev, metric: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200"
              >
                <option value="total_score">Total Score</option>
                <option value="average_score">Average Score</option>
                <option value="best_single_game">Best Single Game</option>
                <option value="games_played">Games Played</option>
              </select>
            </div>
            </motion.div>
        </div>

        {/* Leaderboard Content */}
          <div className="p-8 max-h-[60vh] overflow-y-auto">
          {loading ? (
              <motion.div 
                className="flex flex-col items-center justify-center py-16"
                variants={itemVariants}
              >
                <div className="w-12 h-12 animate-spin rounded-full border-2 border-[#ea384c] border-t-transparent mb-4"></div>
                <span className="text-gray-600 text-lg">Loading leaderboard...</span>
                <span className="text-gray-400 text-sm mt-2">Fetching the latest rankings</span>
              </motion.div>
            ) : error ? (
              <motion.div 
                className="text-center py-16"
                variants={itemVariants}
              >
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-red-400" />
            </div>
                <h3 className="text-2xl font-semibold text-red-600 mb-3">
                Error Loading Leaderboard
              </h3>
                <p className="text-red-500 mb-6 max-w-md mx-auto">
                {error}
              </p>
                <div className="space-y-2 text-sm text-gray-600 mb-6">
                  <p className="font-medium">Possible causes:</p>
                  <ul className="list-disc list-inside space-y-1 text-left max-w-sm mx-auto">
                  <li>Internet connection issues</li>
                  <li>Database server temporarily unavailable</li>
                  <li>Query timeout (server overloaded)</li>
                </ul>
              </div>
                <motion.button
                onClick={() => {
                  console.log('🔄 Manual leaderboard refresh triggered');
                  fetchLeaderboard();
                }}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                Try Again
                </motion.button>
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.div 
                className="text-center py-16"
                variants={itemVariants}
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-gray-400" />
            </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">
                {filters.gameMode === 'all' 
                  ? 'No Players Found' 
                  : `No ${filters.gameMode.charAt(0).toUpperCase() + filters.gameMode.slice(1)} Games`
                }
              </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {filters.gameMode === 'all' 
                  ? 'No player profiles found in the database.'
                  : `No games have been completed in ${filters.gameMode} mode${filters.timeframe !== 'all-time' ? ` ${filters.timeframe.replace('-', ' ')}` : ''}.`
                }
              </p>
              {filters.gameMode !== 'all' && (
                  <div className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                  <p>Try switching to "All Modes" to see overall rankings,</p>
                  <p>or play some {filters.gameMode} games to populate this leaderboard!</p>
                </div>
              )}
              
                <motion.button
                onClick={() => {
                  console.log('🔄 Manual leaderboard refresh triggered');
                  fetchLeaderboard();
                }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                Refresh Data
                </motion.button>
              </motion.div>
          ) : (
              <motion.div 
                className="space-y-3"
                variants={itemVariants}
              >
              {entries.map((entry, index) => (
                  <motion.div
                  key={entry.id}
                    className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                    index < 3 
                        ? 'bg-gradient-to-r from-yellow-50/90 via-orange-50/90 to-yellow-50/90 backdrop-blur-sm border-2 border-yellow-200/50 shadow-lg' 
                        : 'bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-white/20 shadow-sm hover:shadow-md'
                    }`}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Top 3 glow effect */}
                    {index < 3 && (
                      <div className={`absolute inset-0 rounded-2xl ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400/10 to-orange-400/10' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300/10 to-gray-400/10' :
                        'bg-gradient-to-r from-amber-400/10 to-orange-400/10'
                      }`} />
                    )}
                    
                    <div className="relative flex items-center gap-6 p-6">
                  {/* Rank */}
                      <div className="flex-shrink-0 w-14 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                          index < 3 ? 'bg-gradient-to-br from-[#ea384c] to-red-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                      {entry.display_name?.[0]?.toUpperCase() || entry.username[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-grow">
                        <div className="font-bold text-gray-900 text-lg">
                      {entry.display_name || entry.username}
                    </div>
                        <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {entry.total_games_played} games
                          </span>
                          <span className="flex items-center gap-1">
                            <Target size={14} />
                            Avg: {Math.round(entry.average_score)}
                          </span>
                    </div>
                  </div>

                  {/* Metric Value */}
                  <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          index < 3 ? 'text-[#ea384c]' : 'text-gray-700'
                        }`}>
                      {getMetricValue(entry)}
                    </div>
                        <div className="text-sm text-gray-500 font-medium flex items-center justify-end gap-1">
                          {getMetricIcon()}
                      {getMetricLabel()}
                    </div>
                  </div>
                </div>
                  </motion.div>
              ))}
              </motion.div>
          )}
        </div>

        {/* Footer */}
          <motion.div 
            className="bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm px-8 py-6 text-center border-t border-white/20"
            variants={itemVariants}
          >
            <p className="text-sm text-gray-600 font-medium">
              🏆 Rankings update in real-time • Play more games to climb the leaderboard!
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 