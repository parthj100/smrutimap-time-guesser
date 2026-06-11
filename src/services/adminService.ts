import { supabase } from '@/integrations/supabase/client';
import type {
  AdminDashboardStats,
  AdminUserStats,
  VisitorAnalytics,
  DailySummary,
  AdminFeedbackItem,
  FeedbackStatus,
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

const EMPTY_STATS: AdminDashboardStats = {
  totalUsers: 0,
  totalGamesPlayed: 0,
  totalScore: 0,
  todayVisitors: 0,
  todayUniqueVisitors: 0,
  todayAnonymousVisitors: 0,
  todayRegisteredVisitors: 0,
  todayGamesPlayed: 0,
  todayNewUsers: 0,
  activeUsers: 0,
};

/** Unwraps a supabase rpc/query, throwing the server's message on error. */
const unwrap = async <T>(
  q: PromiseLike<{ data: unknown; error: { message: string } | null }>
): Promise<T> => {
  const { data, error } = await q;
  if (error) throw new Error(error.message || 'Request failed');
  return data as T;
};

export class AdminService {
  // Check if current user is admin (client-side gate for routing/UI; every
  // admin RPC re-checks server-side via _is_admin()).
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

  // Dashboard overview — one server-side call (was ~10 client round-trips).
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const data = await unwrap<AdminDashboardStats>(
        supabase.rpc('admin_overview')
      );
      return { ...EMPTY_STATS, ...data };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return EMPTY_STATS;
    }
  }

  // Recent activity — merged + sorted server-side.
  static async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    try {
      return await unwrap<ActivityItem[]>(
        supabase.rpc('admin_recent_activity', { p_limit: limit })
      );
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  // Users with real last_active, server-side search + pagination.
  static async getUsers(
    search = '',
    limit = 100,
    offset = 0
  ): Promise<{ total: number; users: AdminUserStats[] }> {
    try {
      const data = await unwrap<{ total: number; users: AdminUserStats[] }>(
        supabase.rpc('admin_list_users', {
          p_search: search,
          p_limit: limit,
          p_offset: offset,
        })
      );
      return { total: data.total ?? 0, users: data.users ?? [] };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { total: 0, users: [] };
    }
  }

  // Daily summary — real server-side aggregation.
  static async getDailySummary(days: number = 30): Promise<DailySummary[]> {
    try {
      return await unwrap<DailySummary[]>(
        supabase.rpc('admin_daily_summary', { p_days: days })
      );
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      return [];
    }
  }

  // Raw visitor list (admin-gated by RLS) for the recent-visitors feed.
  static async getVisitorAnalytics(date?: string): Promise<VisitorAnalytics[]> {
    try {
      const query = supabase
        .from('analytics_visitors')
        .select('*')
        .order('visit_time', { ascending: false })
        .limit(200);

      if (date) query.eq('visit_date', date);

      const { data, error } = await query;
      if (error) throw error;
      return (data as VisitorAnalytics[]) || [];
    } catch (error) {
      console.error('Error fetching visitor analytics:', error);
      return [];
    }
  }

  // --- Moderation (server-authoritative; bypasses the own-row RLS that
  // silently blocked direct updates) -----------------------------------------
  static async resetUserStats(userId: string): Promise<void> {
    await unwrap(supabase.rpc('admin_reset_user_stats', { p_target: userId }));
  }

  static async setUserBan(
    userId: string,
    banned: boolean,
    reason?: string
  ): Promise<void> {
    await unwrap(
      supabase.rpc('admin_set_user_ban', {
        p_target: userId,
        p_banned: banned,
        p_reason: reason ?? null,
      })
    );
  }

  // --- Feedback (previously unreadable by admins) ----------------------------
  static async getFeedback(limit = 100): Promise<AdminFeedbackItem[]> {
    try {
      return await unwrap<AdminFeedbackItem[]>(
        supabase.rpc('admin_list_feedback', { p_limit: limit })
      );
    } catch (error) {
      console.error('Error fetching feedback:', error);
      return [];
    }
  }

  static async setFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    notes?: string
  ): Promise<void> {
    await unwrap(
      supabase.rpc('admin_set_feedback_status', {
        p_id: id,
        p_status: status,
        p_notes: notes ?? null,
      })
    );
  }

  // --- Maintenance -----------------------------------------------------------
  // Prune old analytics rows only (never game_sessions — those feed the
  // leaderboard). Returns the number deleted.
  static async cleanOldAnalytics(days: number = 90): Promise<number> {
    const data = await unwrap<{ deleted: number }>(
      supabase.rpc('admin_clean_old_analytics', { p_days: days })
    );
    return data.deleted ?? 0;
  }

  // --- Settings --------------------------------------------------------------
  static async getAdminSettings(): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settings: Record<string, unknown> = {};
      data?.forEach((s) => {
        settings[s.setting_key] = s.setting_value;
      });
      return settings;
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      return {};
    }
  }

  static async updateAdminSettings(
    settings: Record<string, unknown>
  ): Promise<void> {
    const updates = Object.entries(settings).map(([key, value]) => ({
      setting_key: key,
      setting_value: value as never,
    }));

    const { error } = await supabase
      .from('admin_settings')
      .upsert(updates, { onConflict: 'setting_key' });

    if (error) throw error;
  }

  // --- Visitor tracking (called by VisitorTracker; anon-inserts allowed) -----
  static async trackVisitor(page: string, sessionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const easternTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/New_York' })
      );

      await supabase.from('analytics_visitors').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        page_visited: page,
        visit_date: easternTime.toISOString().split('T')[0],
        visit_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking visitor:', error);
    }
  }

  static async trackVisitorEnhanced(
    page: string,
    sessionId: string,
    userAgent: string,
    referrer: string,
    timestamp: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('analytics_visitors').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        page_visited: page,
        visit_date: timestamp.split('T')[0],
        visit_time: timestamp,
        user_agent: userAgent,
        referrer: referrer,
      });
    } catch (error) {
      console.error('Error tracking enhanced visitor:', error);
    }
  }
}
