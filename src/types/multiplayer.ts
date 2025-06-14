// Multiplayer Game Types for SmrutiMap

export interface MultiplayerRoom {
  id: string;
  code: string; // 6-digit room code for easy joining
  name: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'finished';
  max_players: number;
  current_players: number;
  settings: MultiplayerGameSettings;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface MultiplayerGameSettings {
  rounds_count: number;
  time_per_round: number; // seconds, 0 for unlimited
  game_mode: 'classic' | 'blitz' | 'marathon';
  allow_spectators: boolean;
  show_leaderboard_between_rounds: boolean;
  scoring_system: 'standard' | 'competitive';
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id?: string; // null for guests
  display_name: string;
  role: 'host' | 'player' | 'spectator';
  status: 'connected' | 'disconnected' | 'ready';
  avatar_color: string; // For easy identification
  joined_at: string;
  last_seen?: string;
}

export interface MultiplayerGameSession {
  id: string;
  room_id: string;
  current_round: number;
  total_rounds: number;
  current_image_id?: string;
  round_start_time?: string;
  round_end_time?: string;
  status: 'waiting' | 'round_active' | 'round_results' | 'game_finished';
  images: string[]; // Array of image IDs for the game
  created_at: string;
}

export interface MultiplayerRoundResult {
  id: string;
  session_id: string;
  participant_id: string;
  round_number: number;
  year_guess: number;
  location_guess: {
    lat: number;
    lng: number;
  };
  year_score: number;
  location_score: number;
  total_score: number;
  time_taken: number; // seconds
  submitted_at: string;
}

export interface MultiplayerLeaderboard {
  participant_id: string;
  display_name: string;
  avatar_color: string;
  total_score: number;
  rounds_completed: number;
  average_score: number;
  position: number;
  is_ready: boolean;
}

// Real-time Events
export type MultiplayerEvent = 
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PlayerReadyEvent
  | GameStartedEvent
  | RoundStartedEvent
  | PlayerSubmittedEvent
  | RoundEndedEvent
  | GameEndedEvent
  | ChatMessageEvent
  | HostChangedEvent;

export interface PlayerJoinedEvent {
  type: 'player_joined';
  participant: RoomParticipant;
}

export interface PlayerLeftEvent {
  type: 'player_left';
  participant_id: string;
  display_name: string;
}

export interface PlayerReadyEvent {
  type: 'player_ready';
  participant_id: string;
  is_ready: boolean;
}

export interface GameStartedEvent {
  type: 'game_started';
  session_id: string;
  first_image_id: string;
}

export interface RoundStartedEvent {
  type: 'round_started';
  round_number: number;
  image_id: string;
  round_duration?: number; // seconds, undefined for unlimited
  start_time: string;
}

export interface PlayerSubmittedEvent {
  type: 'player_submitted';
  participant_id: string;
  display_name: string;
  time_taken: number;
}

export interface RoundEndedEvent {
  type: 'round_ended';
  round_number: number;
  results: MultiplayerRoundResult[];
  leaderboard: MultiplayerLeaderboard[];
  next_round_starts_in?: number; // seconds until next round
}

export interface GameEndedEvent {
  type: 'game_ended';
  final_leaderboard: MultiplayerLeaderboard[];
  session_id: string;
}

export interface ChatMessageEvent {
  type: 'chat_message';
  participant_id: string;
  display_name: string;
  message: string;
  timestamp: string;
}

export interface HostChangedEvent {
  type: 'host_changed';
  new_host_id: string;
  new_host_name: string;
}

// UI State Management
export interface MultiplayerGameState {
  room: MultiplayerRoom | null;
  participants: RoomParticipant[];
  current_session: MultiplayerGameSession | null;
  leaderboard: MultiplayerLeaderboard[];
  my_participant_id: string | null;
  is_host: boolean;
  connection_status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  round_results: MultiplayerRoundResult[];
  chat_messages: ChatMessageEvent[];
}

// WebSocket/Supabase Realtime Configuration
export interface RealtimeConfig {
  room_channel: string;
  game_channel: string;
  chat_channel: string;
}

// Helper Types for UI Components
export interface PlayerCard {
  participant: RoomParticipant;
  score?: number;
  position?: number;
  has_submitted?: boolean;
  is_online: boolean;
}

export interface RoomCodeInput {
  value: string;
  isValid: boolean;
  error?: string;
}

export interface GameModeOption {
  id: 'classic' | 'blitz' | 'marathon';
  name: string;
  description: string;
  settings: Partial<MultiplayerGameSettings>;
  icon: string;
}

// Game Mode Presets
export const GAME_MODE_OPTIONS: GameModeOption[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: '5 rounds, 60 seconds each, standard scoring',
    settings: {
      rounds_count: 5,
      time_per_round: 60,
      scoring_system: 'standard'
    },
    icon: '🏛️'
  },
  {
    id: 'blitz',
    name: 'Blitz',
    description: '10 rounds, 30 seconds each, fast-paced',
    settings: {
      rounds_count: 10,
      time_per_round: 30,
      scoring_system: 'competitive'
    },
    icon: '⚡'
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: '15 rounds, 90 seconds each, endurance test',
    settings: {
      rounds_count: 15,
      time_per_round: 90,
      scoring_system: 'standard'
    },
    icon: '🏃‍♂️'
  }
];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85DDEE', '#D7BDE2'
];

export const MULTIPLAYER_CONSTANTS = {
  ROOM_CODE_LENGTH: 6,
  MAX_PLAYERS_DEFAULT: 8,
  MAX_PLAYERS_LIMIT: 12,
  MIN_PLAYERS_TO_START: 2,
  ROUND_RESULTS_DISPLAY_TIME: 10, // seconds
  RECONNECTION_TIMEOUT: 30, // seconds
  HEARTBEAT_INTERVAL: 5, // seconds
}; 