import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  Edit3, 
  Save, 
  User, 
  Gamepad2, 
  Trophy,
  Target,
  Crown,
  Calendar,
  Check,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProfileFormData {
  display_name: string;
  username: string;
  favorite_game_mode: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ isOpen, onClose }) => {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    username: '',
    favorite_game_mode: ''
  });
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Game mode options
  const gameModeOptions = [
    { value: 'classic', label: 'Classic Mode', icon: '🎯' },
    { value: 'daily', label: 'Daily Challenge', icon: '📅' },
    { value: 'multiplayer', label: 'Multiplayer', icon: '👥' },
    { value: 'mixed', label: 'Mixed', icon: '🎲' }
  ];

  // Initialize form data when entering edit mode
  React.useEffect(() => {
    if (isEditing && profile) {
      setFormData({
        display_name: profile.display_name || '',
        username: profile.username || '',
        favorite_game_mode: profile.favorite_game_mode || ''
      });
      setErrors({});
    }
  }, [isEditing, profile]);

  const validateField = (field: keyof ProfileFormData, value: string): string | null => {
    switch (field) {
      case 'display_name':
        if (!value.trim()) return 'Display name is required';
        if (value.length > 50) return 'Display name must be 50 characters or less';
        return null;
      
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (value.length > 20) return 'Username must be 20 characters or less';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return null;
      
      default:
        return null;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};
    
    const displayNameError = validateField('display_name', formData.display_name);
    if (displayNameError) newErrors.display_name = displayNameError;
    
    const usernameError = validateField('username', formData.username);
    if (usernameError) newErrors.username = usernameError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormData = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;
    
    setIsSubmitting(true);

    try {
      console.log('🔄 Updating user profile...');
      
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: formData.display_name,
          username: formData.username,
          favorite_game_mode: formData.favorite_game_mode || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Profile update error:', error);
        
        if (error.code === '23505') {
          setErrors({ username: 'This username is already taken' });
          toast({
            title: "Username already taken",
            description: "Please choose a different username.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Update failed",
            description: "There was an error updating your profile. Please try again.",
            variant: "destructive"
          });
        }
        return;
      }

      console.log('✅ Profile updated successfully');
      
      // Reload profile data
      await refreshProfile();
      
      setIsEditing(false);
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      });

    } catch (error) {
      console.error('💥 Unexpected error updating profile:', error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isEditing) {
        handleCancel();
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;
  
  // Show loading state if profile is not yet available
  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div 
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ea384c] rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Profile</h2>
                <p className="text-sm text-gray-600">Loading your profile information...</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X size={20} />
            </Button>
          </div>
          <div className="p-6 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-[#ea384c] border-t-transparent" />
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || 'User';
  const username = profile.username || 'user';
  const userInitial = displayName.charAt(0).toUpperCase();
  const selectedGameMode = gameModeOptions.find(opt => opt.value === profile.favorite_game_mode);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ea384c] rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Profile' : 'Your Profile'}
              </h2>
              <p className="text-sm text-gray-600">
                {isEditing ? 'Update your information' : 'View and manage your account'}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600 rounded-full"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#ea384c] to-red-600 text-white rounded-xl">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {userInitial}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{displayName}</h3>
              <p className="text-white/80">@{username}</p>
            </div>
                         {!isEditing && (
               <Button
                 onClick={() => {
                   console.log('🔧 Entering edit mode for profile:', profile);
                   setIsEditing(true);
                 }}
                 variant="ghost"
                 size="sm"
                 className="text-white hover:bg-white/20 rounded-lg"
               >
                 <Edit3 size={16} className="mr-2" />
                 Edit
               </Button>
             )}
          </div>

          {/* Profile Information */}
          <div className="grid gap-6">
            {/* Display Name */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User size={16} />
                  Display Name
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={formData.display_name}
                      onChange={(e) => updateFormData('display_name', e.target.value)}
                      placeholder="Enter your display name"
                      maxLength={50}
                      className={errors.display_name ? 'border-red-500' : ''}
                    />
                    {errors.display_name && (
                      <p className="text-red-500 text-sm">{errors.display_name}</p>
                    )}
                    <p className="text-xs text-gray-500">{formData.display_name.length}/50 characters</p>
                  </div>
                ) : (
                  <p className="text-lg">{profile.display_name || 'Not set'}</p>
                )}
              </CardContent>
            </Card>

            {/* Username */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User size={16} />
                  Username
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-500">@</span>
                      <Input
                        value={formData.username}
                        onChange={(e) => updateFormData('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="your_username"
                        maxLength={20}
                        className={`pl-8 ${errors.username ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors.username && (
                      <p className="text-red-500 text-sm">{errors.username}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formData.username.length}/20 characters • Letters, numbers, and underscores only
                    </p>
                  </div>
                ) : (
                  <p className="text-lg">@{profile.username}</p>
                )}
              </CardContent>
            </Card>

            {/* Favorite Game Mode */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Gamepad2 size={16} />
                  Favorite Game Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                                 {isEditing ? (
                   <Select
                     value={formData.favorite_game_mode || undefined}
                     onValueChange={(value) => updateFormData('favorite_game_mode', value)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select your favorite mode" />
                     </SelectTrigger>
                     <SelectContent>
                       {gameModeOptions.map((option) => (
                         <SelectItem key={option.value} value={option.value}>
                           <span className="flex items-center gap-2">
                             <span>{option.icon}</span>
                             <span>{option.label}</span>
                           </span>
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 ) : (
                   <p className="text-lg">
                     {selectedGameMode ? (
                       <span className="flex items-center gap-2">
                         <span>{selectedGameMode.icon}</span>
                         <span>{selectedGameMode.label}</span>
                       </span>
                     ) : (
                       'Not selected'
                     )}
                   </p>
                 )}
              </CardContent>
            </Card>

            {/* Game Statistics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Trophy size={16} />
                  Game Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Target size={20} className="text-[#ea384c]" />
                    <div>
                      <div className="font-semibold text-gray-800">{profile.total_games_played || 0}</div>
                      <div className="text-gray-600 text-sm">Games Played</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Crown size={20} className="text-yellow-500" />
                    <div>
                      <div className="font-semibold text-gray-800">{Math.round(profile.total_score || 0)}</div>
                      <div className="text-gray-600 text-sm">Total Score</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Trophy size={20} className="text-green-500" />
                    <div>
                      <div className="font-semibold text-gray-800">{Math.round(profile.best_single_game_score || 0)}</div>
                      <div className="text-gray-600 text-sm">Best Game</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar size={20} className="text-blue-500" />
                    <div>
                      <div className="font-semibold text-gray-800">
                        {profile.total_games_played ? Math.round((profile.total_score || 0) / profile.total_games_played) : 0}
                      </div>
                      <div className="text-gray-600 text-sm">Average Score</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Last updated: {new Date(profile.updated_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                <XCircle size={16} className="mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 bg-[#ea384c] hover:bg-red-600"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileView; 