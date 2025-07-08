export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      multiplayer_rooms: {
        Row: {
          code: string
          created_at: string
          current_players: number
          finished_at: string | null
          host_id: string
          id: string
          max_players: number
          name: string
          settings: Json
          started_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          current_players?: number
          finished_at?: string | null
          host_id: string
          id?: string
          max_players?: number
          name: string
          settings?: Json
          started_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_players?: number
          finished_at?: string | null
          host_id?: string
          id?: string
          max_players?: number
          name?: string
          settings?: Json
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      multiplayer_round_results: {
        Row: {
          id: string
          location_guess_lat: number
          location_guess_lng: number
          location_score: number
          participant_id: string
          round_number: number
          session_id: string
          submitted_at: string
          time_taken: number
          total_score: number
          year_guess: number
          year_score: number
        }
        Insert: {
          id?: string
          location_guess_lat: number
          location_guess_lng: number
          location_score?: number
          participant_id: string
          round_number: number
          session_id: string
          submitted_at?: string
          time_taken?: number
          total_score?: number
          year_guess: number
          year_score?: number
        }
        Update: {
          id?: string
          location_guess_lat?: number
          location_guess_lng?: number
          location_score?: number
          participant_id?: string
          round_number?: number
          session_id?: string
          submitted_at?: string
          time_taken?: number
          total_score?: number
          year_guess?: number
          year_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_round_results_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_round_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplayer_sessions: {
        Row: {
          created_at: string
          current_image_id: string | null
          current_round: number
          id: string
          images: string[]
          room_id: string
          round_end_time: string | null
          round_start_time: string | null
          status: string
          total_rounds: number
        }
        Insert: {
          created_at?: string
          current_image_id?: string | null
          current_round?: number
          id?: string
          images?: string[]
          room_id: string
          round_end_time?: string | null
          round_start_time?: string | null
          status?: string
          total_rounds: number
        }
        Update: {
          created_at?: string
          current_image_id?: string | null
          current_round?: number
          id?: string
          images?: string[]
          room_id?: string
          round_end_time?: string | null
          round_start_time?: string | null
          status?: string
          total_rounds?: number
        }
        Relationships: [
          {
            foreignKeyName: "multiplayer_sessions_current_image_id_fkey"
            columns: ["current_image_id"]
            isOneToOne: false
            referencedRelation: "game_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multiplayer_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_rooms"
            referencedColumns: ["id"]
          },
        ]
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
      room_participants: {
        Row: {
          avatar_color: string
          display_name: string
          id: string
          joined_at: string
          last_seen: string | null
          role: string
          room_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          avatar_color: string
          display_name: string
          id?: string
          joined_at?: string
          last_seen?: string | null
          role?: string
          room_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string
          display_name?: string
          id?: string
          joined_at?: string
          last_seen?: string | null
          role?: string
          room_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "multiplayer_rooms"
            referencedColumns: ["id"]
          },
        ]
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
          best_single_game_score: number | null
          created_at: string | null
          display_name: string | null
          favorite_game_mode: string | null
          id: string
          total_games_played: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          average_score?: number | null
          best_single_game_score?: number | null
          created_at?: string | null
          display_name?: string | null
          favorite_game_mode?: string | null
          id?: string
          total_games_played?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          average_score?: number | null
          best_single_game_score?: number | null
          created_at?: string | null
          display_name?: string | null
          favorite_game_mode?: string | null
          id?: string
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
      cleanup_expired_rooms: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_unique_room_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_leaderboard: {
        Args: {
          metric_type?: string
          time_frame?: string
          game_mode_filter?: string
          limit_count?: number
        }
        Returns: {
          id: string
          username: string
          display_name: string
          avatar_url: string
          total_games_played: number
          total_score: number
          best_single_game_score: number
          average_score: number
          rank_position: number
        }[]
      }
      get_multiplayer_game_images: {
        Args: { image_count?: number }
        Returns: string[]
      }
      get_user_by_username: {
        Args: { username_param: string }
        Returns: {
          id: string
          user_id: string
          username: string
          display_name: string
          total_games_played: number
          total_score: number
          best_single_game_score: number
          average_score: number
          created_at: string
          updated_at: string
        }[]
      }
      update_user_stats: {
        Args: {
          user_uuid: string
          game_score: number
          rounds_completed: number
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
