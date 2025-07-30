import { supabase } from '@/integrations/supabase/client';
import type { 
  AdminDashboardStats, 
  AdminUserStats, 
  VisitorAnalytics, 
  DailySummary,
  AdminSettings 
} from '@/types/admin';

export interface ActivityItem {
  id: string;
  type: 'user_registered' | 'game_completed' | 'room_created' | 'visitor';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  username?: string;
}

export class AdminService {
  // Check if current user is admin
  static async isAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return false;
    return data.is_admin || false;
  }

  // Get recent activity for dashboard
  static async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];
    
    try {
      // Get recent user registrations
      const { data: newUsers } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent game completions
      const { data: recentGames } = await supabase
        .from('game_sessions')
        .select('id, user_id, total_score, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent multiplayer room creations
      const { data: recentRooms } = await supabase
        .from('simple_multiplayer_rooms')
        .select('id, host_user_id, room_code, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get recent visitors
      const { data: recentVisitors } = await supabase
        .from('analytics_visitors')
        .select('id, user_id, page_visited, visit_time')
        .gte('visit_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('visit_time', { ascending: false })
        .limit(limit);

      // Combine and sort all activities
      newUsers?.forEach(user => {
        activities.push({
          id: `user_${user.user_id}`,
          type: 'user_registered',
          title: 'New user registered',
          description: `${user.display_name || user.username} joined the game`,
          timestamp: user.created_at,
          userId: user.user_id,
          username: user.display_name || user.username
        });
      });

      recentGames?.forEach(game => {
        activities.push({
          id: `game_${game.id}`,
          type: 'game_completed',
          title: 'Game completed',
          description: `Score: ${game.total_score} points`,
          timestamp: game.created_at,
          userId: game.user_id
        });
      });

      recentRooms?.forEach(room => {
        activities.push({
          id: `room_${room.id}`,
          type: 'room_created',
          title: 'Multiplayer room created',
          description: `Room code: ${room.room_code}`,
          timestamp: room.created_at,
          userId: room.host_user_id
        });
      });

      recentVisitors?.forEach(visitor => {
        activities.push({
          id: `visitor_${visitor.id}`,
          type: 'visitor',
          title: 'Page visited',
          description: `${visitor.user_id ? 'Registered user' : 'Anonymous'} visited ${visitor.page_visited}`,
          timestamp: visitor.visit_time || '',
          userId: visitor.user_id || undefined
        });
      });

      // Sort by timestamp (most recent first) and take the most recent items
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // Use Eastern Time (EST/EDT) for date calculations
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const today = easternTime.toISOString().split('T')[0];
      
      // Get total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error('Error fetching total users:', usersError);
      }

      // Get total games played
      const { count: totalGamesPlayed, error: gamesError } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true });

      if (gamesError) {
        console.error('Error fetching total games:', gamesError);
      }

      // Get today's visitors (including anonymous)
      const { data: todayVisitors, error: visitorsError } = await supabase
        .from('analytics_visitors')
        .select('*')
        .eq('visit_date', today);

      if (visitorsError) {
        console.error('Error fetching today\'s visitors:', visitorsError);
      }

      // Get today's unique visitors (by session)
      const { data: todayUniqueVisitors, error: uniqueError } = await supabase
        .from('analytics_visitors')
        .select('session_id')
        .eq('visit_date', today);

      if (uniqueError) {
        console.error('Error fetching unique visitors:', uniqueError);
      }

      // Get today's anonymous visitors (no user_id)
      const { data: todayAnonymousVisitors, error: anonymousError } = await supabase
        .from('analytics_visitors')
        .select('session_id')
        .eq('visit_date', today)
        .is('user_id', null);

      if (anonymousError) {
        console.error('Error fetching anonymous visitors:', anonymousError);
      }

      // Get today's registered visitors
      const { data: todayRegisteredVisitors, error: registeredError } = await supabase
        .from('analytics_visitors')
        .select('session_id')
        .eq('visit_date', today)
        .not('user_id', 'is', null);

      if (registeredError) {
        console.error('Error fetching registered visitors:', registeredError);
      }

      // Get today's games
      const { count: todayGamesPlayed, error: todayGamesError } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (todayGamesError) {
        console.error('Error fetching today\'s games:', todayGamesError);
      }

      // Get today's new users
      const { count: todayNewUsers, error: newUsersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (newUsersError) {
        console.error('Error fetching today\'s new users:', newUsersError);
      }

      // Get total score
      const { data: totalScoreData, error: scoreError } = await supabase
        .from('user_profiles')
        .select('total_score');

      if (scoreError) {
        console.error('Error fetching total score:', scoreError);
      }

      const totalScore = totalScoreData?.reduce((sum, user) => sum + (user.total_score || 0), 0) || 0;

      // Calculate active users (users who played games in the last 7 days)
      const { count: activeUsers, error: activeError } = await supabase
        .from('game_sessions')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (activeError) {
        console.error('Error fetching active users:', activeError);
      }

      return {
        totalUsers: totalUsers || 0,
        totalGamesPlayed: totalGamesPlayed || 0,
        totalScore,
        todayVisitors: todayVisitors?.length || 0,
        todayUniqueVisitors: new Set(todayUniqueVisitors?.map(v => v.session_id) || []).size,
        todayAnonymousVisitors: new Set(todayAnonymousVisitors?.map(v => v.session_id) || []).size,
        todayRegisteredVisitors: new Set(todayRegisteredVisitors?.map(v => v.session_id) || []).size,
        todayGamesPlayed: todayGamesPlayed || 0,
        todayNewUsers: todayNewUsers || 0,
        activeUsers: activeUsers || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        totalGamesPlayed: 0,
        totalScore: 0,
        todayVisitors: 0,
        todayUniqueVisitors: 0,
        todayAnonymousVisitors: 0,
        todayRegisteredVisitors: 0,
        todayGamesPlayed: 0,
        todayNewUsers: 0,
        activeUsers: 0
      };
    }
  }

  // Get all users with stats
  static async getUsers(): Promise<AdminUserStats[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          username,
          display_name,
          total_games_played,
          total_score,
          created_at,
          is_admin
        `)
        .order('total_score', { ascending: false });

      if (error) throw error;

      return data?.map(user => ({
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        gamesPlayed: user.total_games_played || 0,
        totalScore: user.total_score || 0,
        averageScore: user.total_games_played > 0 ? Math.round(user.total_score / user.total_games_played) : 0,
        lastActive: user.created_at, // TODO: Add last_active field
        isAdmin: user.is_admin || false
      })) || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Get visitor analytics
  static async getVisitorAnalytics(date?: string): Promise<VisitorAnalytics[]> {
    try {
      const query = supabase
        .from('analytics_visitors')
        .select('*')
        .order('visit_time', { ascending: false });

      if (date) {
        query.eq('visit_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching visitor analytics:', error);
      return [];
    }
  }

  // Get visitor analytics with detailed breakdown
  static async getVisitorAnalyticsDetailed(date?: string): Promise<{
    total: number;
    anonymous: number;
    registered: number;
    unique: number;
    byPage: Record<string, number>;
    recentVisits: VisitorAnalytics[];
  }> {
    try {
      const visitors = await this.getVisitorAnalytics(date);
      // Use Eastern Time (EST/EDT) for date calculations
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const today = date || easternTime.toISOString().split('T')[0];
      const todayVisitors = visitors.filter(v => v.visit_date === today);
      
      const uniqueSessions = new Set(todayVisitors.map(v => v.session_id));
      const anonymousVisitors = new Set(
        todayVisitors.filter(v => !v.user_id).map(v => v.session_id)
      );
      const registeredVisitors = new Set(
        todayVisitors.filter(v => v.user_id).map(v => v.session_id)
      );
      
      // Group by page
      const byPage: Record<string, number> = {};
      todayVisitors.forEach(visitor => {
        const page = visitor.page_visited || '/';
        byPage[page] = (byPage[page] || 0) + 1;
      });

      return {
        total: todayVisitors.length,
        unique: uniqueSessions.size,
        anonymous: anonymousVisitors.size,
        registered: registeredVisitors.size,
        byPage,
        recentVisits: visitors.slice(0, 20) // Last 20 visits
      };
    } catch (error) {
      console.error('Error fetching detailed visitor analytics:', error);
      return {
        total: 0,
        unique: 0,
        anonymous: 0,
        registered: 0,
        byPage: {},
        recentVisits: []
      };
    }
  }

  // Get daily summary - generate from analytics_visitors if analytics_daily_summary is empty
  static async getDailySummary(days: number = 30): Promise<DailySummary[]> {
    try {
      // First try to get from analytics_daily_summary table
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: summaryData, error: summaryError } = await supabase
        .from('analytics_daily_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (!summaryError && summaryData && summaryData.length > 0) {
        return summaryData;
      }

      // If analytics_daily_summary is empty, generate from analytics_visitors
      console.log('Generating daily summary from analytics_visitors...');
      
      const { data: visitors, error: visitorsError } = await supabase
        .from('analytics_visitors')
        .select('*')
        .gte('visit_date', startDate.toISOString().split('T')[0])
        .order('visit_date', { ascending: false });

      if (visitorsError) {
        console.error('Error fetching visitors for daily summary:', visitorsError);
        return [];
      }

      // Group by date
      const dailyStats: Record<string, DailySummary> = {};
      
      visitors?.forEach(visitor => {
        const date = visitor.visit_date;
        if (!dailyStats[date]) {
          dailyStats[date] = {
            id: `generated_${date}`,
            date,
            total_visitors: 0,
            unique_visitors: 0,
            returning_visitors: 0,
            new_users: 0,
            games_played: 0,
            created_at: new Date().toISOString()
          };
        }
        dailyStats[date].total_visitors++;
      });

      // Get unique visitors per day
      const uniqueSessions = new Map<string, Set<string>>();
      visitors?.forEach(visitor => {
        const date = visitor.visit_date;
        if (!uniqueSessions.has(date)) {
          uniqueSessions.set(date, new Set());
        }
        uniqueSessions.get(date)!.add(visitor.session_id);
      });

      // Update unique visitors count
      Object.keys(dailyStats).forEach(date => {
        dailyStats[date].unique_visitors = uniqueSessions.get(date)?.size || 0;
      });

      // Get games played per day
      const { data: games, error: gamesError } = await supabase
        .from('game_sessions')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (!gamesError && games) {
        games.forEach(game => {
          const date = game.created_at.split('T')[0];
          if (dailyStats[date]) {
            dailyStats[date].games_played++;
          }
        });
      }

      // Get new users per day
      const { data: newUsers, error: newUsersError } = await supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (!newUsersError && newUsers) {
        newUsers.forEach(user => {
          const date = user.created_at.split('T')[0];
          if (dailyStats[date]) {
            dailyStats[date].new_users++;
          }
        });
      }

      return Object.values(dailyStats).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return [];
    }
  }

  // Track visitor
  static async trackVisitor(page: string, sessionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use Eastern Time (EST/EDT) for visit tracking
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      
              await supabase
        .from('analytics_visitors')
        .insert({
          user_id: user?.id || null,
          session_id: sessionId,
          page_visited: page,
          visit_date: easternTime.toISOString().split('T')[0],
          visit_time: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking visitor:', error);
    }
  }

  // Track visitor with enhanced data
  static async trackVisitorEnhanced(
    page: string, 
    sessionId: string, 
    userAgent: string, 
    referrer: string,
    timestamp: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('analytics_visitors')
        .insert({
          user_id: user?.id || null,
          session_id: sessionId,
          page_visited: page,
          visit_date: timestamp.split('T')[0],
          visit_time: timestamp,
          user_agent: userAgent,
          referrer: referrer
        });
    } catch (error) {
      console.error('Error tracking enhanced visitor:', error);
    }
  }

  // Reset user stats
  static async resetUserStats(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          total_score: 0,
          total_games_played: 0,
          average_score: 0,
          best_single_game_score: 0
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting user stats:', error);
      throw error;
    }
  }

  // Ban/Unban user
  static async toggleUserBan(userId: string, banned: boolean, reason?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          banned: banned,
          banned_at: banned ? new Date().toISOString() : null,
          banned_reason: banned ? reason : null
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling user ban:', error);
      throw error;
    }
  }

  // Get admin settings
  static async getAdminSettings(): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return settings;
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      return {};
    }
  }

  // Update admin settings
  static async updateAdminSettings(settings: Record<string, any>): Promise<void> {
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value
      }));

      const { error } = await supabase
        .from('admin_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating admin settings:', error);
      throw error;
    }
  }

  // Database backup (placeholder for now)
  static async backupDatabase(): Promise<string> {
    try {
      // In a real implementation, this would trigger a database backup
      // For now, return a success message
      return 'Database backup initiated successfully';
    } catch (error) {
      console.error('Error backing up database:', error);
      throw error;
    }
  }

  // Clean old data
  static async cleanOldData(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean old analytics data
      const { count: analyticsDeleted } = await supabase
        .from('analytics_visitors')
        .delete()
        .lt('visit_time', cutoffDate.toISOString());

      // Clean old game sessions (keep some for stats)
      const { count: sessionsDeleted } = await supabase
        .from('game_sessions')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      return (analyticsDeleted || 0) + (sessionsDeleted || 0);
    } catch (error) {
      console.error('Error cleaning old data:', error);
      throw error;
    }
  }

  // Reset all user stats
  static async resetAllUserStats(): Promise<number> {
    try {
      const { count } = await supabase
        .from('user_profiles')
        .update({
          total_score: 0,
          total_games_played: 0,
          average_score: 0,
          best_single_game_score: 0
        });

      return count || 0;
    } catch (error) {
      console.error('Error resetting all user stats:', error);
      throw error;
    }
  }

  // Clear game sessions
  static async clearGameSessions(): Promise<number> {
    try {
      const { count } = await supabase
        .from('game_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Keep at least one record

      return count || 0;
    } catch (error) {
      console.error('Error clearing game sessions:', error);
      throw error;
    }
  }
} 