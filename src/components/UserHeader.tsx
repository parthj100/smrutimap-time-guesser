import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Trophy, LogOut, Crown, Target, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './auth/AuthModal';

interface UserHeaderProps {
  onShowLeaderboard: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ onShowLeaderboard }) => {
  const { user, profile, signOut, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    console.log('🚪 Sign out requested');
    try {
      await signOut();
      console.log('✅ Sign out completed');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
    }
  };

  // Show authenticated state if user exists, even if profile is loading/missing
  if (!user) {
    // Guest user - show login/signup buttons
    return (
      <>
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
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
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
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
            </div>
          )}

          <DropdownMenuSeparator />

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
    </div>
  );
}; 