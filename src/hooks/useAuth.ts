import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser, UserProfile } from '@/types/game';
import { queryWithTimeout, safeQuery } from '@/utils/databaseUtils';
import { GAME_CONSTANTS, createUserEmail, ENV_CONFIG } from '@/constants/gameConstants';

interface UseAuthOptions {
  skipInitialization?: boolean;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { skipInitialization = false } = options;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip initialization if requested (e.g., for multiplayer mode)
    if (skipInitialization) {
      console.log('🚫 Skipping auth initialization as requested');
      setLoading(false);
      return;
    }

    // Get initial session with timeout
    const initAuth = async () => {
      try {
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          console.log('🚀 Initializing authentication...');
        }
        
        // Add a timeout to prevent hanging
        const session = await queryWithTimeout(
          supabase.auth.getSession(),
          { operation: 'Initial session check', timeoutMs: GAME_CONSTANTS.TIMEOUTS.SESSION_CHECK }
        );
        
        if (session?.data?.session?.user) {
          if (ENV_CONFIG.IS_DEVELOPMENT) {
            console.log('✅ Session found, loading profile...');
          }
          setUser(session.data.session.user as AuthUser);
          await loadUserProfile(session.data.session.user.id);
        } else {
          if (ENV_CONFIG.IS_DEVELOPMENT) {
            console.log('ℹ️ No active session found');
          }
        }
      } catch (error) {
        console.error('❌ Initial auth check failed:', error);
        // Continue anyway - user can still sign in manually
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          console.log('🔄 Auth state changed:', event);
        }
        if (session?.user) {
          setUser(session.user as AuthUser);
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [skipInitialization]);

  const loadUserProfile = async (userId: string) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.log('🔍 Loading profile for user:', userId);
    }
    
    const { data, error, timedOut } = await safeQuery(
      async () => {
        return await supabase
          .from('user_profiles' as any)
          .select('*')
          .eq('user_id', userId)
          .single();
      },
      { operation: 'Load user profile', timeoutMs: GAME_CONSTANTS.TIMEOUTS.DATABASE_QUERIES }
    );

    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.log('📊 Profile query result:', { 
        success: !!data && !error,
        error: error?.message,
        timedOut,
        hasData: !!data?.data
      });
    }

    if (data && !error) {
      if (data.data) {
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          console.log('✅ Profile found:', data.data);
        }
        setProfile(data.data as unknown as UserProfile);
      } else if (data.error?.code === 'PGRST116') {
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          console.log('❌ No profile found, creating new one...');
        }
        await createUserProfile(userId);
      } else {
        console.error('❌ Profile query error:', data.error);
      }
    } else {
      if (timedOut) {
        console.error('⏱️ Profile loading timed out');
      } else {
        console.error('❌ Error loading profile:', error);
      }
    }
  };

  const createUserProfile = async (userId: string, username?: string, displayName?: string, center?: string) => {
    if (ENV_CONFIG.IS_DEVELOPMENT) {
      console.log('👤 Creating profile for user:', userId);
    }
    
    try {
      // Get user email to derive username if not provided
      const { data: { user: currentUser } } = await queryWithTimeout(
        supabase.auth.getUser(),
        { operation: 'Get current user for profile creation', timeoutMs: GAME_CONSTANTS.TIMEOUTS.DATABASE_QUERIES }
      );
      
      const defaultUsername = username || currentUser?.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;
      
      const profileData = {
        user_id: userId,
        username: defaultUsername,
        display_name: displayName || defaultUsername,
        center: center || null,
        total_games_played: 0,
        total_score: 0,
        best_single_game_score: 0,
        average_score: 0,
        favorite_game_mode: 'random'
      };

      if (ENV_CONFIG.IS_DEVELOPMENT) {
        console.log('📝 Profile data to insert:', profileData);
      }

      const { data, error, timedOut } = await safeQuery(
        async () => {
          return await supabase
            .from('user_profiles' as any)
            .insert(profileData)
            .select()
            .single();
        },
        { operation: 'Create user profile', timeoutMs: GAME_CONSTANTS.TIMEOUTS.PROFILE_CREATION }
      );

      if (ENV_CONFIG.IS_DEVELOPMENT) {
        console.log('💾 Profile creation result:', { 
          success: !!data && !error,
          error: error?.message,
          timedOut,
          hasData: !!data?.data
        });
      }

      if (data && !error && data.data) {
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          console.log('✅ Profile created successfully:', data.data);
        }
        setProfile(data.data as unknown as UserProfile);
        return { data: data.data, error: null };
      } else {
        if (timedOut) {
          console.error('⏱️ Profile creation timed out');
        } else {
          console.error('❌ Profile creation failed:', error || data?.error);
        }
        return { data: null, error: error || data?.error };
      }
    } catch (error: any) {
      console.error('❌ Error creating profile:', error);
      return { data: null, error };
    }
  };

  const signUp = async (username: string, displayName: string, password: string, center?: string) => {
    try {
      // Validate inputs
      if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      if (!displayName || displayName.length < 1) {
        throw new Error('Display name is required');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (ENV_CONFIG.IS_DEVELOPMENT) {
        console.log('📝 Signing up user:', username);
      }
      
      const email = createUserEmail(username);
      
      const { data, error } = await queryWithTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: displayName }
          }
        }),
        { operation: 'User sign up', timeoutMs: GAME_CONSTANTS.TIMEOUTS.USER_SIGN_UP }
      );

      if (error) throw error;

      // Create profile if user was created
      if (data.user) {
        await createUserProfile(data.user.id, username, displayName, center);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      return { data: null, error };
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // Validate inputs
      if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (ENV_CONFIG.IS_DEVELOPMENT) {
        console.log('🔑 Signing in user:', username);
      }
      
      const email = createUserEmail(username);
      
      const { data, error } = await queryWithTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        { operation: 'User sign in', timeoutMs: GAME_CONSTANTS.TIMEOUTS.USER_SIGN_IN }
      );

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      if (ENV_CONFIG.IS_DEVELOPMENT) {
        console.log('🚪 Signing out user');
      }
      
      const { error } = await queryWithTimeout(
        supabase.auth.signOut(),
        { operation: 'User sign out', timeoutMs: GAME_CONSTANTS.TIMEOUTS.AUTH_OPERATIONS }
      );

      if (error) throw error;
      
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      
      return { error: null };
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };
}; 