import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Calendar, GraduationCap, Camera, Trophy, MessageSquare, Users } from 'lucide-react';
import { GradientButton } from '@/components/ui/gradient-button';
import { UserHeader } from './UserHeader';
import { Leaderboard } from './Leaderboard';
import { FeedbackForm } from './FeedbackForm';
import PhotoSubmissionForm from './PhotoSubmissionForm';
import { useBreakpoint } from '@/hooks/useResponsive';
import { DiwaliBanner } from './Diwali/DiwaliBanner';
import { FloatingParticles } from './Diwali/FloatingParticles';
import { Fireworks } from './Diwali/Fireworks';

interface HomeProps {
  onPlayClick?: () => void;
  onDailyChallengeClick?: () => Promise<void>;
  onTutorialClick?: () => void;
  onMultiplayerClick?: () => void;
  hasPlayedDailyToday?: boolean;
  onRefreshDailyChallenge?: () => Promise<void>;
}

// Animation variants for staggered effects
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
      ease: "easeOut",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      duration: 0.8,
    },
  },
};

const buttonContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 12,
      mass: 0.8,
    },
  },
};

export const Home: React.FC<HomeProps> = ({
  onPlayClick,
  onDailyChallengeClick,
  onTutorialClick,
  onMultiplayerClick,
  hasPlayedDailyToday = false,
  onRefreshDailyChallenge
}) => {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showPhotoSubmissionForm, setShowPhotoSubmissionForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    // Trigger fade-in effect immediately when component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handlePlayClick = () => {
    if (onPlayClick) {
      onPlayClick();
    }
  };

  const handleDailyChallengeClick = async () => {
    if (hasPlayedDailyToday && onRefreshDailyChallenge) {
      // If already played today, try to refresh the status
      await onRefreshDailyChallenge();
    } else if (onDailyChallengeClick) {
      await onDailyChallengeClick();
    }
  };

  const handleTutorialClick = () => {
    if (onTutorialClick) {
      onTutorialClick();
    }
  };

  const handleMultiplayerClick = () => {
    if (onMultiplayerClick) {
      onMultiplayerClick();
    }
  };

  const handleSubmitPhotosClick = () => {
    navigate('/submit-photos');
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-full">
      {/* Festive Effects */}
      <FloatingParticles />
      <Fireworks />
      
      {/* Corner Buttons - Improved Mobile Layout */}
      {isMobile ? (
        // Mobile: Better spaced layout with improved touch targets
        <motion.div 
          className="fixed top-3 left-3 right-3 z-50 flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          {/* Left side - Leaderboard */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => setShowLeaderboard(true)}
              variant="outline"
              size="sm"
              className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 rounded-full min-h-[40px] min-w-[40px] p-2 shadow-md hover:shadow-lg"
            >
              <Trophy size={16} />
            </Button>
          </motion.div>
          
          {/* Right side - Actions with better spacing */}
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowPhotoSubmissionForm(true)}
                variant="outline"
                size="sm"
                className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 rounded-full min-h-[40px] min-w-[40px] p-2 shadow-md hover:shadow-lg"
              >
                <Camera size={16} />
              </Button>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowFeedbackForm(true)}
                variant="outline"
                size="sm"
                className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 rounded-full min-h-[40px] min-w-[40px] p-2 shadow-md hover:shadow-lg"
              >
                <MessageSquare size={16} />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        // Desktop: Corner layout with enhanced effects
        <>
          {/* Top Left - Leaderboard with enhanced design */}
          <motion.div 
            className="fixed top-6 left-6 z-50"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowLeaderboard(true)}
                variant="outline"
                className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg hover:shadow-xl font-work"
              >
                <Trophy size={18} />
                Leaderboard
              </Button>
            </motion.div>
          </motion.div>

          {/* Bottom Left - Submit Photos */}
          <motion.div 
            className="fixed bottom-6 left-6 z-50"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowPhotoSubmissionForm(true)}
                variant="outline"
                className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg hover:shadow-xl font-work"
              >
                <Camera size={18} />
                Submit Photos
              </Button>
            </motion.div>
          </motion.div>

          {/* Bottom Right - Feedback */}
          <motion.div 
            className="fixed bottom-6 right-6 z-50"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowFeedbackForm(true)}
                variant="outline"
                className="bg-[#ea384c] hover:bg-red-600 text-white transition-all duration-300 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg hover:shadow-xl font-work"
              >
                <MessageSquare size={18} />
                Feedback
              </Button>
            </motion.div>
          </motion.div>
        </>
      )}

      {/* User Header - Mobile-aware positioning */}
      {!isMobile ? (
        // Desktop: Animated corner position
        <motion.div
          className="fixed top-6 right-6 z-50"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        >
          <UserHeader onShowLeaderboard={() => setShowLeaderboard(true)} />
        </motion.div>
      ) : (
        // Mobile: Original positioning
        <div className="fixed top-3 right-16 z-40">
        <UserHeader onShowLeaderboard={() => setShowLeaderboard(true)} />
      </div>
      )}
      
      {/* Main Content - Enhanced responsive layout */}
      <motion.div 
        className={`relative z-10 flex flex-col items-center justify-center flex-1 w-full px-4 ${
          isMobile ? 'pt-14 pb-6' : 'pt-8 pb-16'
        }`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={`flex flex-col items-center w-full max-w-6xl ${isMobile ? 'max-w-sm' : ''}`}>
          {/* Diwali Banner - Above Logo */}
          <DiwaliBanner isMobile={isMobile} />
          
          {/* Logo - Better responsive sizing */}
          <motion.div variants={itemVariants}>
            <img 
              src="/smuritmap-logo.png" 
              alt="SmrutiMap Icon" 
              className={`drop-shadow-2xl transition-all duration-300 ${
                isMobile 
                  ? 'w-14 h-14 sm:w-18 sm:h-18 mb-2' 
                  : 'w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 xl:w-48 xl:h-48 mb-3 lg:mb-4'
              }`}
            />
          </motion.div>
          
          {/* Title - Improved variable font sizing with CSS clamp */}
          <motion.div 
            className="text-[#ea384c] font-bold tracking-tighter leading-none drop-shadow-2xl text-shadow-lg text-center mb-6 lg:mb-8 text-responsive-hero font-space"
            variants={itemVariants}
          >
            SMRUTIMAP
          </motion.div>
          
          {/* All Buttons - Improved layout with consistent sizing */}
          <motion.div 
            className={`flex flex-col items-center w-full ${isMobile ? 'gap-3' : 'gap-4 lg:gap-5'}`}
            variants={buttonContainerVariants}
          >
            {/* Play Button */}
            <motion.div 
              className="w-full flex justify-center"
              variants={buttonVariants}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={isMobile ? 'w-full max-w-xs' : 'w-full max-w-sm'}
              >
                <GradientButton 
                  onClick={handlePlayClick}
                  className={`flex items-center justify-center gap-2 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins ${
                    isMobile 
                      ? 'px-6 py-3 text-base min-h-[48px]' 
                      : 'px-8 py-4 lg:px-10 lg:py-4 text-lg lg:text-xl min-h-[52px] lg:min-h-[56px]'
                  }`}
                >
                  <Play size={isMobile ? 18 : 20} className="lg:w-6 lg:h-6" />
                  Play
                </GradientButton>
              </motion.div>
            </motion.div>

            {/* Daily Challenge Button */}
            <motion.div 
              className="w-full flex justify-center"
              variants={buttonVariants}
            >
              <motion.div
                whileHover={hasPlayedDailyToday ? {} : { scale: 1.05 }}
                whileTap={hasPlayedDailyToday ? {} : { scale: 0.95 }}
                className={isMobile ? 'w-full max-w-xs' : 'w-full max-w-sm'}
              >
                <GradientButton 
                  onClick={handleDailyChallengeClick}
                  variant="variant"
                  disabled={false}
                  className={`flex items-center justify-center gap-2 rounded-full text-white font-bold drop-shadow-xl shadow-lg transition-all duration-300 w-full font-poppins ${
                    hasPlayedDailyToday 
                      ? 'opacity-80 cursor-pointer bg-gray-500 hover:bg-gray-400' 
                      : 'hover:shadow-xl'
                  } ${
                    isMobile 
                      ? 'px-6 py-3 text-base min-h-[48px]' 
                      : 'px-8 py-4 lg:px-10 lg:py-4 text-lg lg:text-xl min-h-[52px] lg:min-h-[56px]'
                  }`}
                >
                  <Calendar size={isMobile ? 18 : 20} className="lg:w-6 lg:h-6" />
                  {hasPlayedDailyToday ? 'Daily Challenge Completed' : 'Daily Challenge'}
                </GradientButton>
              </motion.div>
            </motion.div>

            {/* Tutorial Button */}
            <motion.div 
              className="w-full flex justify-center"
              variants={buttonVariants}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={isMobile ? 'w-full max-w-xs' : 'w-full max-w-sm'}
              >
                <GradientButton 
                  onClick={handleTutorialClick}
                  variant="blue"
                  className={`flex items-center justify-center gap-2 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins ${
                    isMobile 
                      ? 'px-6 py-3 text-base min-h-[48px]' 
                      : 'px-8 py-4 lg:px-10 lg:py-4 text-lg lg:text-xl min-h-[52px] lg:min-h-[56px]'
                  }`}
                >
                  <GraduationCap size={isMobile ? 18 : 20} className="lg:w-6 lg:h-6" />
                  Tutorial
                </GradientButton>
              </motion.div>
            </motion.div>

            {/* Multiplayer Button */}
            {onMultiplayerClick && (
              <motion.div 
                className="w-full flex justify-center"
                variants={buttonVariants}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={isMobile ? 'w-full max-w-xs' : 'w-full max-w-sm'}
                >
                  <GradientButton 
                    onClick={handleMultiplayerClick}
                    variant="purple"
                    className={`flex items-center justify-center gap-2 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins ${
                      isMobile 
                        ? 'px-6 py-3 text-base min-h-[48px]' 
                        : 'px-8 py-4 lg:px-10 lg:py-4 text-lg lg:text-xl min-h-[52px] lg:min-h-[56px]'
                    }`}
                  >
                    <Users size={isMobile ? 18 : 20} className="lg:w-6 lg:h-6" />
                    Multiplayer
                  </GradientButton>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
      
      {/* Modals */}
      <AnimatePresence>
        {showLeaderboard && (
      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
        )}

        {showFeedbackForm && (
      <FeedbackForm 
        isOpen={showFeedbackForm} 
        onClose={() => setShowFeedbackForm(false)} 
      />
        )}

        {showPhotoSubmissionForm && (
          <PhotoSubmissionForm 
            isOpen={showPhotoSubmissionForm} 
            onClose={() => setShowPhotoSubmissionForm(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
