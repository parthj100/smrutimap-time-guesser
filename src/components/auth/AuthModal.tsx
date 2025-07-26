import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { X, Eye, EyeOff, User, MapPin, Lock, CheckCircle, ArrowRight, ArrowLeft, Users, Gamepad2, Trophy } from 'lucide-react';
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

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const renderStep = () => {
    switch (currentStep) {
             case 'welcome':
         return (
           <div className="text-center space-y-8">
             <div className="space-y-6">
               <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
                 <User size={40} className="text-white" />
               </div>
               
               <div>
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                   Welcome to SmrutiMap! 🎮
                 </h2>
               </div>

               <div className="grid gap-4 max-w-md mx-auto text-left">
                 <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                   <span className="text-2xl">🏆</span>
                   <div>
                     <h3 className="font-semibold text-gray-900">Compete & Track Progress</h3>
                     <p className="text-sm text-gray-600">Save your scores and climb the leaderboards</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                   <span className="text-2xl">🌍</span>
                   <div>
                     <h3 className="font-semibold text-gray-900">Join the Community</h3>
                     <p className="text-sm text-gray-600">Connect with players from around the world</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                   <span className="text-2xl">📊</span>
                   <div>
                     <h3 className="font-semibold text-gray-900">Detailed Analytics</h3>
                     <p className="text-sm text-gray-600">View your performance and improvement over time</p>
                   </div>
                 </div>
               </div>

               <div className="space-y-4">
                 <Button
                   onClick={() => {
                     setIsLogin(false);
                     nextStep();
                   }}
                   className="w-full px-8 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white text-lg font-medium"
                 >
                   Create Account
                   <ArrowRight className="w-5 h-5 ml-2" />
                 </Button>
                 
                 <Button
                   onClick={() => {
                     setIsLogin(true);
                     nextStep();
                   }}
                   variant="outline"
                   className="w-full px-8 py-3 rounded-xl border-2 border-gray-300 hover:border-[#ea384c] hover:bg-gray-50 text-gray-700 text-lg font-medium"
                 >
                   Sign In
                   <ArrowRight className="w-5 h-5 ml-2" />
                 </Button>
               </div>
             </div>
           </div>
         );

             case 'account':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                 {isLogin ? 'Welcome Back!' : 'Create Your Account'} 👋
               </h2>
               <p className="text-lg text-gray-600 max-w-md mx-auto">
                 {isLogin 
                   ? 'Sign in to access your profile and continue your journey'
                   : 'Let\'s start by creating your unique username'
                 }
               </p>
             </div>

             <div className="space-y-6 max-w-md mx-auto">
               <div>
                 <label className="block text-lg font-medium text-gray-700 mb-3">Username</label>
                 <Input
                   type="text"
                   value={formData.username}
                   onChange={(e) => updateFormData('username', e.target.value)}
                   placeholder={isLogin ? "Enter your username" : "Choose a unique username"}
                   className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                   autoFocus
                 />
                 {!isLogin && (
                   <p className="text-sm text-gray-500 mt-2">
                     This will be your unique identifier on SmrutiMap
                   </p>
                 )}
               </div>

               {isLogin && (
                 <div>
                   <label className="block text-lg font-medium text-gray-700 mb-3">Password</label>
                   <div className="relative">
                     <Input
                       type={showPassword ? 'text' : 'password'}
                       value={formData.password}
                       onChange={(e) => updateFormData('password', e.target.value)}
                       placeholder="Enter your password"
                       className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400 pr-12"
                     />
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-transparent"
                       onClick={() => setShowPassword(!showPassword)}
                     >
                       {showPassword ? (
                         <EyeOff className="h-5 w-5 text-gray-400" />
                       ) : (
                         <Eye className="h-5 w-5 text-gray-400" />
                       )}
                     </Button>
                   </div>
                 </div>
               )}
             </div>

             <div className="flex gap-4 max-w-md mx-auto">
               <Button
                 onClick={prevStep}
                 variant="outline"
                 className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back
               </Button>
               <Button
                 onClick={handleStepSubmit}
                 disabled={loading || !formData.username.trim() || (isLogin && !formData.password.trim())}
                 className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {loading ? (
                   <>
                     <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                     Signing In...
                   </>
                 ) : (
                   <>
                     {isLogin ? 'Sign In' : 'Continue'}
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </>
                 )}
               </Button>
             </div>
           </div>
         );

             case 'profile':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                 Tell us about yourself 👤
               </h2>
               <p className="text-lg text-gray-600 max-w-md mx-auto">
                 How would you like to be known in the SmrutiMap community?
               </p>
             </div>

             <div className="space-y-6 max-w-md mx-auto">
               <div>
                 <label className="block text-lg font-medium text-gray-700 mb-3">Display Name</label>
                 <Input
                   type="text"
                   value={formData.displayName}
                   onChange={(e) => updateFormData('displayName', e.target.value)}
                   placeholder="Enter your display name"
                   className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                   autoFocus
                 />
                 <p className="text-sm text-gray-500 mt-2">
                   This is how other players will see you on leaderboards
                 </p>
               </div>
             </div>

             <div className="flex gap-4 max-w-md mx-auto">
               <Button
                 onClick={prevStep}
                 variant="outline"
                 className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back
               </Button>
               <Button
                 onClick={handleStepSubmit}
                 disabled={!formData.displayName.trim()}
                 className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Continue
                 <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             </div>
           </div>
         );

             case 'location':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                 Where are you from? 📍
               </h2>
               <p className="text-lg text-gray-600 max-w-md mx-auto">
                 Help us connect you with players in your area
               </p>
             </div>

             <div className="space-y-6 max-w-md mx-auto">
               <div>
                 <label className="block text-lg font-medium text-gray-700 mb-3">Center Location</label>
                 <Input
                   type="text"
                   value={formData.center}
                   onChange={(e) => updateFormData('center', e.target.value)}
                   placeholder="Enter your center location (e.g., New York, Robbinsville)"
                   className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400"
                   autoFocus
                 />
                 <p className="text-sm text-gray-500 mt-2">
                   This will be displayed on your profile and leaderboards
                 </p>
               </div>
             </div>

             <div className="flex gap-4 max-w-md mx-auto">
               <Button
                 onClick={prevStep}
                 variant="outline"
                 className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back
               </Button>
               <Button
                 onClick={handleStepSubmit}
                 disabled={!formData.center.trim()}
                 className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Continue
                 <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
             </div>
           </div>
         );

             case 'password':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                 Secure Your Account 🔒
               </h2>
               <p className="text-lg text-gray-600 max-w-md mx-auto">
                 Create a strong password to protect your account
               </p>
             </div>

             <div className="space-y-6 max-w-md mx-auto">
               <div>
                 <label className="block text-lg font-medium text-gray-700 mb-3">Password</label>
                 <div className="relative">
                   <Input
                     type={showPassword ? 'text' : 'password'}
                     value={formData.password}
                     onChange={(e) => updateFormData('password', e.target.value)}
                     placeholder="Create a password"
                     className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400 pr-12"
                     autoFocus
                   />
                   <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-transparent"
                     onClick={() => setShowPassword(!showPassword)}
                   >
                     {showPassword ? (
                       <EyeOff className="h-5 w-5 text-gray-400" />
                     ) : (
                       <Eye className="h-5 w-5 text-gray-400" />
                     )}
                   </Button>
                 </div>
                 <p className="text-sm text-gray-500 mt-2">
                   Must be at least 6 characters long
                 </p>
               </div>

               <div>
                 <label className="block text-lg font-medium text-gray-700 mb-3">Confirm Password</label>
                 <div className="relative">
                   <Input
                     type={showConfirmPassword ? 'text' : 'password'}
                     value={formData.confirmPassword}
                     onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                     placeholder="Confirm your password"
                     className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:outline-none transition-colors placeholder-gray-400 pr-12"
                   />
                   <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-transparent"
                     onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                   >
                     {showConfirmPassword ? (
                       <EyeOff className="h-5 w-5 text-gray-400" />
                     ) : (
                       <Eye className="h-5 w-5 text-gray-400" />
                     )}
                   </Button>
                 </div>
               </div>
             </div>

             <div className="flex gap-4 max-w-md mx-auto">
               <Button
                 onClick={prevStep}
                 variant="outline"
                 className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back
               </Button>
               <Button
                 onClick={handleStepSubmit}
                 disabled={loading || !formData.password.trim()}
                 className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50"
               >
                 {loading ? (
                   <>
                     <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                     Creating Account...
                   </>
                 ) : (
                   <>
                     Continue
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </>
                 )}
               </Button>
             </div>
           </div>
         );

             case 'review':
         return (
           <div className="space-y-8">
             <div className="text-center">
               <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                 Review Your Account 👀
               </h2>
               <p className="text-lg text-gray-600 max-w-md mx-auto">
                 Please review all details before creating your account
               </p>
             </div>
             
             <div className="space-y-6 max-w-md mx-auto">
               <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                 <div>
                   <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Account Details</h3>
                   <div className="bg-white p-4 rounded-xl border space-y-2">
                     <p><span className="font-medium">Username:</span> {formData.username}</p>
                     <p><span className="font-medium">Display Name:</span> {formData.displayName}</p>
                     <p><span className="font-medium">Center:</span> {formData.center}</p>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                   <CheckCircle className="w-5 h-5 text-green-600" />
                   <div>
                     <p className="font-medium text-green-900">Account ready to create!</p>
                     <p className="text-sm text-green-700">All information looks good</p>
                   </div>
                 </div>
               </div>
             </div>

             <div className="flex gap-4 max-w-md mx-auto">
               <Button
                 onClick={prevStep}
                 variant="outline"
                 className="flex-1 py-3 rounded-xl border-2 hover:bg-gray-50"
                 disabled={loading}
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back
               </Button>
               <Button
                 onClick={handleStepSubmit}
                 disabled={loading}
                 className="flex-1 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white disabled:opacity-50"
               >
                 {loading ? (
                   <>
                     <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                     Creating Account...
                   </>
                 ) : (
                   <>
                     Create Account
                     <ArrowRight className="w-4 h-4 ml-2" />
                   </>
                 )}
               </Button>
             </div>
           </div>
         );

             case 'success':
         return (
           <div className="text-center space-y-8">
             <div className="space-y-6">
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                 <CheckCircle size={40} className="text-green-600" />
               </div>
               
               <div>
                 <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                   {isLogin ? 'Welcome Back!' : 'Account Created Successfully!'} 🎉
                 </h2>
                 <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                   {isLogin 
                     ? `Welcome back to SmrutiMap, ${formData.username}! You're all set to continue your journey.`
                     : `Welcome to SmrutiMap, ${formData.displayName}! Your account has been created successfully.`
                   }
                 </p>
               </div>

               <div className="bg-green-50 rounded-xl p-6 max-w-md mx-auto">
                 <h3 className="font-semibold text-green-900 mb-3">What's next?</h3>
                 <ul className="text-sm text-green-800 space-y-2 text-left">
                   <li>• Start playing and track your progress</li>
                   <li>• Compete on leaderboards</li>
                   <li>• Connect with other players</li>
                   <li>• Explore different game modes</li>
                 </ul>
               </div>
               
               <Button
                 onClick={handleModalClose}
                 className="px-8 py-3 rounded-xl bg-[#ea384c] hover:bg-red-600 text-white text-lg font-medium"
               >
                 Get Started
                 <ArrowRight className="w-5 h-5 ml-2" />
               </Button>
             </div>
           </div>
         );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header with Progress */}
          {currentStep !== 'success' && currentStep !== 'welcome' && (
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ea384c] rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-gray-700">
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </span>
                </div>
                <Button
                  onClick={handleModalClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X size={20} />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#ea384c] to-pink-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
            </div>
          )}

          {/* Welcome step header */}
          {currentStep === 'welcome' && (
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ea384c] rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-gray-700">Welcome to SmrutiMap</span>
                </div>
                <Button
                  onClick={handleModalClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600 rounded-full"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="p-8">
            <div className="min-h-[500px] flex flex-col justify-center">
              {renderStep()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 