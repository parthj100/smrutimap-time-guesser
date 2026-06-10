import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { LeaderboardEntry, LeaderboardFilters } from '@/types/game';
import { Trophy, Medal, Award, Calendar, Clock, Target, Users, X, Star, Crown, Zap } from 'lucide-react';
import { safeQuery, testDatabaseConnectivity } from '@/utils/databaseUtils';
import { useProfileContext } from '@/contexts/ProfileContext';


interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timeframe: 'daily',
    gameMode: 'daily',
    metric: 'best_single_game'
  });
  const { refreshAllProfiles } = useProfileContext();



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

  // Listen for profile updates and refresh leaderboard
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      if (isOpen && event.detail.type === 'all') {
        console.log('🔄 Profile update detected, refreshing leaderboard...');
        fetchLeaderboard();
      }
    };

    window.addEventListener('profileUpdate', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdate', handleProfileUpdate as EventListener);
    };
  }, [isOpen]);

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
      let endDate: Date | null = null;
      if (filters.timeframe !== 'all-time') {
        const now = new Date();
        
        switch (filters.timeframe) {
          case 'daily':
            // Start of today in local timezone
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            // End of today (start of tomorrow)
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'weekly':
            // Start of this week (Monday)
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we need 6 days back
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
            // End of this week (start of next Monday)
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - dayOfWeek));
            break;
          case 'monthly':
            // Start of this month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            // Start of next month
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        }
        
        if (startDate) {
          console.log('📅 Filtering from date:', startDate.toISOString(), 'to date:', endDate?.toISOString(), 'for timeframe:', filters.timeframe);
        }
      }

      // Server-side aggregation via RPC. Replaces fetching up to 2000 raw
      // game_sessions plus a separate user_profiles query and grouping in JS.
      // The timeframe window (startDate/endDate) is still computed above, so the
      // local-timezone behavior is unchanged; we just hand it to the RPC.
      const { data: rpcResult, error: rpcError, timedOut: rpcTimeout } = await safeQuery(
        async () => {
          return await (supabase.rpc as any)('get_session_leaderboard', {
            start_ts: startDate ? startDate.toISOString() : null,
            end_ts: endDate ? endDate.toISOString() : null,
            game_mode_filter: filters.gameMode,
            limit_count: 100,
          });
        },
        { operation: 'Fetch leaderboard aggregation', timeoutMs: 8000 }
      );

      timedOut = rpcTimeout;
      queryError = rpcError || rpcResult?.error;
      if (queryError) {
        throw queryError;
      }

      // Postgres bigint/numeric come over the wire as strings; coerce to numbers
      // so downstream math and display match the previous client-side behavior.
      const aggregated = (((rpcResult?.data as any[]) || [])).map((row: any) => ({
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        center: row.center,
        total_games_played: Number(row.total_games_played) || 0,
        total_score: Number(row.total_score) || 0,
        best_single_game_score: Number(row.best_single_game_score) || 0,
        average_score: Number(row.average_score) || 0,
      }));

      // Preserve the original ranking rules: the daily view always ranks by best
      // single game regardless of the selected metric; other views use the metric.
      const sortByBest =
        (filters.gameMode === 'all' && filters.timeframe === 'daily') ||
        (filters.gameMode !== 'all' && filters.gameMode === 'daily');
      const sortColumn = sortByBest ? 'best_single_game_score' : getDbColumnName(filters.metric);
      aggregated.sort((a: any, b: any) => (b[sortColumn] || 0) - (a[sortColumn] || 0));

      data = aggregated;

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
        center: profile.center,
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
        return 'Best Single Game';
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
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
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
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="all">All Modes</option>
                <option value="daily">Daily Challenge</option>
                <option value="timed">Timed (30s & 4min)</option>
                <option value="random">Normal Mode</option>
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
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="best_single_game">Best Single Game (Round of 5)</option>
                <option value="total_score">Total Accumulated Score</option>
                <option value="games_played">Games Played</option>
                <option value="average_score">Average Score</option>
              </select>
            </div>
            </motion.div>
        </div>

        {/* Leaderboard Content */}
          <div className="px-8 pt-8 pb-4 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8"
                variants={itemVariants}
              >
                {entries.map((entry, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  
                  // Color schemes for different ranks
                  const getCardColors = () => {
                    if (rank === 1) return {
                      card: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 shadow-xl shadow-yellow-100/50',
                      avatar: 'bg-gradient-to-br from-yellow-400 to-amber-500',
                      badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
                      rankIcon: '👑'
                    };
                    if (rank === 2) return {
                      card: 'bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 shadow-xl shadow-slate-100/50',
                      avatar: 'bg-gradient-to-br from-slate-400 to-gray-500',
                      badge: 'bg-gradient-to-r from-slate-400 to-gray-500 text-white',
                      rankIcon: '🥈'
                    };
                    if (rank === 3) return {
                      card: 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-xl shadow-orange-100/50',
                      avatar: 'bg-gradient-to-br from-orange-400 to-amber-600',
                      badge: 'bg-gradient-to-r from-orange-400 to-amber-600 text-white',
                      rankIcon: '🥉'
                    };
                    return {
                      card: 'bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-0',
                      avatar: 'bg-gradient-to-br from-blue-400 to-indigo-500',
                      badge: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
                      rankIcon: rank.toString()
                    };
                  };

                  const colors = getCardColors();

                  return (
                  <motion.div
                  key={entry.id}
                      className={`relative p-6 rounded-2xl transition-all duration-0 group hover:scale-105 ${colors.card}`}
                    variants={itemVariants}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0 }}
                  >
                      {/* Rank Badge */}
                      <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center text-sm font-bold shadow-lg z-10`}>
                        {isTopThree ? colors.rankIcon : rank}
                      </div>



                      {/* Card Content */}
                      <div className="flex flex-col items-center text-center space-y-4">

                  {/* Avatar */}
                        <div className="relative">
                          <div className={`w-20 h-20 rounded-full ${colors.avatar} flex items-center justify-center text-white font-bold text-2xl shadow-lg group-hover:shadow-xl transition-all duration-0`}>
                      {entry.display_name?.[0]?.toUpperCase() || entry.username[0]?.toUpperCase() || 'U'}
                    </div>
                          {isTopThree && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                              {rank === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                              {rank === 2 && <Medal className="w-4 h-4 text-slate-500" />}
                              {rank === 3 && <Award className="w-4 h-4 text-orange-500" />}
                            </div>
                          )}
                  </div>

                  {/* User Info */}
                        <div className="space-y-2">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">
                      {entry.display_name || entry.username}
                          </h3>
                          
                          {/* Center Location */}
                          {entry.center && (
                            <div className="text-sm text-gray-600 font-medium">
                              📍 {entry.center}
                            </div>
                          )}
                          
                          {/* Primary Metric Display */}
                          <div className={`text-3xl font-bold ${isTopThree ? 'text-gray-800' : 'text-gray-700'}`}>
                            {getMetricValue(entry)}
                    </div>
                          
                          <div className="flex items-center justify-center gap-1 text-sm text-gray-500 font-medium">
                            {getMetricIcon()}
                            <span>{getMetricLabel()}</span>
                          </div>
                          

                  </div>

                        {/* Stats Row */}
                        <div className="w-full pt-4 border-t border-gray-200/60">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-gray-700">
                                {entry.total_games_played}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                <Users size={12} />
                                Games
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-gray-700">
                                {Math.round(entry.average_score)}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                                <Target size={12} />
                                Average
                    </div>
                    </div>
                  </div>
                        </div>

                        {/* Progress indicator for top performers */}
                        {isTopThree && (
                          <div className="w-full">
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${
                                  rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                  rank === 2 ? 'bg-gradient-to-r from-slate-400 to-gray-500' :
                                  'bg-gradient-to-r from-orange-400 to-amber-600'
                                }`}
                                style={{ 
                                  width: `${Math.min(100, (entry.total_score / Math.max(...entries.map(e => e.total_score))) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        )}


                </div>
                  </motion.div>
                  );
                })}
              </motion.div>
          )}
        </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 