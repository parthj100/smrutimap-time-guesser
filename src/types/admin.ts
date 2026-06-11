// Admin Panel Types

export interface AdminUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  created_at: string;
  total_games_played: number;
  total_score: number;
  is_admin: boolean;
  center?: string;
}

export interface VisitorAnalytics {
  id: string;
  user_id?: string;
  session_id: string;
  ip_address?: unknown;
  user_agent?: string;
  page_visited: string;
  visit_date: string;
  visit_time: string;
  country?: string;
  city?: string;
  referrer?: string;
}

export interface DailySummary {
  id: string;
  date: string;
  total_visitors: number;
  unique_visitors: number;
  returning_visitors: number;
  new_users: number;
  games_played: number;
  created_at: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalGamesPlayed: number;
  totalScore: number;
  todayVisitors: number;
  todayUniqueVisitors: number;
  todayAnonymousVisitors: number;
  todayRegisteredVisitors: number;
  todayGamesPlayed: number;
  todayNewUsers: number;
  activeUsers: number;
}

export interface AdminGameStats {
  totalRoundsPlayed: number;
  averageScore: number;
  bestScore: number;
  multiplayerRooms: number;
  multiplayerGames: number;
}

export interface AdminUserStats {
  userId: string;
  username: string;
  displayName: string;
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  lastActive: string;
  isAdmin: boolean;
  banned: boolean;
  bannedReason: string | null;
}

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface AdminFeedbackItem {
  id: string;
  category: string;
  message: string;
  email: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  page_url: string | null;
  user_id: string | null;
  created_at: string;
}

export type PhotoSubmissionStatus =
  | 'pending'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'needs_info';

export interface AdminPhotoSubmission {
  id: string;
  submitter_name: string;
  email: string | null;
  photo_url: string;
  location_description: string | null;
  year_taken: number | null;
  year_confidence: string | null;
  description: string | null;
  clues_description: string | null;
  status: PhotoSubmissionStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  approval_date: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ApprovePhotoSubmissionInput {
  imageUrl: string;
  year: number;
  lat: number;
  lng: number;
  locationName: string;
  description: string;
  notes?: string;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxPlayersPerRoom: number;
  defaultRounds: number;
  defaultTimePerRound: number;
} 