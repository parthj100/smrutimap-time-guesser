import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Play, Home, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TutorialOverlay from '@/components/TutorialOverlay';
import TutorialPracticeRound from '@/components/TutorialPracticeRound';
import GameHeader from '@/components/GameHeader';
import GameImage from '@/components/GameImage';
import MapSelector from '@/components/MapSelector';
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialStep } from '@/types/tutorial';
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { transformDatabaseImageToGameImage } from '@/utils/gameUtils';

// Tutorial steps configuration
const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to SmrutiSnap!',
    description: 'SmrutiSnap is a historical guessing game where you analyze photos to determine when and where they were taken. Let\'s learn how to play!',
    position: 'center',
    showNext: true,
    showSkip: true,
  },
  {
    id: 'game-concept',
    title: 'How It Works',
    description: 'You\'ll see historical photos and need to guess two things: the year it was taken and the location. Look for clues in clothing, architecture, vehicles, and surroundings.',
    position: 'center',
    showNext: true,
    showPrev: true,
    showSkip: true,
  },
  {
    id: 'image-analysis',
    title: 'Analyzing Images',
    description: 'Study the image carefully. Look for time period clues like fashion, technology, architecture styles, and vehicles. These details will help you estimate the era.',
    targetElement: '[data-tutorial="game-image"]',
    position: 'right',
    showNext: true,
    showPrev: true,
    showSkip: true,
    hint: 'Take your time - the more details you notice, the better your guess will be!',
  },
  {
    id: 'year-selection',
    title: 'Selecting the Year',
    description: 'Use the slider to select when you think the photo was taken. You can drag the slider or click to jump to a specific year.',
    targetElement: '[data-tutorial="year-selector"]',
    position: 'top',
    showNext: true,
    showPrev: true,
    showSkip: true,
    hint: 'Start with your best guess, then fine-tune by dragging the slider.',
  },
  {
    id: 'map-interaction',
    title: 'Choosing Location',
    description: 'Click anywhere on the map to place your location guess. Look for geographical clues, architecture styles, and landscape features in the photo.',
    targetElement: '[data-tutorial="map-selector"]',
    position: 'left',
    showNext: true,
    showPrev: true,
    showSkip: true,
    hint: 'Consider the terrain, vegetation, and architectural styles visible in the image.',
  },
  {
    id: 'submit-guess',
    title: 'Submitting Your Guess',
    description: 'Once you\'ve selected both a year and location, click the submit button to see how close you were and earn points!',
    targetElement: '[data-tutorial="submit-button"]',
    position: 'top',
    showNext: true,
    showPrev: true,
    showSkip: true,
  },
  {
    id: 'scoring-system',
    title: 'Understanding Scoring',
    description: 'You earn points based on how close your guesses are. Closer guesses = more points! Don\'t worry about being perfect - learning is the goal.',
    position: 'center',
    showNext: true,
    showPrev: true,
    showSkip: true,
    hint: 'Even experienced players don\'t get it exactly right every time!',
  },
  {
    id: 'practice-ready',
    title: 'Ready to Practice?',
    description: 'Now let\'s try a practice round! You\'ll get guided assistance as you make your first guesses. This is a safe space to learn.',
    position: 'center',
    showNext: true,
    showPrev: true,
    showSkip: false,
  },
];

interface TutorialProps {
  onComplete: () => void;
  onExit: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete, onExit }) => {
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'steps' | 'practice' | 'completion'>('intro');
  const [practiceScore, setPracticeScore] = useState(0);
  const [tutorialImage, setTutorialImage] = useState<any>(null);
  
  const {
    tutorialState,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    exitTutorial,
    startPracticeMode,
    endPracticeMode,
    getCurrentStep,
    isLastStep,
    isFirstStep,
  } = useTutorial(tutorialSteps);

  // Fetch a tutorial image (same as practice round)
  useEffect(() => {
    const fetchTutorialImage = async () => {
      try {
        const { data, error } = await supabase
          .from('game_images')
          .select('*')
          .limit(1)
          .single();

        if (error) throw error;

        // Transform the database response with Google Drive URL conversion
        const transformedImage = transformDatabaseImageToGameImage(data);

        setTutorialImage(transformedImage);
      } catch (error) {
        console.error('Error fetching tutorial image:', error);
        // Fallback image
        setTutorialImage({
          id: 'tutorial-demo',
          image_url: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800&h=600&fit=crop&auto=format&q=85',
          description: 'Historical photo for tutorial demonstration',
          year: 1950,
          location: {
            lat: 37.7749,
            lng: -122.4194,
            name: 'Sample Location',
          },
        });
      }
    };

    if (currentPhase === 'steps') {
      fetchTutorialImage();
    }
  }, [currentPhase]);

  // Handle tutorial completion
  useEffect(() => {
    if (currentPhase === 'completion') {
      const timer = setTimeout(() => {
        completeTutorial();
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, completeTutorial, onComplete]);

  const handleStartTutorial = () => {
    setCurrentPhase('steps');
    startTutorial();
  };

  const handleNextStep = () => {
    if (isLastStep) {
      setCurrentPhase('practice');
      startPracticeMode();
    } else {
      nextStep();
    }
  };

  const handleSkipTutorial = () => {
    skipTutorial();
    onExit();
  };

  const handleExitTutorial = () => {
    exitTutorial();
    onExit();
  };

  const handlePracticeComplete = (score: number) => {
    setPracticeScore(score);
    endPracticeMode();
    setCurrentPhase('completion');
    toast.success('Congratulations! You\'ve completed the tutorial!');
  };

  const handlePracticeSkip = () => {
    endPracticeMode();
    navigate('/');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleStartPlaying = () => {
    onComplete();
  };

  // Intro screen
  if (currentPhase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] flex items-center justify-center p-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo and Title */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-24 h-24 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Learn to Play SmrutiSnap</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Master the art of historical photo analysis with our interactive tutorial
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Step-by-Step Guide</h3>
              <p className="text-sm text-gray-600">Learn each game mechanic with clear explanations</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Practice Round</h3>
              <p className="text-sm text-gray-600">Try a real round with guided assistance</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Ready to Play</h3>
              <p className="text-sm text-gray-600">Jump into the game with confidence</p>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button
              onClick={handleStartTutorial}
              className="bg-[#ea384c] hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Start Tutorial
            </Button>
            
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="px-8 py-3 text-lg font-semibold rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-200"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </motion.div>

          <p className="text-sm text-gray-500 mt-6">
            Tutorial takes about 3-5 minutes • Skip anytime
          </p>
        </motion.div>
      </div>
    );
  }

  // Practice round
  if (currentPhase === 'practice') {
    return (
      <TutorialPracticeRound
        onComplete={handlePracticeComplete}
        onSkip={handlePracticeSkip}
      />
    );
  }

  // Completion screen
  if (currentPhase === 'completion') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] flex items-center justify-center p-6">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Success Animation */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
          >
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trophy className="w-16 h-16 text-white" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Tutorial Complete!</h1>
            <p className="text-xl text-gray-600 mb-6">
              Congratulations! You're now ready to play SmrutiSnap.
            </p>

            {practiceScore > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 inline-block">
                <h3 className="font-semibold text-gray-800 mb-2">Your Practice Score</h3>
                <div className="text-3xl font-bold text-[#ea384c]">{practiceScore} points</div>
                <p className="text-sm text-gray-600 mt-2">
                  {practiceScore > 700 ? 'Excellent work!' : 
                   practiceScore > 400 ? 'Good job!' : 
                   'Great start - you\'ll improve with practice!'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleStartPlaying}
                className="bg-[#ea384c] hover:bg-red-600 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start Playing Now
              </Button>
              
              <Button
                variant="outline"
                onClick={handleGoHome}
                className="px-8 py-3 text-lg font-semibold rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-all duration-200"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Tutorial steps with overlay - using real game components
  if (currentPhase === 'steps') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] overflow-hidden">
        {/* Game Header - Same as actual game */}
        <GameHeader
          isDailyChallenge={false}
          isTimedMode={false}
          timeRemaining={0}
          timerType="per-round"
          timerActive={false}
          currentRound={1}
          totalRounds={1}
          totalGameScore={0}
          onGoHome={handleExitTutorial}
          onTimeUp={() => {}}
        />

        {/* Main Game Content - Exact same layout as actual game */}
        <div className="w-full max-w-full mx-auto h-[calc(100vh-140px)] flex flex-col py-4 px-6">
          <div className="flex gap-8 flex-grow">
            {/* Left Column - Image and Year Selector */}
            <div className="flex-1 relative">
              {/* Real Game Image */}
              <div className="w-full relative" data-tutorial="game-image">
                {tutorialImage ? (
                  <GameImage 
                    imageUrl={tutorialImage.image_url}
                    description={tutorialImage.description}
                    revealDescription={false}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center border-2 border-gray-300 shadow-lg">
                    <div className="text-center text-gray-500">
                      <GraduationCap className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-lg font-medium">Loading Image...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Year selector - exact same as actual game */}
              <div className="mt-4" data-tutorial="year-selector">
                {/* Year display box */}
                <div 
                  className="bg-[#ea384c] text-white py-3 px-6 text-center rounded-xl mb-3 flex items-center justify-center shadow-lg border-2 border-red-600"
                  style={{ height: GAME_CONSTANTS.UI.YEAR_DISPLAY_HEIGHT }}
                  role="status"
                  aria-live="polite"
                  aria-label="Selected year: 1950"
                >
                  <div className="font-bold text-5xl drop-shadow-sm">
                    1950
                  </div>
                </div>
                
                {/* Slider - exact same as actual game */}
                <div className="relative p-4 bg-white/50 rounded-xl shadow-sm border border-gray-200">
                  <input
                    type="range"
                    min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                    max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                    value={1950}
                    disabled={true}
                    className="w-full h-10 appearance-none bg-transparent cursor-pointer transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-200"
                    style={{ 
                      background: `linear-gradient(to right, #ea384c ${((1950 - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100)}%, #ea384c ${((1950 - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100)}%, #ccc ${((1950 - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100)}%)`,
                      height: '12px',
                      borderRadius: '6px',
                    }}
                  />
                  <div className="flex justify-between text-sm text-gray-700 mt-3 font-medium">
                    <span>{GAME_CONSTANTS.YEAR_RANGE.MIN}</span>
                    <span>{GAME_CONSTANTS.YEAR_RANGE.MAX}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Map and Submit Button */}
            <div className="flex-1 flex flex-col">
              {/* Real Map Component */}
              <div 
                className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-300 bg-white mb-6 transition-all duration-200"
                style={{ height: '450px' }}
                data-tutorial="map-selector"
              >
                <MapSelector 
                  onLocationSelected={() => {}} // Disabled for tutorial
                  isDisabled={true}
                />
              </div>

              {/* Submit Button */}
              <div className="flex-shrink-0" data-tutorial="submit-button">
                <div 
                  className="w-full py-4 px-6 rounded-xl font-bold text-2xl transition-all duration-300 flex items-center justify-center shadow-lg border-2 transform bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 shadow-sm"
                  style={{ height: '80px' }}
                >
                  <span className="drop-shadow-sm">Submit Your Guess</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tutorial Overlay - Now fixed at bottom */}
        <TutorialOverlay
          step={getCurrentStep()}
          isVisible={tutorialState.isActive}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onNext={handleNextStep}
          onPrev={prevStep}
          onSkip={handleSkipTutorial}
          onExit={handleExitTutorial}
          currentStepNumber={tutorialState.currentStep}
          totalSteps={tutorialState.totalSteps}
        />
      </div>
    );
  }

  return null;
};

export default Tutorial; 