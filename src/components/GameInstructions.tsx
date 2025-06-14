import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Timer, 
  ArrowLeft, 
  Clock, 
  Star, 
  Target, 
  Zap,
  Trophy,
  Brain,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserHeader } from './UserHeader';
import { Leaderboard } from './Leaderboard';

interface GameInstructionsProps {
  onStart: (isTimedMode: boolean, timerType: 'per-round' | 'total-game') => void;
  onGoBack: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const GameInstructions: React.FC<GameInstructionsProps> = ({ onStart, onGoBack }) => {
  const [selectedMode, setSelectedMode] = useState<'normal' | 'timed'>('normal');
  const [timerType, setTimerType] = useState<'per-round' | 'total-game'>('per-round');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const handleStart = () => {
    onStart(selectedMode === 'timed', timerType);
  };

  return (
    <div className="relative flex flex-col min-h-screen w-full">
      {/* User Header */}
      <UserHeader onShowLeaderboard={() => setShowLeaderboard(true)} />
      
      {/* Back button - Enhanced styling */}
      <motion.div 
        className="absolute top-6 left-6 z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            onClick={onGoBack}
            variant="outline"
            className="bg-white/95 backdrop-blur-sm border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white transition-all duration-300 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Button>
        </motion.div>
      </motion.div>

      {/* Main Content Container */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-7xl mx-auto w-full relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Single Unified Card - Header + Game Mode Selection */}
        <motion.div 
          className="w-full max-w-4xl mb-8"
          variants={itemVariants}
        >
          <Card className="p-8 bg-white/70 backdrop-blur-md border-gray-200 shadow-xl rounded-3xl">
            
            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src="/smuritmap-logo.png" 
                    alt="SmrutiMap Icon" 
                    className="h-16 lg:h-20 xl:h-24 w-auto drop-shadow-2xl"
                  />
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#ea384c] rounded-full flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Play size={12} className="text-white ml-0.5" />
                  </motion.div>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#ea384c] mb-4">
                Choose Your Game Mode
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto mb-8">
                Experience historical photo analysis in your preferred style
              </p>
              
              {/* Divider */}
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            </div>

            {/* Game Mode Selection Grid */}
            <div className="grid md:grid-cols-2 gap-8 relative">
              
              {/* Normal Mode Section */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMode('normal')}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-300 min-h-[380px] flex flex-col ${
                  selectedMode === 'normal' 
                    ? 'border-[#ea384c] bg-red-50/80 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4 mb-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMode === 'normal' ? 'bg-[#ea384c]' : 'bg-blue-100'
                  }`}>
                    <Brain size={24} className={selectedMode === 'normal' ? 'text-white' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Relaxed Mode</h3>
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">Beginner Friendly</span>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock size={14} className="text-green-500" />
                        <span>No time pressure</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Lightbulb size={14} className="text-yellow-500" />
                        <span>Focus on learning</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Target size={14} className="text-blue-500" />
                        <span>Accuracy-based scoring</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Fixed height container for dynamic content */}
                <div className="h-16 flex items-end">
                  <AnimatePresence mode="wait">
                    {selectedMode === 'normal' && (
                      <motion.div 
                        className="w-full p-3 bg-red-100/90 backdrop-blur-sm rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center gap-2 text-[#ea384c] font-medium text-sm">
                          <Play size={14} />
                          <span>Ready to start your thoughtful journey through history</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Divider Line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 transform -translate-x-1/2"></div>

              {/* Timed Mode Section */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMode('timed')}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-300 relative min-h-[380px] flex flex-col ${
                  selectedMode === 'timed' 
                    ? 'border-orange-500 bg-orange-50/80 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4 mb-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMode === 'timed' ? 'bg-orange-500' : 'bg-red-100'
                  }`}>
                    <Zap size={24} className={selectedMode === 'timed' ? 'text-white' : 'text-red-600'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Challenge Mode</h3>
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-orange-500 fill-current" />
                        <Star size={16} className="text-orange-500 fill-current" />
                        <span className="text-sm text-gray-600">Advanced</span>
                      </div>
                    </div>
                    
                    {/* Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Timer size={14} className="text-red-500" />
                        <span>Time-based challenges</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Zap size={14} className="text-orange-500" />
                        <span>Bonus points for speed</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Trophy size={14} className="text-yellow-500" />
                        <span>Competitive scoring</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Fixed height container for dynamic content */}
                <div className="h-36 flex items-end">
                  <AnimatePresence mode="wait">
                    {selectedMode === 'timed' && (
                      <motion.div 
                        className="w-full p-3 bg-orange-100/90 backdrop-blur-sm rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-3">
                          <div className="flex items-center gap-2 text-orange-600 font-medium mb-2 text-sm">
                            <Timer size={14} />
                            <span>Choose your time challenge:</span>
                          </div>
                          
                          {/* Timer Options */}
                          <div className="grid grid-cols-2 gap-3">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimerType('per-round');
                              }}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                timerType === 'per-round' 
                                  ? 'border-orange-500 bg-orange-500 text-white' 
                                  : 'border-orange-200 bg-white/90 text-gray-700 hover:border-orange-300'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <div className="text-center">
                                <div className="font-bold text-sm">60s</div>
                                <div className="text-xs opacity-90">per round</div>
                              </div>
                            </motion.button>
                            
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimerType('total-game');
                              }}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                timerType === 'total-game' 
                                  ? 'border-orange-500 bg-orange-500 text-white' 
                                  : 'border-orange-200 bg-white/90 text-gray-700 hover:border-orange-300'
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <div className="text-center">
                                <div className="font-bold text-sm">4min</div>
                                <div className="text-xs opacity-90">total game</div>
                              </div>
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </Card>
        </motion.div>
        
        {/* Start Button Section */}
        <motion.div 
          className="flex justify-center"
          variants={itemVariants}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              onClick={handleStart}
              className={`${
                selectedMode === 'timed' 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                  : 'bg-gradient-to-r from-[#ea384c] to-[#d32f42] hover:from-red-600 hover:to-red-700'
              } transition-all duration-300 flex items-center gap-3 rounded-full px-12 py-4 text-white text-xl font-bold shadow-xl hover:shadow-2xl`}
            >
              {selectedMode === 'timed' ? <Timer size={24} /> : <Play size={24} />}
              {selectedMode === 'timed' 
                ? `Start ${timerType === 'per-round' ? '60s' : '4min'} Challenge` 
                : 'Begin Your Journey'
              }
            </Button>
          </motion.div>
        </motion.div>
        
      </motion.div>

      {/* Leaderboard Modal */}
      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  );
};

export default GameInstructions;