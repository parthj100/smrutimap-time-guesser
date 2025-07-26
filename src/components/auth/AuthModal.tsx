import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { X, Eye, EyeOff, User, MapPin, Lock, CheckCircle, ArrowRight, ArrowLeft, Mail, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = 'welcome' | 'account' | 'profile' | 'location' | 'password' | 'review' | 'success';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [currentStep, setCurrentStep] = useState<AuthStep>('welcome');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    center: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const steps: AuthStep[] = isLogin ? ['welcome', 'account', 'success'] : ['welcome', 'account', 'profile', 'location', 'password', 'review', 'success'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = currentStep === 'success' ? 100 : ((currentStepIndex + 1) / steps.length) * 100;

  const resetForm = () => {
    setFormData({
      username: '',
      displayName: '',
      center: '',
      password: '',
      confirmPassword: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCurrentStep('welcome');
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'account':
    if (!formData.username || formData.username.length < 3) {
      toast.error('Username must be at least 3 characters long');
      return false;
    }
        if (isLogin && (!formData.password || formData.password.length < 6)) {
          toast.error('Password must be at least 6 characters long');
          return false;
        }
        break;
      case 'profile':
        if (!formData.displayName || formData.displayName.length < 2) {
      toast.error('Display name must be at least 2 characters long');
      return false;
    }
        break;
      case 'location':
        if (!formData.center.trim()) {
          toast.error('Please enter your center location');
          return false;
        }
        break;
      case 'password':
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
        break;
    }
    return true;
  };

  const handleStepSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep === 'review') {
      // Handle final submission
    setLoading(true);
    try {
        console.log('📝 Attempting signup for username:', formData.username);
        const { data, error } = await signUp(
          formData.username, 
          formData.displayName, 
          formData.password,
          formData.center
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
          nextStep();
        }
      } catch (error: any) {
        console.error('❌ Auth form submission error:', error);
        toast.error(error.message || 'Sign up failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 'account' && isLogin) {
      // Handle login
      setLoading(true);
      try {
        console.log('🔑 Attempting login for username:', formData.username);
        const { data, error } = await signIn(formData.username, formData.password);
        
        if (error) {
          console.error('❌ Login error:', error);
          
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
          nextStep();
      }
    } catch (error: any) {
      console.error('❌ Auth form submission error:', error);
        toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
    } else {
      nextStep();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <User className="w-7 h-7 text-[#ea384c]" />
            </div>
            <h2 className="text-2xl font-semibold mb-4">
              Welcome to SmrutiMap!
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              Join the community and start playing
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsLogin(false);
                  nextStep();
                }}
                className="w-full bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition"
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setIsLogin(true);
                  nextStep();
                }}
                className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
              >
                Sign In
              </button>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <LogIn className="w-7 h-7 text-[#ea384c]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                {isLogin ? 'Sign in' : 'Create your account'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {isLogin 
                  ? 'Welcome back! Enter your details to continue'
                  : 'Let\'s start by creating your unique username'
                }
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  placeholder={isLogin ? "Enter your username" : "Choose a unique username"}
              type="text"
              value={formData.username}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                  onChange={(e) => updateFormData('username', e.target.value)}
                  autoFocus
            />
          </div>

              {isLogin && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                    onChange={(e) => updateFormData('password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

          {!isLogin && (
                <p className="text-xs text-gray-500 text-left">
                  This will be your unique identifier on SmrutiMap
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={prevStep}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
              >
                Back
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={loading || !formData.username.trim() || (isLogin && !formData.password.trim())}
                className="flex-1 bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  isLogin ? 'Sign In' : 'Continue'
                )}
              </button>
            </div>
          </div>
        );

            case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <User className="w-7 h-7 text-[#ea384c]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Tell us about yourself
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                How would you like to be known?
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  placeholder="Enter your display name"
                type="text"
                value={formData.displayName}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                  onChange={(e) => updateFormData('displayName', e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 text-left">
                This is how other players will see you on leaderboards
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={prevStep}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
              >
                Back
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={!formData.displayName.trim()}
                className="flex-1 bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

            case 'location':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <MapPin className="w-7 h-7 text-[#ea384c]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Where are you from?
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Connect with players in your area
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  placeholder="Enter your center location (e.g., New York, Robbinsville)"
                  type="text"
                  value={formData.center}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                  onChange={(e) => updateFormData('center', e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 text-left">
                This will be displayed on your profile and leaderboards
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={prevStep}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
              >
                Back
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={!formData.center.trim()}
                className="flex-1 bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

            case 'password':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <Lock className="w-7 h-7 text-[#ea384c]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Secure your account
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Create a strong password
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Create a password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                  onChange={(e) => updateFormData('password', e.target.value)}
                  autoFocus
              />
                <button
                type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  placeholder="Confirm your password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 bg-gray-50 text-black text-sm"
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-left">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={prevStep}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
              >
                Back
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={loading || !formData.password.trim()}
                className="flex-1 bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        );

            case 'review':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-6 shadow-lg shadow-opacity-5">
              <CheckCircle className="w-7 h-7 text-[#ea384c]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Review your account
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Review your details before creating your account
              </p>
            </div>
            
            <div className="w-full space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Account Details</h3>
                <div className="bg-white p-3 rounded-lg border space-y-2 text-sm">
                  <p><span className="font-medium">Username:</span> {formData.username}</p>
                  <p><span className="font-medium">Display Name:</span> {formData.displayName}</p>
                  <p><span className="font-medium">Center:</span> {formData.center}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 text-sm">Account ready to create!</p>
                  <p className="text-xs text-green-700">All information looks good</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={prevStep}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 cursor-pointer transition"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </div>
        );

            case 'success':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 mb-6 shadow-lg shadow-opacity-5">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                {isLogin ? 'Welcome Back!' : 'Account Created Successfully!'}
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                {isLogin 
                  ? `Welcome back, ${formData.username}! You're all set.`
                  : `Welcome to SmrutiMap, ${formData.displayName}! Your account is ready.`
                }
              </p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 max-w-md mx-auto">
              <h3 className="font-semibold text-green-900 mb-3 text-sm">What's next?</h3>
              <ul className="text-xs text-green-800 space-y-1 text-left">
                <li>• Start playing and track your progress</li>
                <li>• Compete on leaderboards</li>
                <li>• Connect with other players</li>
                <li>• Explore different game modes</li>
              </ul>
            </div>
            
            <button
              onClick={handleModalClose}
              className="w-full bg-gradient-to-b from-[#ea384c] to-red-600 text-white font-medium py-3 rounded-xl shadow hover:brightness-105 cursor-pointer transition"
            >
              Get Started
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleModalClose}
        >
          <motion.div
            className="w-full max-w-sm bg-gradient-to-b from-red-50/50 to-white rounded-3xl shadow-xl shadow-opacity-10 p-8 flex flex-col items-center border border-red-100 text-black"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar */}
            <div className="w-full mb-6">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-[#ea384c] h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="w-full">
              {renderStep()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 