import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyChallengeImages } from '@/utils/dailyChallenge';
import { resetImagePool } from '@/utils/imagePool';
import { GameImage, GuessResult } from '@/types/game';
import GameSummary from './GameSummary';
import GameInstructions from './GameInstructions';
import RoundResults from './RoundResults';
import { Home } from './Home';
import SettingsPanel from './SettingsPanel';
import GameHeader from './GameHeader';
import GameContent from './GameContent';
import GameControls from './GameControls';
import InfiniteImageBackground from './InfiniteImageBackground';
import MultiplayerGame from './multiplayer/MultiplayerGame';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home as HomeIcon, ArrowRight } from 'lucide-react';
import { toast } from "sonner";
import { useGameState } from '@/hooks/useGameState';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameScoring } from '@/hooks/useGameScoring';
import { useGameImages } from '@/hooks/useGameImages';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useAuth } from '@/hooks/useAuth';
import { useGameSession } from '@/hooks/useGameSession';
import GameStoryGallery from './GameStoryGallery';
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import NetworkStatus from '@/components/NetworkStatus';

type GameMode = 'home' | 'instructions' | 'playing' | 'daily' | 'multiplayer';

const Game: React.FC = () => {
  // Performance monitoring
  const { metrics, trackImageLoad } = usePerformanceMonitor('Game');

  // Navigation
  const navigate = useNavigate();

  // Authentication and session tracking
  const { user, profile } = useAuth();
  const { currentSession, startGameSession, saveRoundResult, completeGameSession } = useGameSession({
    onProfileUpdate: async (userId: string) => {
      // Profile will be updated automatically by the auth system
      console.log('Profile update requested for:', userId);
    }
  });

  const [gameStartCounter, setGameStartCounter] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('home');
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [isCompletingGame, setIsCompletingGame] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState<{
    isTimedMode: boolean;
    timerType: 'per-round' | 'total-game';
    isDaily: boolean;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [gameOverView, setGameOverView] = useState<'story' | 'detailed'>('story');
  const [isMobile, setIsMobile] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Custom hooks
  const {
    gameState,
    yearGuess,
    setYearGuess,
    locationGuess,
    setLocationGuess,
    totalGameScore,
    initializeGame,
    addResult,
    nextRound,
    resetGame,
    updateTimer
  } = useGameState();

  const { calculateAndCreateResult } = useGameScoring();

  const {
    gameImages,
    isLoading,
    error,
    refetch,
    isError,
    isSuccess,
    invalidateQuery
  } = useGameImages(gameStartCounter, isDailyChallenge, gameMode, user?.id);

  // Timer hook
  useGameTimer({
    timeRemaining: gameState.timeRemaining,
    timerActive: gameState.timerActive,
    isGuessing: gameState.isGuessing,
    hasGuessed: gameState.hasGuessed,
    timerType: gameState.timerType,
    onTimeUpdate: (newTime: number) => updateTimer(newTime, true),
    onTimeUp: handleTimeUp
  });

  // Effect to start game when data is ready
  useEffect(() => {
    if (pendingGameStart && isSuccess && gameImages && gameImages.length > 0) {
      console.log('🚀 Data is ready, starting game now with images:', gameImages);
      const { isTimedMode, timerType, isDaily } = pendingGameStart;
      initializeGame(gameImages, isTimedMode, timerType);
      setGameMode('playing');
      setPendingGameStart(null);
      console.log('✅ Game started successfully');

      // Start game session if user is logged in (profile is optional)
      if (user) {
        const gameMode = isDaily ? 'daily' : (isTimedMode ? 'timed' : 'random');
        console.log('👤 User is logged in, starting game session...');
        startGameSession(user.id, gameMode, gameImages.length).then(({ data, error }) => {
          if (error) {
            console.error('❌ Failed to start game session:', error);
          } else {
            console.log('✅ Game session started:', data);
          }
        });
      } else {
        console.log('👤 No user logged in, playing as guest');
      }

      // Track image loading performance for current image
      if (gameImages[0]) {
        trackImageLoad(gameImages[0].image_url).catch(() => {
          // Image failed to load - already handled by trackImageLoad
        });
      }
    }
  }, [pendingGameStart, isSuccess, gameImages, initializeGame, trackImageLoad, user, startGameSession]);

  // Handle timer expiration
  function handleTimeUp() {
    if (gameState.isGuessing && !gameState.hasGuessed) {
      toast.warning("Time's up! Auto-submitting your guess...");
      handleAutoSubmit();
    } else if (gameState.timerType === 'total-game') {
      // End game when total time is up
      resetGame();
    }
  }

  // Auto-submit when timer expires
  const handleAutoSubmit = () => {
    if (!gameState.currentImage) return;
    const finalYearGuess = yearGuess || Math.floor((1900 + 2025) / 2);
    const finalLocationGuess = locationGuess || { lat: 40, lng: 0 };
    submitGuessWithScores(finalYearGuess, finalLocationGuess, true);
    if (!locationGuess) {
      setLocationGuess(finalLocationGuess);
    }
  };

  // Submit guess function
  const submitGuessWithScores = (
    finalYearGuess: number, 
    finalLocationGuess: { lat: number; lng: number }, 
    isAutoSubmit: boolean = false
  ) => {
    if (!gameState.currentImage) return;

    const result = calculateAndCreateResult(
      gameState.currentImage,
      finalYearGuess,
      finalLocationGuess,
      gameState.timeRemaining,
      gameState.isTimedMode,
      gameState.timerType,
      gameState.roundStartTime,
      isAutoSubmit
    );

    addResult(result);

    // Save round result if user is logged in and session exists
    if (user && currentSession && gameState.currentImage) {
      saveRoundResult(
        currentSession.id,
        user.id,
        gameState.currentRound,
        result,
        gameState.currentImage.id,
        gameState.currentImage.year,
        {
          lat: gameState.currentImage.location.lat,
          lng: gameState.currentImage.location.lng
        }
      ).then(({ error }) => {
        if (error) {
          console.error('Failed to save round result:', error);
        } else {
          console.log('✅ Round result saved');
        }
      });
    }
  };

  // Game flow handlers
  const handlePlayClick = () => {
    console.log('🎮 Play button clicked, setting mode to instructions');
    setGameMode('instructions');
    setIsDailyChallenge(false);
  };

  const handleDailyChallengeClick = () => {
    console.log('📅 Daily challenge button clicked');
    setIsDailyChallenge(true);
    // Start daily challenge directly as normal mode (no time restrictions)
    startGame(false, 'per-round', true);
  };

  const handleTutorialClick = () => {
    console.log('🎓 Tutorial button clicked, navigating to tutorial');
    navigate('/tutorial');
  };

  const handleMultiplayerClick = () => {
    console.log('👥 Multiplayer button clicked, setting mode to multiplayer');
    // TEMPORARILY DISABLED - Multiplayer functionality hidden from UI
    // setGameMode('multiplayer');
  };

  const handleBackFromMultiplayer = () => {
    console.log('🏠 Back from multiplayer, returning to home');
    setGameMode('home');
  };

  const startGame = (isTimedMode: boolean, timerType: 'per-round' | 'total-game', isDaily: boolean = false) => {
    console.log('🚀 Starting game with params:', { isTimedMode, timerType, isDaily });
    
    if (!isDaily) {
      invalidateQuery();
      setGameStartCounter(prev => prev + 1);
    }

    setPendingGameStart({ isTimedMode, timerType, isDaily });
    setGameMode('playing');
  };

  const handleResetPool = async () => {
    try {
      await resetImagePool(user?.id);
      toast.success("Image pool reset! You'll see fresh images.");
      if (gameMode === 'playing') {
        refetch();
      }
    } catch (error) {
      toast.error("Failed to reset image pool");
    }
  };

  const handleRetryDataLoad = () => {
    console.log('🔄 Manual retry triggered');
    toast.info("Retrying to load game data...");
    refetch();
  };

  const handleExitToMenu = () => {
    setGameMode('home');
    setIsDailyChallenge(false);
    setPendingGameStart(null);
    resetGame();
  };

  const handleGoHome = () => {
    if (gameState.currentRound > 0) {
      toast.info("Game abandoned. Returning to home page.");
    }
    handleExitToMenu();
  };

  const handleCompleteGameAndGoHome = async () => {
    // Prevent duplicate completion calls
    if (isCompletingGame) {
      console.log('⏸️ Game completion already in progress, skipping...');
      return;
    }

    // If game is complete and we have results, ensure session is completed
    if (gameState.gameOver && user && currentSession && gameState.results.length > 0) {
      setIsCompletingGame(true);
      console.log('🏁 Completing game session before going home...');
      
      const totalScore = gameState.results.reduce((sum, result) => {
        // Use the same scoring logic as GameSummary
        if (result.scaledScore !== undefined) {
          return sum + result.scaledScore;
        }
        if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
          const baseScore = result.displayYearScore + result.displayLocationScore;
          const timeBonus = result.timeBonus || 0;
          return sum + baseScore + timeBonus;
        }
        return sum + (result.totalScore * 100) + (result.timeBonus || 0);
      }, 0);

      const totalTime = gameState.results.reduce((sum, result) => sum + (result.timeUsed || 0), 0);

      try {
        const { error } = await completeGameSession(
          currentSession.id,
          totalScore,
          gameState.results.length,
          totalTime
        );

        if (error) {
          console.error('Failed to complete game session:', error);
          toast.error('Failed to save game results');
        } else {
          console.log('✅ Game session completed successfully');
          toast.success(`Game completed! Score: ${Math.round(totalScore)} points saved.`);
        }
      } catch (error) {
        console.error('Error completing game session:', error);
        toast.error('Failed to save game results');
      } finally {
        setIsCompletingGame(false);
      }
    }
    
    // Now navigate home
    console.log('🏠 Navigating to home after game completion');
    handleExitToMenu();
    setGameOverView('story');
  };

  const handleYearSelected = (year: number) => {
    setYearGuess(year);
  };

  const handleLocationSelected = (lat: number, lng: number) => {
    setLocationGuess({ lat, lng });
  };

  const handleSubmitGuess = () => {
    if (!gameState.currentImage) return;
    if (!locationGuess) {
      toast.error("Please select a location on the map before submitting your guess!");
      return;
    }
    const finalYearGuess = yearGuess || Math.floor((1900 + 2025) / 2);
    submitGuessWithScores(finalYearGuess, locationGuess);
  };

  const handleNextRound = () => {
    setIsTransitioning(true);
    
    // Brief delay for fade out effect
    setTimeout(() => {
    nextRound(gameImages);
    
    // Track next image loading performance
    const nextImageIndex = gameState.currentRound;
    if (gameImages && gameImages[nextImageIndex]) {
      trackImageLoad(gameImages[nextImageIndex].image_url).catch(() => {
        // Image failed to load - already handled by trackImageLoad
      });
    }
      
      // End transition after fade in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 200);
  };

  const handlePlayAgain = () => {
    setGameMode('home');
    setIsDailyChallenge(false);
    setPendingGameStart(null);
    setGameOverView('story');
  };

  const handleViewDetailedBreakdown = () => {
    setGameOverView('detailed');
  };

  // Show carousel on home and instructions pages
  const showCarousel = gameMode === 'home' || gameMode === 'instructions';

  // Handle tutorial navigation
  const handleTutorialNext = () => {
    setTutorialStep(prev => prev ? prev + 1 : 1);
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
  };

  // Handle results modal
  const handleCloseResults = () => {
    setShowResults(false);
  };

  // Handle results modal
  const handleFinishGame = () => {
    setShowResults(false);
    handleCompleteGameAndGoHome();
  };

  // Render loading state
  if (isLoading || pendingGameStart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">
            {pendingGameStart ? 'Starting game...' : 'Loading images...'}
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (isError || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center p-4">
        <div className="text-center text-white max-w-md">
          <h2 className="text-2xl font-bold mb-4">Unable to Load Game</h2>
          <p className="mb-6">We're having trouble loading the game images. Please try again.</p>
          <div className="space-y-3">
            <Button 
              onClick={handleRetryDataLoad}
              className="bg-white text-red-800 hover:bg-red-50 w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading
            </Button>
            <Button 
              onClick={handleGoHome}
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-red-800 w-full"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] overflow-hidden">
      {/* Single persistent carousel for home and instructions modes */}
      {showCarousel && <InfiniteImageBackground />}

      {/* Show home screen */}
      {gameMode === 'home' && (
        <Home 
          onPlayClick={handlePlayClick} 
          onDailyChallengeClick={handleDailyChallengeClick}
          onTutorialClick={handleTutorialClick}
          onMultiplayerClick={handleMultiplayerClick}
        />
      )}

      {/* Show multiplayer */}
      {/* TEMPORARILY HIDDEN - Multiplayer functionality kept in codebase but removed from UI
      {gameMode === 'multiplayer' && (
        <MultiplayerGame onBack={handleBackFromMultiplayer} />
      )}
      */}

      {/* Show instructions */}
      {gameMode === 'instructions' && (
        <GameInstructions 
          onStart={startGame}
          onGoBack={() => setGameMode('home')}
        />
      )}

      {/* Game over screens - Story Gallery first, then Detailed Breakdown */}
      {gameState.gameOver && gameOverView === 'story' && (
        <GameStoryGallery
          results={gameState.results}
          onViewDetailedBreakdown={handleViewDetailedBreakdown}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleCompleteGameAndGoHome}
          isTimedMode={gameState.isTimedMode}
        />
      )}

      {gameState.gameOver && gameOverView === 'detailed' && (
        <GameSummary 
          results={gameState.results} 
          onPlayAgain={handlePlayAgain} 
          onGoHome={handleCompleteGameAndGoHome}
          isTimedMode={gameState.isTimedMode} 
        />
      )}

      {/* Current result after guessing */}
      {(() => {
        const currentResult = gameState.hasGuessed && gameState.currentImage ? 
          gameState.results.find(r => r.imageId === gameState.currentImage.id) : null;

        // Show round results screen after guessing
        if (gameState.hasGuessed && gameState.currentImage && currentResult) {
          return (
            <AnimatePresence mode="wait">
            <RoundResults 
                key={`result-${gameState.currentRound}-${currentResult.imageId}`}
              result={currentResult}
              onNext={handleNextRound}
              onGoHome={handleGoHome}
              isLastRound={gameState.currentRound === gameState.totalRounds}
              roundNumber={gameState.currentRound}
              totalRounds={gameState.totalRounds}
              imageDescription={gameState.currentImage.description}
            />
            </AnimatePresence>
          );
        }

        return null;
      })()}

      {/* Loading state while game initializes */}
      {gameMode === 'playing' && !gameState.currentImage && (
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-[#ea384c] mb-4">SMRUTIMAP</div>
            <div className="text-xl">Starting game...</div>
          </div>
        </div>
      )}

      {/* Main game UI */}
      {gameMode === 'playing' && gameState.currentImage && !gameState.gameOver && !gameState.hasGuessed && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`round-${gameState.currentRound}-${gameState.currentImage?.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isTransitioning ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-full mx-auto h-screen flex flex-col py-4 px-6"
          >
          <GameHeader
            isDailyChallenge={isDailyChallenge}
            isTimedMode={gameState.isTimedMode}
            timeRemaining={gameState.timeRemaining}
            timerType={gameState.timerType}
            timerActive={gameState.timerActive}
            currentRound={gameState.currentRound}
            totalRounds={gameState.totalRounds}
            totalGameScore={totalGameScore}
            onGoHome={handleGoHome}
            onTimeUp={handleTimeUp}
          />
          
          <GameContent
            currentImage={gameState.currentImage}
            hasGuessed={gameState.hasGuessed}
            yearGuess={yearGuess}
            locationGuess={locationGuess}
            onYearSelected={handleYearSelected}
            onLocationSelected={handleLocationSelected}
            onSubmitGuess={handleSubmitGuess}
            onNextRound={handleNextRound}
            showResults={false}
            gameState={{
              currentRound: gameState.currentRound,
              timeRemaining: gameState.timeRemaining
            }}
            onGameEnd={handleCompleteGameAndGoHome}
          />
          
          <GameControls
            hasGuessed={gameState.hasGuessed}
            locationGuess={locationGuess}
            currentImage={gameState.currentImage}
            currentResult={gameState.hasGuessed && gameState.currentImage ? 
              gameState.results.find(r => r.imageId === gameState.currentImage.id) : null}
            currentRound={gameState.currentRound}
            totalRounds={gameState.totalRounds}
            isTimedMode={gameState.isTimedMode}
            onSubmitGuess={handleSubmitGuess}
            onNextRound={handleNextRound}
          />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Mobile: Fixed Bottom Submit Button - Only for active game */}
      {gameMode === 'playing' && gameState.currentImage && !gameState.gameOver && !gameState.hasGuessed && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 p-4 safe-area-pb sm:hidden"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
          <Button
            onClick={handleSubmitGuess}
            disabled={!locationGuess}
            className="w-full bg-[#ea384c] hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg min-h-[56px]"
            >
              <motion.span
                animate={locationGuess ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Submit Guess
              </motion.span>
          </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Network Status Indicator */}
      <NetworkStatus />
    </div>
  );
};

export default Game;
