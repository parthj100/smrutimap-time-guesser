export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_daily_summary: {
        Row: {
          created_at: string | null
          date: string
          games_played: number | null
          id: string
          new_users: number | null
          returning_visitors: number | null
          total_visitors: number | null
          unique_visitors: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          games_played?: number | null
          id?: string
          new_users?: number | null
          returning_visitors?: number | null
          total_visitors?: number | null
          unique_visitors?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          games_played?: number | null
          id?: string
          new_users?: number | null
          returning_visitors?: number | null
          total_visitors?: number | null
          unique_visitors?: number | null
        }
        Relationships: []
      }
      analytics_visitors: {
        Row: {
          city: string | null
          country: string | null
          id: string
          ip_address: unknown
          page_visited: string | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          visit_date: string | null
          visit_time: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown
          page_visited?: string | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          visit_date?: string | null
          visit_time?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: unknown
          page_visited?: string | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          visit_date?: string | null
          visit_time?: string | null
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          created_at: string | null
          id: string
          image_ids: string[]
        }
        Insert: {
          challenge_date: string
          created_at?: string | null
          id?: string
          image_ids: string[]
        }
        Update: {
          challenge_date?: string
          created_at?: string | null
          id?: string
          image_ids?: string[]
        }
        Relationships: []
      }
      duel_guesses: {
        Row: {
          distance_km: number | null
          duel_id: string
          guessed_lat: number | null
          guessed_lng: number | null
          guessed_year: number | null
          id: string
          is_timeout: boolean
          location_score: number
          player_id: string
          round_id: string
          submitted_at: string
          total_score: number
          year_score: number
        }
        Insert: {
          distance_km?: number | null
          duel_id: string
          guessed_lat?: number | null
          guessed_lng?: number | null
          guessed_year?: number | null
          id?: string
          is_timeout?: boolean
          location_score: number
          player_id: string
          round_id: string
          submitted_at?: string
          total_score: number
          year_score: number
        }
        Update: {
          distance_km?: number | null
          duel_id?: string
          guessed_lat?: number | null
          guessed_lng?: number | null
          guessed_year?: number | null
          id?: string
          is_timeout?: boolean
          location_score?: number
          player_id?: string
          round_id?: string
          submitted_at?: string
          total_score?: number
          year_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "duel_guesses_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_guesses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_guesses_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "duel_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_player_secrets: {
        Row: {
          player_id: string
          token: string
        }
        Insert: {
          player_id: string
          token?: string
        }
        Update: {
          player_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_player_secrets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_players: {
        Row: {
          display_name: string
          duel_id: string
          hp: number
          id: string
          is_host: boolean
          joined_at: string
          user_id: string | null
        }
        Insert: {
          display_name: string
          duel_id: string
          hp: number
          id?: string
          is_host?: boolean
          joined_at?: string
          user_id?: string | null
        }
        Update: {
          display_name?: string
          duel_id?: string
          hp?: number
          id?: string
          is_host?: boolean
          joined_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_players_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_rounds: {
        Row: {
          base_deadline: string
          damage: number | null
          duel_id: string
          guess_deadline: string | null
          id: string
          image_id: string
          multiplier: number
          next_round_at: string | null
          resolved_at: string | null
          round_number: number
          score_diff: number | null
          started_at: string
          winner_player_id: string | null
        }
        Insert: {
          base_deadline: string
          damage?: number | null
          duel_id: string
          guess_deadline?: string | null
          id?: string
          image_id: string
          multiplier?: number
          next_round_at?: string | null
          resolved_at?: string | null
          round_number: number
          score_diff?: number | null
          started_at?: string
          winner_player_id?: string | null
        }
        Update: {
          base_deadline?: string
          damage?: number | null
          duel_id?: string
          guess_deadline?: string | null
          id?: string
          image_id?: string
          multiplier?: number
          next_round_at?: string | null
          resolved_at?: string | null
          round_number?: number
          score_diff?: number | null
          started_at?: string
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_rounds_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_rounds_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "game_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_rounds_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_secrets: {
        Row: {
          duel_id: string
          image_ids: string[]
        }
        Insert: {
          duel_id: string
          image_ids: string[]
        }
        Update: {
          duel_id?: string
          image_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "duel_secrets_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: true
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          code: string
          created_at: string
          current_round: number
          finish_reason: string | null
          finished_at: string | null
          guess_window_seconds: number
          id: string
          results_seconds: number
          round_seconds: number
          started_at: string | null
          starting_hp: number
          status: string
          updated_at: string
          winner_player_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_round?: number
          finish_reason?: string | null
          finished_at?: string | null
          guess_window_seconds?: number
          id?: string
          results_seconds?: number
          round_seconds?: number
          started_at?: string | null
          starting_hp?: number
          status?: string
          updated_at?: string
          winner_player_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_round?: number
          finish_reason?: string | null
          finished_at?: string | null
          guess_window_seconds?: number
          id?: string
          results_seconds?: number
          round_seconds?: number
          started_at?: string | null
          starting_hp?: number
          status?: string
          updated_at?: string
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_winner_fk"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "duel_players"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string | null
          email: string | null
          id: string
          message: string
          page_url: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          page_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          page_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      game_images: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string
          location_lat: number
          location_lng: number
          location_name: string
          year: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url: string
          location_lat: number
          location_lng: number
          location_name: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          location_lat?: number
          location_lng?: number
          location_name?: string
          year?: number
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          game_mode: string
          id: string
          rounds_completed: number
          time_taken: number | null
          total_score: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          game_mode: string
          id?: string
          rounds_completed: number
          time_taken?: number | null
          total_score: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          game_mode?: string
          id?: string
          rounds_completed?: number
          time_taken?: number | null
          total_score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      photo_submissions: {
        Row: {
          admin_notes: string | null
          approval_date: string | null
          clues_description: string | null
          created_at: string | null
          description: string | null
          email: string
          id: string
          location_description: string
          photo_metadata: Json | null
          photo_url: string
          rejection_reason: string | null
          status: string | null
          submission_source: string | null
          submitter_name: string
          updated_at: string | null
          user_id: string | null
          year_confidence: string | null
          year_taken: number | null
        }
        Insert: {
          admin_notes?: string | null
          approval_date?: string | null
          clues_description?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          id?: string
          location_description: string
          photo_metadata?: Json | null
          photo_url: string
          rejection_reason?: string | null
          status?: string | null
          submission_source?: string | null
          submitter_name: string
          updated_at?: string | null
          user_id?: string | null
          year_confidence?: string | null
          year_taken?: number | null
        }
        Update: {
          admin_notes?: string | null
          approval_date?: string | null
          clues_description?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          location_description?: string
          photo_metadata?: Json | null
          photo_url?: string
          rejection_reason?: string | null
          status?: string | null
          submission_source?: string | null
          submitter_name?: string
          updated_at?: string | null
          user_id?: string | null
          year_confidence?: string | null
          year_taken?: number | null
        }
        Relationships: []
      }
      round_results: {
        Row: {
          actual_location_lat: number
          actual_location_lng: number
          actual_year: number
          created_at: string | null
          id: string
          image_id: string | null
          location_guess_lat: number
          location_guess_lng: number
          location_score: number
          round_number: number
          session_id: string | null
          time_used: number | null
          total_round_score: number
          user_id: string | null
          year_guess: number
          year_score: number
        }
        Insert: {
          actual_location_lat: number
          actual_location_lng: number
          actual_year: number
          created_at?: string | null
          id?: string
          image_id?: string | null
          location_guess_lat: number
          location_guess_lng: number
          location_score: number
          round_number: number
          session_id?: string | null
          time_used?: number | null
          total_round_score: number
          user_id?: string | null
          year_guess: number
          year_score: number
        }
        Update: {
          actual_location_lat?: number
          actual_location_lng?: number
          actual_year?: number
          created_at?: string | null
          id?: string
          image_id?: string | null
          location_guess_lat?: number
          location_guess_lng?: number
          location_score?: number
          round_number?: number
          session_id?: string | null
          time_used?: number | null
          total_round_score?: number
          user_id?: string | null
          year_guess?: number
          year_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_results_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "game_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      simple_multiplayer_players: {
        Row: {
          display_name: string
          id: string
          joined_at: string | null
          room_id: string | null
          user_id: string | null
        }
        Insert: {
          display_name: string
          id?: string
          joined_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Update: {
          display_name?: string
          id?: string
          joined_at?: string | null
          room_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simple_multiplayer_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simple_multiplayer_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      simple_multiplayer_rooms: {
        Row: {
          created_at: string | null
          current_image_id: string | null
          current_round: number | null
          game_status: string | null
          host_user_id: string | null
          id: string
          image_sequence: string[] | null
          room_code: string
          round_start_time: string | null
          time_per_round: number | null
          total_rounds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_image_id?: string | null
          current_round?: number | null
          game_status?: string | null
          host_user_id?: string | null
          id?: string
          image_sequence?: string[] | null
          room_code: string
          round_start_time?: string | null
          time_per_round?: number | null
          total_rounds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_image_id?: string | null
          current_round?: number | null
          game_status?: string | null
          host_user_id?: string | null
          id?: string
          image_sequence?: string[] | null
          room_code?: string
          round_start_time?: string | null
          time_per_round?: number | null
          total_rounds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      simple_multiplayer_scores: {
        Row: {
          actual_year: number | null
          created_at: string | null
          guess_time_seconds: number | null
          guessed_year: number | null
          id: string
          points: number | null
          room_id: string | null
          round_number: number | null
          user_id: string | null
        }
        Insert: {
          actual_year?: number | null
          created_at?: string | null
          guess_time_seconds?: number | null
          guessed_year?: number | null
          id?: string
          points?: number | null
          room_id?: string | null
          round_number?: number | null
          user_id?: string | null
        }
        Update: {
          actual_year?: number | null
          created_at?: string | null
          guess_time_seconds?: number | null
          guessed_year?: number | null
          id?: string
          points?: number | null
          room_id?: string | null
          round_number?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simple_multiplayer_scores_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "simple_multiplayer_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_image_pools: {
        Row: {
          available_image_ids: string[]
          id: string
          pool_created_at: string | null
          total_images_in_database: number
          updated_at: string | null
          used_image_ids: string[]
          user_id: string | null
        }
        Insert: {
          available_image_ids?: string[]
          id?: string
          pool_created_at?: string | null
          total_images_in_database?: number
          updated_at?: string | null
          used_image_ids?: string[]
          user_id?: string | null
        }
        Update: {
          available_image_ids?: string[]
          id?: string
          pool_created_at?: string | null
          total_images_in_database?: number
          updated_at?: string | null
          used_image_ids?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          average_score: number | null
          banned: boolean | null
          banned_at: string | null
          banned_reason: string | null
          best_single_game_score: number | null
          center: string | null
          created_at: string | null
          display_name: string | null
          favorite_game_mode: string | null
          id: string
          is_admin: boolean | null
          last_active: string | null
          total_games_played: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          average_score?: number | null
          banned?: boolean | null
          banned_at?: string | null
          banned_reason?: string | null
          best_single_game_score?: number | null
          center?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_game_mode?: string | null
          id?: string
          is_admin?: boolean | null
          last_active?: string | null
          total_games_played?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          average_score?: number | null
          banned?: boolean | null
          banned_at?: string | null
          banned_reason?: string | null
          best_single_game_score?: number | null
          center?: string | null
          created_at?: string | null
          display_name?: string | null
          favorite_game_mode?: string | null
          id?: string
          is_admin?: boolean | null
          last_active?: string | null
          total_games_played?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_game_stats: {
        Row: {
          average_score: number | null
          game_date: string | null
          game_mode: string | null
          highest_score: number | null
          total_games: number | null
          unique_players: number | null
        }
        Relationships: []
      }
      leaderboards: {
        Row: {
          avatar_url: string | null
          average_score: number | null
          best_daily_score: number | null
          best_single_game_score: number | null
          display_name: string | null
          games_this_month: number | null
          games_this_week: number | null
          id: string | null
          score_this_month: number | null
          score_this_week: number | null
          total_games_played: number | null
          total_score: number | null
          username: string | null
        }
        Relationships: []
      }
      user_rankings: {
        Row: {
          avatar_url: string | null
          average_score: number | null
          average_score_rank: number | null
          best_game_rank: number | null
          best_single_game_score: number | null
          created_at: string | null
          display_name: string | null
          favorite_game_mode: string | null
          games_played_rank: number | null
          id: string | null
          total_games_played: number | null
          total_score: number | null
          total_score_rank: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _duel_create_round: {
        Args: { p_duel_id: string; p_round_number: number }
        Returns: undefined
      }
      _duel_effective_deadline: {
        Args: { r: Database["public"]["Tables"]["duel_rounds"]["Row"] }
        Returns: string
      }
      _duel_player_by_token: {
        Args: { p_token: string }
        Returns: {
          display_name: string
          duel_id: string
          hp: number
          id: string
          is_host: boolean
          joined_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "duel_players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _duel_resolve_round: { Args: { p_round_id: string }; Returns: undefined }
      cleanup_expired_rooms: { Args: never; Returns: number }
      duel_advance_round: { Args: { p_duel_id: string }; Returns: Json }
      duel_create: {
        Args: { p_display_name: string; p_settings?: Json }
        Returns: Json
      }
      duel_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      duel_get_state: {
        Args: { p_code: string; p_token?: string }
        Returns: Json
      }
      duel_join: {
        Args: { p_code: string; p_display_name: string }
        Returns: Json
      }
      duel_leave: { Args: { p_token: string }; Returns: Json }
      duel_location_score_from_km: { Args: { p_km: number }; Returns: number }
      duel_resolve_round: {
        Args: { p_duel_id: string; p_round_number: number }
        Returns: Json
      }
      duel_round_multiplier: { Args: { p_round: number }; Returns: number }
      duel_round_results: {
        Args: { p_duel_id: string; p_round_number: number }
        Returns: Json
      }
      duel_rounds_summary: { Args: { p_duel_id: string }; Returns: Json }
      duel_start: { Args: { p_token: string }; Returns: Json }
      duel_submit_guess: {
        Args: {
          p_lat: number
          p_lng: number
          p_round_number: number
          p_token: string
          p_year: number
        }
        Returns: Json
      }
      duel_year_score: {
        Args: { p_actual: number; p_guessed: number }
        Returns: number
      }
      generate_unique_room_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: {
          game_mode_filter?: string
          limit_count?: number
          metric_type?: string
          time_frame?: string
        }
        Returns: {
          avatar_url: string
          average_score: number
          best_single_game_score: number
          display_name: string
          id: string
          rank_position: number
          total_games_played: number
          total_score: number
          username: string
        }[]
      }
      get_multiplayer_game_images: {
        Args: { image_count?: number }
        Returns: string[]
      }
      get_session_leaderboard: {
        Args: {
          end_ts?: string
          game_mode_filter?: string
          limit_count?: number
          start_ts?: string
        }
        Returns: {
          avatar_url: string
          average_score: number
          best_single_game_score: number
          center: string
          display_name: string
          id: string
          total_games_played: number
          total_score: number
          user_id: string
          username: string
        }[]
      }
      get_user_by_username: {
        Args: { username_param: string }
        Returns: {
          average_score: number
          best_single_game_score: number
          created_at: string
          display_name: string
          id: string
          total_games_played: number
          total_score: number
          updated_at: string
          user_id: string
          username: string
        }[]
      }
      update_user_stats: {
        Args: {
          game_score: number
          rounds_completed: number
          user_uuid: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
