import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Trophy, LogOut, Crown, Target, Calendar, Edit3, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './auth/AuthModal';
import ProfileView from './ProfileView';
import { fixUserStatsFromSessions } from '@/utils/databaseUtils';

interface UserHeaderProps {
  onShowLeaderboard: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ onShowLeaderboard }) => {
  const { user, profile, signOut, loading, refreshProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    console.log('🚪 Sign out requested');
    try {
      await signOut();
      console.log('✅ Sign out completed');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  };

  const handleRefreshProfile = async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing profile data...');
      
      // First, fix any data consistency issues
      const fixResult = await fixUserStatsFromSessions(user.id);
      if (fixResult.success) {
        console.log('✅ Stats fixed successfully:', fixResult.correctedStats);
      } else {
        console.warn('⚠️ Stats fix failed:', fixResult.error);
      }
      
      // Then refresh the profile data
      await refreshProfile();
      console.log('✅ Profile refreshed successfully');
      
    } catch (error) {
      console.error('❌ Profile refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show authenticated state if user exists, even if profile is loading/missing
  if (!user) {
    // Guest user - show login/signup buttons
    return (
      <>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAuthModal(true)}
            className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 rounded-full px-6 py-2 shadow-lg hover:shadow-xl"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Sign In / Sign Up'}
          </Button>
        </div>

        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // User is authenticated - show user menu (with or without full profile)
  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'User';
  const username = profile?.username || user.email?.split('@')[0] || 'user';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-10 h-10 p-0 rounded-full bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <span className="text-sm font-bold">
              {userInitial}
            </span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-xl rounded-xl p-2">
          {/* User Info Section */}
          <div className="px-3 py-3 bg-gradient-to-r from-[#ea384c] to-red-600 text-white rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center text-lg font-bold">
                {userInitial}
              </div>
              <div>
                <div className="font-semibold text-lg">
                  {displayName}
                </div>
                <div className="text-white/80 text-sm">
                  @{username}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          {profile ? (
            <div className="px-3 py-2 mb-2 bg-gray-50 rounded-lg">
              {/* Refresh Button */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Profile Stats</span>
                <button
                  onClick={handleRefreshProfile}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[#ea384c] text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Syncing...' : 'Refresh'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[#ea384c]" />
                  <div>
                    <div className="font-semibold text-gray-800">{profile.total_games_played || 0}</div>
                    <div className="text-gray-600 text-xs">Games</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-yellow-500" />
                  <div>
                    <div className="font-semibold text-gray-800">{Math.round(profile.total_score || 0)}</div>
                    <div className="text-gray-600 text-xs">Total Score</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-green-500" />
                  <div>
                    <div className="font-semibold text-gray-800">{Math.round(profile.best_single_game_score || 0)}</div>
                    <div className="text-gray-600 text-xs">Best Game</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-gray-800">
                      {profile.total_games_played ? Math.round((profile.total_score || 0) / profile.total_games_played) : 0}
                    </div>
                    <div className="text-gray-600 text-xs">Avg Score</div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Last updated: {new Date(profile.updated_at).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 mb-2 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 text-center">
                {loading ? '🔄 Loading profile...' : '⚠️ Profile data unavailable'}
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                Game scores will still be saved
              </div>
              {user && (
                <button
                  onClick={handleRefreshProfile}
                  disabled={isRefreshing}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-[#ea384c] text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Syncing...' : 'Refresh Profile'}
                </button>
              )}
            </div>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={() => setShowProfileEdit(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#ea384c] hover:text-white transition-colors cursor-pointer"
          >
            <User size={18} />
            <span>View Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={onShowLeaderboard}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#ea384c] hover:text-white transition-colors cursor-pointer"
          >
            <Trophy size={18} />
            <span>View Leaderboard</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-red-500"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileView 
        isOpen={showProfileEdit} 
        onClose={() => setShowProfileEdit(false)}
      />
    </div>
  );
}; 