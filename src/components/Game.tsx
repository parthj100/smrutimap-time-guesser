import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyChallengeImages, hasUserPlayedDailyChallengeToday, getIncompleteDailyChallengeSession } from '@/utils/dailyChallenge';
import { resetImagePool } from '@/utils/imagePool';
import { GameImage, GuessResult, GameSession } from '@/types/game';
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
import Tutorial from '@/components/Tutorial';

type GameMode = 'home' | 'instructions' | 'playing' | 'daily' | 'multiplayer' | 'tutorial' | 'simple_multiplayer' | 'multiplayer_game';

interface GameProps {
  // Multiplayer coordination props
  multiplayerMode?: boolean;
  multiplayerState?: {
    roomCode: string;
    currentRound: number;
    totalRounds: number;
    playersReady: number;
    totalPlayers: number;
    waitingForPlayers: boolean;
    gameStarted: boolean;
    imageSequence?: string[];
    getMultiplayerImages?: () => Promise<any[]>;
    timePerRound?: number;
    isHost?: boolean;
    getLeaderboard?: () => any[];
    getRoundLeaderboard?: (roundNumber: number) => any[];
    currentUserId?: string;
    gameStatus?: 'waiting' | 'playing' | 'finished';
    playerNames?: Record<string, string>;
  };
  onMultiplayerGuessSubmit?: (yearGuess: number, locationGuess: { lat: number; lng: number }, timeUsed: number) => Promise<void>;
  onMultiplayerNextRound?: () => Promise<void>;
  onMultiplayerExit?: () => void;
}

const Game: React.FC<GameProps> = ({ 
  multiplayerMode = false, 
  multiplayerState, 
  onMultiplayerGuessSubmit,
  onMultiplayerNextRound,
  onMultiplayerExit 
}) => {
  // Performance monitoring
  const { metrics, trackImageLoad } = usePerformanceMonitor('Game');

  // Navigation
  const navigate = useNavigate();

  // Authentication and session tracking - skip initialization in multiplayer mode
  const { user, profile } = useAuth({ skipInitialization: multiplayerMode });
  const { currentSession, setCurrentSession, startGameSession, saveRoundResult, completeGameSession } = useGameSession({
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
  const [gameOverView, setGameOverView] = useState<'story' | 'detailed' | 'leaderboard'>('story');
  const [isMobile, setIsMobile] = useState(false);

  const [showResults, setShowResults] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasPlayedDailyToday, setHasPlayedDailyToday] = useState(false);
  const [resumingSession, setResumingSession] = useState<GameSession | null>(null);

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

  // Effect to check daily challenge status when user changes
  useEffect(() => {
    const checkDailyChallengeStatus = async () => {
      if (user && !multiplayerMode) {
        try {
          const hasPlayed = await hasUserPlayedDailyChallengeToday(user.id);
          setHasPlayedDailyToday(hasPlayed);
        } catch (error) {
          console.error('Error checking daily challenge status:', error);
          setHasPlayedDailyToday(false);
        }
      } else {
        setHasPlayedDailyToday(false);
      }
    };

    checkDailyChallengeStatus();

    // Set up periodic check for daily challenge reset (every 5 minutes)
    const intervalId = setInterval(checkDailyChallengeStatus, 5 * 60 * 1000);

    // Also check when the page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDailyChallengeStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, multiplayerMode]);

  // Effect to start game when data is ready
  useEffect(() => {
    if (pendingGameStart && isSuccess && gameImages && gameImages.length > 0) {
      console.log('🚀 Data is ready, starting game now with images:', gameImages);
      const { isTimedMode, timerType, isDaily } = pendingGameStart;
      
      // Check if we're resuming a session
      if (resumingSession && isDaily) {
        console.log('🔄 Resuming from incomplete session:', {
          sessionId: resumingSession.id,
          roundsCompleted: resumingSession.rounds_completed,
          nextRound: resumingSession.rounds_completed + 1
        });
        
        // Initialize game starting from the next round
        const startFromRound = resumingSession.rounds_completed + 1;
        initializeGame(gameImages, isTimedMode, timerType, undefined, startFromRound);
        
        // Clear the resuming session state
        setResumingSession(null);
      } else {
        // Start fresh game
        initializeGame(gameImages, isTimedMode, timerType);
      }
      
      setGameMode('playing');
      setPendingGameStart(null);
      console.log('✅ Game started successfully');

      // Start game session if user is logged in and NOT in multiplayer mode
      // Note: We don't start a new session if we're resuming an existing one
      if (user && !multiplayerMode && !resumingSession) {
        const gameMode = isDaily ? 'daily' : (isTimedMode ? 'timed' : 'random');
        console.log('👤 User is logged in, starting game session...');
        startGameSession(user.id, gameMode, gameImages.length).then(({ data, error }) => {
          if (error) {
            console.error('❌ Failed to start game session:', error);
          } else {
            console.log('✅ Game session started:', data);
          }
        });
      } else if (resumingSession) {
        console.log('🔄 Using existing session for resume:', resumingSession.id);
      } else if (multiplayerMode) {
        console.log('🎮 Multiplayer mode - skipping individual game session creation');
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
  }, [pendingGameStart, isSuccess, gameImages, initializeGame, trackImageLoad, user, startGameSession, resumingSession]);

  // Effect to automatically start multiplayer games
  useEffect(() => {
    if (multiplayerMode && multiplayerState?.gameStarted && gameMode === 'home') {
      console.log('🎮 Multiplayer mode detected, starting game automatically...');
      
      // For multiplayer, we need to fetch the predefined images and start the game directly
      if (multiplayerState.getMultiplayerImages) {
        console.log('🎮 Fetching multiplayer images...');
        multiplayerState.getMultiplayerImages().then((images) => {
          if (images && images.length > 0) {
            console.log('🎮 Multiplayer images fetched, initializing game:', images);
            console.log('⏱️ Using custom timer duration:', multiplayerState.timePerRound);
            
            // Initialize the game directly with the multiplayer images and custom timer
            const timePerRound = multiplayerState.timePerRound || 60; // Default to 60 seconds
            initializeGame(images, timePerRound > 0, 'per-round', timePerRound);
            setGameMode('playing');
          } else {
            console.error('❌ Failed to fetch multiplayer images');
          }
        }).catch((error) => {
          console.error('❌ Error fetching multiplayer images:', error);
        });
      } else {
        // Fallback: start the game with standard settings for multiplayer
        startGame(true, 'per-round', false);
      }
    }
  }, [multiplayerMode, multiplayerState?.gameStarted, multiplayerState?.getMultiplayerImages, multiplayerState?.timePerRound, gameMode, initializeGame]);

  // Sync local game state with multiplayer round changes
  useEffect(() => {
    if (multiplayerMode && multiplayerState?.currentRound && gameState.currentRound) {
      const multiplayerRound = multiplayerState.currentRound;
      
      // If multiplayer round has advanced beyond local round, sync up
      if (multiplayerRound !== gameState.currentRound) {
        console.log('🔄 Syncing local game state with multiplayer round change:', {
          multiplayerRound,
          localRound: gameState.currentRound,
          action: 'sync_round'
        });
        
        // Reset guesses for the new round
        setYearGuess(null);
        setLocationGuess(null);
        
        // Use the local nextRound function to advance to match multiplayer state
        if (multiplayerState.getMultiplayerImages) {
          multiplayerState.getMultiplayerImages().then((images) => {
            if (images && images.length > 0) {
              // Force the local game state to the correct round
              const targetImage = images[multiplayerRound - 1]; // rounds are 1-indexed
              if (targetImage) {
                console.log('🎮 Setting current image for round', multiplayerRound, ':', targetImage.id);
                // Manually advance local state to match multiplayer round
                nextRound(images);
              }
            }
          });
        }
      }
    }
  }, [multiplayerMode, multiplayerState?.currentRound, gameState.currentRound, gameMode, multiplayerState?.getMultiplayerImages, nextRound, setYearGuess, setLocationGuess]);



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
  const handleAutoSubmit = async () => {
    if (!gameState.currentImage) return;
    const finalYearGuess = yearGuess || Math.floor((1900 + 2025) / 2);
    const finalLocationGuess = locationGuess || { lat: 40, lng: 0 };
    await submitGuessWithScores(finalYearGuess, finalLocationGuess, true);
    if (!locationGuess) {
      setLocationGuess(finalLocationGuess);
    }
  };

  // Submit guess function
  const submitGuessWithScores = async (
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

    // Handle multiplayer guess submission
    if (multiplayerMode && onMultiplayerGuessSubmit) {
      const timeUsed = gameState.isTimedMode ? 
        (gameState.timerType === 'per-round' ? 
          (gameState.timeRemaining ? 60 - gameState.timeRemaining : 60) : 
          (gameState.timeRemaining ? 300 - gameState.timeRemaining : 300)
        ) : 0;
      
      await onMultiplayerGuessSubmit(finalYearGuess, finalLocationGuess, timeUsed);
    }

    // Save round result if user is logged in and session exists and NOT in multiplayer mode
    if (user && currentSession && gameState.currentImage && !multiplayerMode) {
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
    } else if (multiplayerMode) {
      console.log('🎮 Multiplayer mode - skipping individual round result save');
    }
  };

  // Game flow handlers
  const handlePlayClick = () => {
    console.log('🎮 Play button clicked, setting mode to instructions');
    setGameMode('instructions');
    setIsDailyChallenge(false);
  };

  const handleDailyChallengeClick = async () => {
    console.log('📅 Daily challenge button clicked');
    
    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to play the daily challenge');
      return;
    }
    
    // Check if user has already played today
    try {
      const hasPlayed = await hasUserPlayedDailyChallengeToday(user.id);
      
      if (hasPlayed) {
        toast.error('You have already played the daily challenge today. Come back tomorrow at midnight Eastern Time!');
        return;
      }
      
      // Check if user has an incomplete daily challenge session to resume
      const incompleteSession = await getIncompleteDailyChallengeSession(user.id);
      
      if (incompleteSession) {
        console.log('🔄 Resuming incomplete daily challenge session:', {
          sessionId: incompleteSession.id,
          roundsCompleted: incompleteSession.rounds_completed,
          totalScore: incompleteSession.total_score
        });
        
        // Set the current session to the incomplete one
        setCurrentSession(incompleteSession);
        setResumingSession(incompleteSession);
        
        // Show a toast to inform the user they're resuming
        toast.info(`Resuming daily challenge from round ${incompleteSession.rounds_completed + 1} of 5`);
        
        // Start the daily challenge with the existing session
        setIsDailyChallenge(true);
        startGame(false, 'per-round', true);
      } else {
        // User hasn't played today, start fresh daily challenge
        console.log('🆕 Starting fresh daily challenge');
        setIsDailyChallenge(true);
        startGame(false, 'per-round', true);
      }
      
    } catch (error) {
      console.error('Error checking daily challenge status:', error);
      toast.error('Unable to check daily challenge status. Please try again.');
    }
  };

  const handleRefreshDailyChallenge = async () => {
    console.log('🔄 Refreshing daily challenge status...');
    
    if (!user) {
      toast.error('Please log in to check daily challenge status');
      return;
    }
    
    try {
      const hasPlayed = await hasUserPlayedDailyChallengeToday(user.id);
      setHasPlayedDailyToday(hasPlayed);
      
      if (!hasPlayed) {
        toast.success('Daily challenge is now available!');
      } else {
        toast.info('Daily challenge is still completed for today. Check back at midnight Eastern Time!');
      }
    } catch (error) {
      console.error('Error refreshing daily challenge status:', error);
      toast.error('Unable to refresh daily challenge status. Please try again.');
    }
  };

  const handleTutorialClick = () => {
    console.log('🎓 Tutorial button clicked, showing tutorial');
    setGameMode('tutorial');
  };

  const handleTutorialComplete = () => {
    console.log('🎓 Tutorial completed, returning to home');
    setGameMode('home');
    toast.success('Tutorial completed! Ready to play?');
  };

  const handleTutorialExit = () => {
    console.log('🎓 Tutorial exited, returning to home');
    setGameMode('home');
  };

  const handleMultiplayerClick = () => {
    setGameMode('simple_multiplayer');
  };

  const handleBackFromMultiplayer = () => {
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
    console.log('🗺️ Location selected:', { lat, lng });
    setLocationGuess({ lat, lng });
  };

  const handleSubmitGuess = async () => {
    console.log('🎯 Game.tsx handleSubmitGuess called:', {
      hasCurrentImage: !!gameState.currentImage,
      hasLocationGuess: !!locationGuess,
      locationGuess,
      yearGuess,
      multiplayerMode
    });
    
    if (!gameState.currentImage) {
      console.log('❌ No current image, returning');
      return;
    }
    if (!locationGuess) {
      console.log('❌ No location guess, showing error');
      toast.error("Please select a location on the map before submitting your guess!");
      return;
    }
    const finalYearGuess = yearGuess || Math.floor((1900 + 2025) / 2);
    console.log('✅ Submitting guess:', { finalYearGuess, locationGuess });
    await submitGuessWithScores(finalYearGuess, locationGuess);
  };

  const handleNextRound = async () => {
    if (multiplayerMode && onMultiplayerNextRound) {
      // In multiplayer mode, use the multiplayer nextRound function
      console.log('🎮 Host advancing to next round in multiplayer mode...');
      try {
        await onMultiplayerNextRound();
        console.log('✅ Multiplayer next round completed');
      } catch (error) {
        console.error('❌ Error in multiplayer next round:', error);
      }
    } else {
      // In single-player mode, use local game state
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
    }
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
          hasPlayedDailyToday={hasPlayedDailyToday}
          onRefreshDailyChallenge={handleRefreshDailyChallenge}
        />
      )}

      {/* Show tutorial */}
      {gameMode === 'tutorial' && (
        <Tutorial
          onComplete={handleTutorialComplete}
          onExit={handleTutorialExit}
          skipIntro={true}
        />
      )}

      {/* Show multiplayer */}
      {gameMode === 'simple_multiplayer' && (
        <MultiplayerGame 
          onBack={handleBackFromMultiplayer} 
          onHome={() => setGameMode('home')}
        />
      )}

      {/* Show instructions */}
      {gameMode === 'instructions' && (
        <GameInstructions 
          onStart={startGame}
          onGoBack={() => setGameMode('home')}
        />
      )}

      {/* Game over screens - Story Gallery first, then Detailed Breakdown */}
      {/* Show game over screens for single player or when multiplayer game is finished */}
      {/* Single player game over screens */}
      {!multiplayerMode && gameState.gameOver && gameOverView === 'story' && (
        <GameStoryGallery
          results={gameState.results}
          onViewDetailedBreakdown={handleViewDetailedBreakdown}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleCompleteGameAndGoHome}
          isTimedMode={gameState.isTimedMode}
        />
      )}

      {!multiplayerMode && gameState.gameOver && gameOverView === 'detailed' && (
        <GameSummary 
          results={gameState.results} 
          onPlayAgain={handlePlayAgain} 
          onGoHome={handleCompleteGameAndGoHome}
          isTimedMode={gameState.isTimedMode} 
        />
      )}
      
      {/* Multiplayer Game Story Gallery */}
      {multiplayerMode && multiplayerState && gameOverView === 'story' && multiplayerState.gameStatus === 'finished' && (
        <GameStoryGallery
          results={gameState.results}
          onViewDetailedBreakdown={() => setGameOverView('detailed')}
          onPlayAgain={() => setGameOverView('leaderboard')} // Go to leaderboard
          onGoHome={onMultiplayerExit || (() => {})}
          isTimedMode={gameState.isTimedMode}
          multiplayerMode={true}
        />
      )}

      {/* Multiplayer Detailed Breakdown */}
      {multiplayerMode && multiplayerState && gameOverView === 'detailed' && multiplayerState.gameStatus === 'finished' && (
        <GameSummary 
          results={gameState.results} 
          onPlayAgain={() => setGameOverView('leaderboard')} // Go to leaderboard
          onGoHome={onMultiplayerExit || (() => {})}
          isTimedMode={gameState.isTimedMode} 
          multiplayerMode={true}
        />
      )}
      
      {/* Multiplayer final leaderboard */}
      {multiplayerMode && multiplayerState && gameOverView === 'leaderboard' && multiplayerState.gameStatus === 'finished' && (
        <div className="w-full min-h-screen bg-[#eee9da] p-3 lg:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <button 
              onClick={onMultiplayerExit || (() => {})}
              className="hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ea384c] focus:ring-opacity-50 rounded-lg"
              aria-label="Go to home page"
            >
              <img 
                src="/Smruti-map.png" 
                alt="SMRUTIMAP Logo"
                className="h-20 lg:h-28 xl:h-32 w-auto cursor-pointer" 
              />
            </button>
            
            <div className="text-center flex-1 mx-6 lg:mx-12">
              <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 mb-3 lg:mb-4 font-manrope">
                🏆 Final Results
              </h1>
              <div className="text-sm lg:text-base text-gray-600 mt-2 font-medium font-poppins">
                Game Complete! Congratulations to all players!
              </div>
            </div>

            <Button 
              onClick={onMultiplayerExit || (() => {})}
              className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 lg:px-8 xl:px-10 py-3 lg:py-4 xl:py-5 rounded-xl text-base lg:text-lg xl:text-xl font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl font-poppins"
            >
              Back to Menu
            </Button>
          </div>

          {/* Final Leaderboard */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-lg border border-[#ea384c]/30">
              <div className="space-y-4">
                {(() => {
                  // Create leaderboard using proper scoring calculation
                  const playerScores = [];
                  
                  // Add current player's score from local game results
                  const currentPlayerTotal = gameState.results.reduce((sum, result) => {
                    if (result.scaledScore !== undefined) {
                      return sum + result.scaledScore;
                    }
                    if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
                      return sum + result.displayYearScore + result.displayLocationScore + (result.timeBonus || 0);
                    }
                    return sum + (result.totalScore * 100) + (result.timeBonus || 0);
                  }, 0);
                  
                  // Get current user's display name
                  const currentUserDisplayName = multiplayerState.playerNames?.[multiplayerState.currentUserId || ''];
                  const currentUserLabel = currentUserDisplayName ? `You (${currentUserDisplayName})` : 'You';
                  
                  playerScores.push({
                    userId: multiplayerState.currentUserId || 'current',
                    totalPoints: Math.round(currentPlayerTotal),
                    isCurrentUser: true,
                    playerName: currentUserLabel
                  });
                  
                  // Add other players' scores from multiplayer database (now using correct display scores)
                  const multiplayerLeaderboard = multiplayerState.getLeaderboard?.() || [];
                  multiplayerLeaderboard.forEach((entry) => {
                    if (entry.userId !== multiplayerState.currentUserId) {
                      // Database now stores display scores directly, no scaling needed
                      const totalPoints = entry.totalPoints;
                      // Get display name from player names map
                      const displayName = multiplayerState.playerNames?.[entry.userId] || `Player ${playerScores.length}`;
                      
                      playerScores.push({
                        userId: entry.userId,
                        totalPoints: totalPoints,
                        isCurrentUser: false,
                        playerName: displayName
                      });
                    }
                  });
                  
                  // Sort by total points
                  playerScores.sort((a, b) => b.totalPoints - a.totalPoints);
                  
                  const getRankIcon = (rank: number) => {
                    switch (rank) {
                      case 1: return '🥇';
                      case 2: return '🥈';
                      case 3: return '🥉';
                      default: return `#${rank}`;
                    }
                  };
                  
                  return playerScores.map((player, index) => (
                    <div 
                      key={player.userId}
                      className={`p-4 lg:p-6 rounded-xl border-2 ${
                        player.isCurrentUser ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-gray-50 border-gray-200'
                      } ${index === 0 ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''} transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl lg:text-4xl">{getRankIcon(index + 1)}</span>
                          <div>
                                                       <div className="text-xl lg:text-2xl font-bold text-gray-800">
                             {player.playerName}
                             {player.isCurrentUser && <span className="text-blue-600 ml-2">🎯</span>}
                             {index === 0 && <span className="text-yellow-600 ml-2">👑</span>}
                           </div>
                            <div className="text-sm lg:text-base text-gray-600">
                              {index === 0 ? 'Winner!' : `${Math.round(player.totalPoints / gameState.totalRounds)} pts/round average`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl lg:text-3xl font-bold text-[#ea384c]">
                            {player.totalPoints}
                          </div>
                          <div className="text-sm lg:text-base text-gray-600">
                            total points
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current result after guessing */}
      {(() => {
        const currentResult = gameState.hasGuessed && gameState.currentImage ? 
          gameState.results.find(r => r.imageId === gameState.currentImage.id) : null;

        // Show round results screen after guessing (same component for both single and multiplayer)
        if (gameState.hasGuessed && gameState.currentImage && currentResult) {
          return (
            <AnimatePresence mode="wait">
            <RoundResults 
                key={`result-${gameState.currentRound}-${currentResult.imageId}`}
              result={currentResult}
              onNext={multiplayerMode && !multiplayerState?.isHost ? undefined : (async () => {
                if (multiplayerMode && gameState.currentRound >= gameState.totalRounds) {
                  // Last round in multiplayer - go to final results flow
                  console.log('🏁 Host completing multiplayer game...');
                  if (onMultiplayerNextRound) {
                    await onMultiplayerNextRound();
                  }
                  setGameOverView('story');
                } else {
                  // Regular next round
                  await handleNextRound();
                }
              })}
              onGoHome={handleGoHome}
              isLastRound={gameState.currentRound === gameState.totalRounds}
              roundNumber={gameState.currentRound}
              totalRounds={gameState.totalRounds}
              imageDescription={gameState.currentImage.description}
              multiplayerMode={multiplayerMode}
              isHost={multiplayerState?.isHost}
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

      {/* Multiplayer waiting overlay */}
      {multiplayerMode && multiplayerState?.waitingForPlayers && gameState.hasGuessed && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-2xl mb-4">⏳</div>
            <h3 className="text-xl font-bold mb-2">Waiting for Other Players</h3>
            <p className="text-gray-600 mb-4">
              {multiplayerState.playersReady} of {multiplayerState.totalPlayers} players have submitted their guesses.
            </p>
            <div className="animate-pulse text-blue-600 mb-4">
              Please wait while others finish their guesses...
            </div>
            
                        {/* Host-only manual controls - show for host when any players have submitted */}
            {multiplayerState.isHost && multiplayerState.playersReady > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Host Controls:</p>
                <button 
                  onClick={() => {
                    console.log('🎮 Host manually triggering next round from waiting dialog...');
                    handleNextRound();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Next Round →
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  {multiplayerState.playersReady >= multiplayerState.totalPlayers 
                    ? "All players ready - you can advance anytime"
                    : `${multiplayerState.playersReady}/${multiplayerState.totalPlayers} players ready`
                  }
                </p>
              </div>
            )}
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
            onGoHome={onMultiplayerExit || handleGoHome}
            onTimeUp={handleTimeUp}
            multiplayerState={multiplayerMode ? multiplayerState : undefined}
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
