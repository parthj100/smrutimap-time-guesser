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
    const today = new Date().toISOString().split('T')[0];
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    // Get total games played
    const { count: totalGamesPlayed } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true });

    // Get today's visitors (including anonymous)
    const { data: todayVisitors } = await supabase
      .from('analytics_visitors')
      .select('*')
      .eq('visit_date', today);

    // Get today's unique visitors (by session)
    const { data: todayUniqueVisitors } = await supabase
      .from('analytics_visitors')
      .select('session_id')
      .eq('visit_date', today);

    // Get today's anonymous visitors (no user_id)
    const { data: todayAnonymousVisitors } = await supabase
      .from('analytics_visitors')
      .select('session_id')
      .eq('visit_date', today)
      .is('user_id', null);

    // Get today's registered visitors
    const { data: todayRegisteredVisitors } = await supabase
      .from('analytics_visitors')
      .select('session_id')
      .eq('visit_date', today)
      .not('user_id', 'is', null);

    // Get today's games
    const { count: todayGamesPlayed } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    // Get today's new users
    const { count: todayNewUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    // Get total score
    const { data: totalScoreData } = await supabase
      .from('user_profiles')
      .select('total_score');

    const totalScore = totalScoreData?.reduce((sum, user) => sum + (user.total_score || 0), 0) || 0;

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
      activeUsers: 0 // TODO: Implement active users tracking
    };
  }

  // Get all users with stats
  static async getUsers(): Promise<AdminUserStats[]> {
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
  }

  // Get visitor analytics
  static async getVisitorAnalytics(date?: string): Promise<VisitorAnalytics[]> {
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
    const visitors = await this.getVisitorAnalytics(date);
    const today = date || new Date().toISOString().split('T')[0];
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
  }

  // Get daily summary
  static async getDailySummary(days: number = 30): Promise<DailySummary[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_daily_summary')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Track visitor
  static async trackVisitor(page: string, sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase
      .from('analytics_visitors')
      .insert({
        user_id: user?.id || null,
        session_id: sessionId,
        page_visited: page,
        visit_date: new Date().toISOString().split('T')[0],
        visit_time: new Date().toISOString()
      });
  }

  // Track visitor with enhanced data
  static async trackVisitorEnhanced(
    page: string, 
    sessionId: string, 
    userAgent: string, 
    referrer: string,
    timestamp: string
  ): Promise<void> {
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
  }

  // Reset user stats
  static async resetUserStats(userId: string): Promise<void> {
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
  }

  // Ban/Unban user
  static async toggleUserBan(userId: string, banned: boolean): Promise<void> {
    // TODO: Add banned field to user_profiles table
    console.log(`User ${userId} ${banned ? 'banned' : 'unbanned'}`);
  }
} 