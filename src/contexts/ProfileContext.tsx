import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/game';

interface ProfileContextType {
  refreshAllProfiles: () => Promise<void>;
  refreshUserProfile: (userId: string) => Promise<void>;
  subscribeToProfileChanges: (userId: string) => void;
  unsubscribeFromProfileChanges: (userId: string) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: React.ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [globalSubscription, setGlobalSubscription] = useState<boolean>(false);

  // Refresh all profiles (useful for leaderboard updates)
  const refreshAllProfiles = async () => {
    try {
      console.log('🔄 Refreshing all profiles...');
      
      // Trigger a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('profileUpdate', {
        detail: { type: 'all' }
      }));
    } catch (error) {
      console.error('❌ Error refreshing all profiles:', error);
    }
  };

  // Refresh a specific user's profile
  const refreshUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Refreshing profile for user:', userId);
      
      // Trigger a custom event for specific user
      window.dispatchEvent(new CustomEvent('profileUpdate', {
        detail: { type: 'user', userId }
      }));
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  };

  // Subscribe to real-time profile changes
  const subscribeToProfileChanges = (userId: string) => {
    if (subscriptions.has(userId)) return;
    
    console.log('📡 Subscribing to profile changes for user:', userId);
    
    const subscription = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Profile updated via real-time:', payload);
          refreshUserProfile(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('🆕 New profile created via real-time:', payload);
          refreshAllProfiles();
        }
      )
      .subscribe();

    setSubscriptions(prev => new Set(prev).add(userId));
  };

  // Unsubscribe from profile changes
  const unsubscribeFromProfileChanges = (userId: string) => {
    if (!subscriptions.has(userId)) return;
    
    console.log('📡 Unsubscribing from profile changes for user:', userId);
    
    supabase
      .channel(`profile-${userId}`)
      .unsubscribe();

    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  // Setup global profile subscription
  useEffect(() => {
    if (globalSubscription) return;
    
    console.log('📡 Setting up global profile subscription...');
    
    const globalSub = supabase
      .channel('global-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('🔄 Global profile change detected:', payload);
          if (payload.eventType === 'UPDATE') {
            refreshUserProfile(payload.new.user_id);
          } else if (payload.eventType === 'INSERT') {
            refreshAllProfiles();
          }
        }
      )
      .subscribe();

    setGlobalSubscription(true);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(userId => {
        supabase
          .channel(`profile-${userId}`)
          .unsubscribe();
      });
      globalSub.unsubscribe();
    };
  }, [subscriptions, globalSubscription]);

  const value: ProfileContextType = {
    refreshAllProfiles,
    refreshUserProfile,
    subscribeToProfileChanges,
    unsubscribeFromProfileChanges
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}; 