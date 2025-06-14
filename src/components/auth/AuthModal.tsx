import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const resetForm = () => {
    setFormData({
      username: '',
      displayName: '',
      password: '',
      confirmPassword: ''
    });
    setShowPassword(false);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    if (!formData.username || formData.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return false;
    }

    if (!isLogin && (!formData.displayName || formData.displayName.length < 2)) {
      toast.error('Display name must be at least 2 characters long');
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        console.log('🔑 Attempting login for username:', formData.username);
        const { data, error } = await signIn(formData.username, formData.password);
        
        if (error) {
          console.error('❌ Login error:', error);
          
          // More specific error handling
          if (error.message?.includes('username')) {
            toast.error(`Login failed: ${error.message}`);
          } else if (error.message?.includes('Network')) {
            toast.error('Network error. Please check your connection and try again.');
          } else {
            toast.error(error.message || 'Login failed. Please check your username and password.');
          }
          return;
        }

        if (data?.user) {
          console.log('✅ Login successful for user:', data.user.id);
          toast.success(`Welcome back, ${formData.username}!`);
          handleModalClose();
        }
      } else {
        console.log('📝 Attempting signup for username:', formData.username);
        const { data, error } = await signUp(
          formData.username, 
          formData.displayName, 
          formData.password
        );
        
        if (error) {
          console.error('❌ Signup error:', error);
          
          if (error.message?.includes('duplicate') || error.message?.includes('already') || error.message?.includes('taken')) {
            toast.error('Username already taken. Please choose a different username.');
          } else if (error.message?.includes('Password')) {
            toast.error('Password must be at least 6 characters long.');
          } else if (error.message?.includes('Network')) {
            toast.error('Network error. Please check your connection and try again.');
          } else {
            toast.error(error.message || 'Sign up failed. Please try again.');
          }
          return;
        }

        if (data?.user) {
          console.log('✅ Signup successful for user:', data.user.id);
          toast.success(`Welcome to SMRUTIMAP, ${formData.displayName}!`);
          handleModalClose();
        }
      }
    } catch (error: any) {
      console.error('❌ Auth form submission error:', error);
      toast.error(error.message || (isLogin ? 'Login failed. Please try again.' : 'Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-[#ea384c] rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-[#ea384c] mb-2">
            {isLogin ? 'Welcome Back!' : 'Join SMRUTIMAP'}
          </DialogTitle>
          <p className="text-center text-gray-600 text-sm">
            {isLogin 
              ? 'Sign in to track your progress and compete on leaderboards'
              : 'Create an account to save your scores and climb the leaderboards'
            }
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Choose a unique username"
              className="border-gray-300 focus:border-[#ea384c] focus:ring-[#ea384c]"
              required
              minLength={3}
              disabled={loading}
            />
          </div>

          {/* Display Name Field (Sign Up Only) */}
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-gray-700">
                Display Name
              </label>
              <Input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your display name"
                className="border-gray-300 focus:border-[#ea384c] focus:ring-[#ea384c]"
                required
                minLength={2}
                disabled={loading}
              />
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="border-gray-300 focus:border-[#ea384c] focus:ring-[#ea384c] pr-10"
                required
                minLength={6}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirm Password Field (Sign Up Only) */}
          {!isLogin && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your password"
                className="border-gray-300 focus:border-[#ea384c] focus:ring-[#ea384c]"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#ea384c] hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </Button>

          {/* Mode Switch */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button
                type="button"
                variant="link"
                onClick={handleModeSwitch}
                className="text-[#ea384c] hover:text-red-600 font-semibold ml-1 p-0 h-auto"
                disabled={loading}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Button>
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 