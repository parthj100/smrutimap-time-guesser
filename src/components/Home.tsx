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

interface HomeProps {
  onPlayClick?: () => void;
  onDailyChallengeClick?: () => void;
  onTutorialClick?: () => void;
  onMultiplayerClick?: () => void;
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
  onMultiplayerClick
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

  const handleDailyChallengeClick = () => {
    if (onDailyChallengeClick) {
      onDailyChallengeClick();
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
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden">
      {/* Adjusted for consistent centering */}
      {isMobile ? (
        <motion.div 
          className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
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
              className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 rounded-full min-h-[44px] min-w-[44px] p-2 shadow-md hover:shadow-lg"
            >
              <Trophy size={18} />
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
                className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 rounded-full min-h-[44px] min-w-[44px] p-2 shadow-md hover:shadow-lg"
              >
                <Camera size={18} />
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
                className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 rounded-full min-h-[44px] min-w-[44px] p-2 shadow-md hover:shadow-lg"
              >
                <MessageSquare size={18} />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Top Left - Leaderboard with enhanced design */}
          <motion.div 
            className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowLeaderboard(true)}
                variant="outline"
                size="lg"
                className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 flex items-center gap-3 rounded-full px-6 py-3 shadow-lg hover:shadow-xl font-work text-lg"
              >
                <Trophy size={22} />
                Leaderboard
              </Button>
            </motion.div>
          </motion.div>

          {/* Bottom Left - Submit Photos */}
          <motion.div 
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowPhotoSubmissionForm(true)}
                variant="outline"
                size="lg"
                className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 flex items-center gap-3 rounded-full px-6 py-3 shadow-lg hover:shadow-xl font-work text-lg"
              >
                <Camera size={22} />
                Submit Photos
              </Button>
            </motion.div>
          </motion.div>

          {/* Bottom Right - Feedback */}
          <motion.div 
            className="fixed bottom-8 right-1/2 transform translate-x-1/2 z-50"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setShowFeedbackForm(true)}
                variant="outline"
                size="lg"
                className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 flex items-center gap-3 rounded-full px-6 py-3 shadow-lg hover:shadow-xl font-work text-lg"
              >
                <MessageSquare size={22} />
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
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.8 }}
        >
          <UserHeader onShowLeaderboard={() => setShowLeaderboard(true)} />
        </motion.div>
      ) : (
        // Mobile: Original positioning
        <div className="fixed top-3 right-16 z-40">
        <UserHeader onShowLeaderboard={() => setShowLeaderboard(true)} />
      </div>
      )}
      
      {/* Main Content - Desktop-first responsive layout */}
      <motion.div 
        className="relative z-10 flex flex-col items-center justify-center flex-1 w-full pt-8 pb-16 px-8 md:pt-12 md:pb-8 md:px-6 sm:pt-16 sm:pb-8 sm:px-4 safe-area-pb"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto space-y-8 md:space-y-6 sm:space-y-6 sm:max-w-md">
          {/* Logo - Desktop-first responsive sizing */}
          <motion.div variants={itemVariants} className="text-center">
            <img 
              src="/smuritmap-logo.png" 
              alt="SmrutiMap Icon" 
              className="w-40 h-40 lg:w-36 lg:h-36 md:w-28 md:h-28 sm:w-20 sm:h-20 mx-auto drop-shadow-2xl transition-all duration-300"
            />
          </motion.div>
          
          {/* Title - Desktop-first variable font sizing */}
          <motion.div 
            className="text-[#ea384c] font-bold tracking-tighter leading-none drop-shadow-2xl text-shadow-lg text-center text-7xl lg:text-6xl md:text-5xl sm:text-4xl"
            variants={itemVariants}
          >
            SMRUTIMAP
          </motion.div>
          
          {/* All Buttons - Improved layout with consistent sizing */}
          <motion.div 
            className="flex flex-col items-center justify-center w-full space-y-4"
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
                className="w-full max-w-lg md:max-w-md sm:max-w-sm mx-auto"
              >
                <GradientButton 
                  onClick={handlePlayClick}
                  className="flex items-center justify-center gap-3 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins px-12 py-5 text-xl md:px-10 md:py-4 md:text-lg sm:px-8 sm:py-3 sm:text-base min-h-[64px] md:min-h-[56px] sm:min-h-[48px]"
                >
                  <Play size={24} className="md:w-5 md:h-5 sm:w-4 sm:h-4" />
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full max-w-lg md:max-w-md sm:max-w-sm mx-auto"
              >
                <GradientButton 
                  onClick={handleDailyChallengeClick}
                  variant="variant"
                  className="flex items-center justify-center gap-3 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins px-12 py-5 text-xl md:px-10 md:py-4 md:text-lg sm:px-8 sm:py-3 sm:text-base min-h-[64px] md:min-h-[56px] sm:min-h-[48px]"
                >
                  <Calendar size={24} className="md:w-5 md:h-5 sm:w-4 sm:h-4" />
                  Daily Challenge
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
                className="w-full max-w-lg md:max-w-md sm:max-w-sm mx-auto"
              >
                <GradientButton 
                  onClick={handleTutorialClick}
                  variant="blue"
                  className="flex items-center justify-center gap-3 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins px-12 py-5 text-xl md:px-10 md:py-4 md:text-lg sm:px-8 sm:py-3 sm:text-base min-h-[64px] md:min-h-[56px] sm:min-h-[48px]"
                >
                  <GraduationCap size={24} className="md:w-5 md:h-5 sm:w-4 sm:h-4" />
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
                  className="w-full max-w-lg md:max-w-md sm:max-w-sm mx-auto"
                >
                  <GradientButton 
                    onClick={handleMultiplayerClick}
                    variant="purple"
                    className="flex items-center justify-center gap-3 rounded-full text-white font-bold drop-shadow-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full font-poppins px-12 py-5 text-xl md:px-10 md:py-4 md:text-lg sm:px-8 sm:py-3 sm:text-base min-h-[64px] md:min-h-[56px] sm:min-h-[48px]"
                  >
                    <Users size={24} className="md:w-5 md:h-5 sm:w-4 sm:h-4" />
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
