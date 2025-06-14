import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AuthDebugPanel: React.FC = () => {
  const [testUsername, setTestUsername] = useState('testuser');
  const [testPassword, setTestPassword] = useState('password123');
  const [testDisplayName, setTestDisplayName] = useState('Test User');
  const [loading, setLoading] = useState(false);
  const { user, profile, signUp, signIn, signOut } = useAuth();

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('user_profiles' as any).select('count').limit(1);
      if (error) {
        toast.error(`Supabase connection failed: ${error.message}`);
      } else {
        toast.success('Supabase connection successful!');
      }
    } catch (error: any) {
      toast.error(`Connection error: ${error.message}`);
    }
  };

  const testSignUp = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const username = `${testUsername}${timestamp}`;
      
      const { data, error } = await signUp(username, testDisplayName, testPassword);
      
      if (error) {
        toast.error(`Sign up failed: ${error.message}`);
        console.error('Sign up error:', error);
      } else {
        toast.success(`Sign up successful! User ID: ${data?.user?.id}`);
        console.log('Sign up success:', data);
      }
    } catch (error: any) {
      toast.error(`Sign up exception: ${error.message}`);
      console.error('Sign up exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await signIn(testUsername, testPassword);
      
      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
        console.error('Sign in error:', error);
      } else {
        toast.success(`Sign in successful! User ID: ${data?.user?.id}`);
        console.log('Sign in success:', data);
      }
    } catch (error: any) {
      toast.error(`Sign in exception: ${error.message}`);
      console.error('Sign in exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSignOut = async () => {
    try {
      await signOut();
      toast.success('Sign out successful!');
    } catch (error: any) {
      toast.error(`Sign out failed: ${error.message}`);
    }
  };

  const checkCurrentSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast.error(`Session check failed: ${error.message}`);
      } else if (session) {
        toast.success(`Active session found. User: ${session.user.email}`);
        console.log('Current session:', session);
      } else {
        toast.info('No active session');
      }
    } catch (error: any) {
      toast.error(`Session check exception: ${error.message}`);
    }
  };

  const listUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select('username, display_name, created_at')
        .limit(10);
      
      if (error) {
        toast.error(`List users failed: ${error.message}`);
      } else {
        console.log('Users in database:', data);
        toast.success(`Found ${data?.length || 0} users in database`);
      }
    } catch (error: any) {
      toast.error(`List users exception: ${error.message}`);
    }
  };

  const checkUserExists = async () => {
    try {
      const email = `${testUsername.toLowerCase()}@${window.location.hostname}.local`;
      toast.info(`Checking for user with email: ${email}`);
      
      // We can't directly query auth users, but we can try to check if the user profile exists
      const { data, error } = await supabase
        .from('user_profiles' as any)
        .select('username, display_name, user_id')
        .eq('username', testUsername.toLowerCase())
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          toast.error(`No user found with username: ${testUsername}`);
        } else {
          toast.error(`Error checking user: ${error.message}`);
        }
      } else {
        toast.success(`Found user: ${(data as any).display_name} (@${(data as any).username})`);
        console.log('User data:', data);
      }
    } catch (error: any) {
      toast.error(`Check user exception: ${error.message}`);
    }
  };

  const showEmailFormat = () => {
    const email = `${testUsername.toLowerCase()}@${window.location.hostname}.local`;
    toast.info(`Email format would be: ${email}`);
  };

  const simpleTest = () => {
    toast.info('Simple test button works!');
    console.log('Simple test button clicked');
  };

  const checkAuthState = async () => {
    console.log('🔍 Debug Auth button clicked!');
    toast.info('🔍 Checking authentication state...');
    
    try {
      console.log('Step 1: Getting Supabase session...');
      
      // Add timeout to session call
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session call timeout after 5 seconds')), 5000);
      });
      
      let session = null;
      try {
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        session = (result as any).data?.session;
        console.log('✅ Session retrieved:', session?.user?.id || 'no session');
      } catch (error: any) {
        console.log('❌ Session call timed out, continuing with hook state only');
        toast.warning('⏱️ Supabase session call timed out');
        
        // Just check hook state if session call fails
        checkHookStateOnly();
        return;
      }
      
      console.log('Step 2: Waiting for session with timeout...');
      
      if (session?.user) {
        const userId = session.user.id;
        console.log(`✅ Found session for user: ${userId}`);
        
        console.log('Step 3: Checking user profile with timeout...');
        
        // Add timeout to profile query too
        const profilePromise = supabase
          .from('user_profiles' as any)
          .select('*')
          .eq('user_id', userId)
          .single();
          
        const profileTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile query timeout after 8 seconds')), 8000);
        });
        
        try {
          const profileResult = await Promise.race([profilePromise, profileTimeoutPromise]);
          const { data: profile, error: profileError } = profileResult as any;
          
          if (profile) {
            console.log('✅ Profile found:', profile);
            toast.success(`✅ Authenticated: ${profile.display_name} (@${profile.username})`);
          } else if (profileError?.code === 'PGRST116') {
            console.log('❌ No profile found for user');
            toast.warning(`⚠️ User exists but no profile. User ID: ${userId.slice(0, 8)}...`);
          } else {
            console.log('❌ Profile query error:', profileError);
            toast.error(`Profile error: ${profileError?.message || 'Unknown error'}`);
          }
        } catch (error: any) {
          console.log('❌ Profile query timed out');
          toast.warning('⏱️ Profile query timed out - Supabase may be slow');
        }
        
      } else {
        console.log('❌ No active session found');
        toast.error('❌ No active session');
      }
      
      console.log('Step 4: Checking hook state...');
      if (user && profile) {
        console.log('✅ Hook has both user and profile');
        toast.info(`Hook state: ✅ ${profile.display_name} (@${profile.username})`);
      } else if (user && !profile) {
        console.log('⚠️ Hook has user but no profile');
        toast.info(`Hook state: ⚠️ User exists, no profile (loading: ${loading})`);
      } else {
        console.log('❌ Hook has no user or profile');
        toast.info(`Hook state: ❌ Not authenticated (loading: ${loading})`);
      }
      
      console.log('Step 5: Debug function completed successfully');
      toast.success('🎉 Debug check completed!');
      
    } catch (error: any) {
      console.error('Step X: Error caught:', error);
      console.error('Error stack:', error.stack);
      
      toast.error(`Debug check failed: ${error.message}`);
      
      // Still show hook state as fallback
      console.log('Fallback: Showing hook state only');
      checkHookStateOnly();
    }
  };

  const checkHookStateOnly = () => {
    console.log('🔍 Checking hook state only...');
    console.log('user:', user);
    console.log('profile:', profile);
    console.log('loading:', loading);
    
    toast.info(`Hook State Check:`);
    
    if (user && profile) {
      console.log('✅ Both user and profile exist');
      toast.success(`✅ Logged in: ${profile.display_name} (@${profile.username})`);
    } else if (user && !profile) {
      console.log('⚠️ User exists but no profile');
      toast.warning(`⚠️ User exists but no profile. User ID: ${user.id}`);
    } else if (!user && profile) {
      console.log('⚠️ Profile exists but no user (unusual)');
      toast.warning(`⚠️ Profile exists but no user`);
    } else {
      console.log('❌ No user or profile');
      toast.error(`❌ Not logged in (user=${!!user}, profile=${!!profile})`);
    }
  };

  const manuallyCreateProfile = async () => {
    if (!user) {
      toast.error('No user found to create profile for');
      return;
    }

    console.log('🔧 Manually creating profile for user:', user.id);
    toast.info('Creating profile...');

    try {
      // First, check if profile already exists
      console.log('Step 1: Checking if profile exists...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing profile:', checkError);
        toast.error(`Check error: ${checkError.message}`);
        return;
      }

      if (existingProfile) {
        console.log('Profile already exists:', existingProfile);
        toast.success(`Profile found: ${(existingProfile as any).display_name}`);
        
        // Manually set the profile in the hook
        // We'll need to call the fetchUserProfile function from useAuth
        return;
      }

      // Create new profile
      console.log('Step 2: Creating new profile...');
      const username = (user as any).user_metadata?.username || `user_${user.id.slice(0, 8)}`;
      const displayName = (user as any).user_metadata?.display_name || username;

      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles' as any)
        .insert({
          user_id: user.id,
          username: username,
          display_name: displayName,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        toast.error(`Create error: ${createError.message}`);
        return;
      }

      console.log('Profile created successfully:', newProfile);
      toast.success(`Profile created: ${(newProfile as any).display_name}`);

    } catch (error: any) {
      console.error('Manual profile creation error:', error);
      toast.error(`Manual create failed: ${error.message}`);
    }
  };

  const forceRefreshProfile = async () => {
    if (!user) {
      toast.error('No user to refresh profile for');
      return;
    }

    console.log('🔄 Force refreshing profile for user:', user.id);
    toast.info('Refreshing profile...');

    try {
      const { refreshProfile } = useAuth();
      await refreshProfile();
      toast.success('Profile refresh attempted');
    } catch (error: any) {
      console.error('Force refresh error:', error);
      toast.error(`Refresh failed: ${error.message}`);
    }
  };

  const createLocalProfile = () => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    console.log('🔧 Creating local profile from user metadata...');
    console.log('User metadata:', (user as any).user_metadata);
    console.log('User email:', user.email);

    // Extract username and display name from user metadata or email
    const metadata = (user as any).user_metadata || {};
    const username = metadata.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
    const displayName = metadata.display_name || username;

    // Create a mock profile object that matches the UserProfile type
    const mockProfile = {
      id: user.id,
      user_id: user.id,
      username: username,
      display_name: displayName,
      total_games_played: 0,
      total_score: 0,
      best_single_game_score: 0,
      average_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Created mock profile:', mockProfile);
    toast.success(`✅ Local profile created for ${displayName} (@${username})`);
    toast.info('Note: This is a temporary workaround for Supabase connection issues');

    // Note: We can't directly set the profile in useAuth from here,
    // but this shows what the profile should look like
    return mockProfile;
  };

  const showUserMetadata = () => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    console.log('📋 User metadata inspection:');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Email confirmed:', (user as any).email_confirmed_at);
    console.log('User metadata:', (user as any).user_metadata);
    console.log('App metadata:', (user as any).app_metadata);
    console.log('Full user object:', user);

    const metadata = (user as any).user_metadata || {};
    toast.info(`User: ${user.email} | Username: ${metadata.username || 'not set'} | Display: ${metadata.display_name || 'not set'}`);
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="text-lg font-bold text-blue-600 mb-4">Auth Debug Panel</h3>
      
      {/* Current Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-sm">
          <strong>Status:</strong> {user ? `Logged in as ${profile?.username || user.email}` : 'Not logged in'}
        </p>
        {profile && (
          <p className="text-sm">
            <strong>Profile:</strong> {profile.display_name} (@{profile.username})
          </p>
        )}
      </div>

      {/* Test Inputs */}
      <div className="space-y-2 mb-4">
        <Input
          placeholder="Username"
          value={testUsername}
          onChange={(e) => setTestUsername(e.target.value)}
          className="text-sm"
        />
        <Input
          placeholder="Display Name"
          value={testDisplayName}
          onChange={(e) => setTestDisplayName(e.target.value)}
          className="text-sm"
        />
        <Input
          placeholder="Password"
          type="password"
          value={testPassword}
          onChange={(e) => setTestPassword(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Test Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={testSupabaseConnection} size="sm" variant="outline">
            Test Connection
          </Button>
          <Button onClick={checkCurrentSession} size="sm" variant="outline">
            Check Session
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={checkAuthState} size="sm" variant="outline">
            Debug Auth
          </Button>
          <Button onClick={checkHookStateOnly} size="sm" variant="outline">
            Hook State
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={checkUserExists} size="sm" variant="outline">
            Check User
          </Button>
          <Button onClick={manuallyCreateProfile} size="sm" variant="outline">
            Fix Profile
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={createLocalProfile} size="sm" variant="outline">
            Local Profile
          </Button>
          <Button onClick={showUserMetadata} size="sm" variant="outline">
            Show Metadata
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={listUsers} size="sm" variant="outline">
            List Users
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Button onClick={testSignUp} size="sm" disabled={loading}>
            Sign Up
          </Button>
          <Button onClick={testSignIn} size="sm" disabled={loading}>
            Sign In
          </Button>
        </div>
        
        <div className="w-full">
          <Button onClick={testSignOut} size="sm" variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};