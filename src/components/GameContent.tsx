import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImage as GameImageType } from '@/types/game';
import GameImage from './GameImage';
import YearSelector from './YearSelector';
import MapSelector from './MapSelector';
import EnhancedButton from './EnhancedButton';
import { toast } from "sonner";
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import { useScreenReader, useKeyboardNavigation } from '@/hooks/useAccessibility';
import { useBreakpoint } from '@/hooks/useResponsive';
import { LoadingSpinner, GameImageSkeleton, ErrorState } from '@/components/ui/LoadingStates';
import OptimizedImage from '@/components/OptimizedImage';

interface GameContentProps {
  currentImage: GameImageType;
  hasGuessed: boolean;
  yearGuess: number | null;
  locationGuess: { lat: number; lng: number } | null;
  onYearSelected: (year: number) => void;
  onLocationSelected: (lat: number, lng: number) => void;
  onSubmitGuess: () => void;
  onNextRound: () => void;
  showResults: boolean;
  gameState: {
    currentRound: number;
    timeRemaining: number;
  };
  onGameEnd: () => void;
}

const GameContent: React.FC<GameContentProps> = React.memo(({
  currentImage,
  hasGuessed,
  yearGuess,
  locationGuess,
  onYearSelected,
  onLocationSelected,
  onSubmitGuess,
  onNextRound,
  showResults,
  gameState,
  onGameEnd,
}) => {
  const { announce } = useScreenReader();
  const { isMobile, isTablet } = useBreakpoint();

  // Announce important game state changes to screen readers
  useEffect(() => {
    if (hasGuessed && yearGuess) {
      const yearDiff = Math.abs(yearGuess - currentImage.year);
      announce(`Guess submitted. You were ${yearDiff} years off from ${currentImage.year}.`);
    }
  }, [hasGuessed, yearGuess, currentImage.year, announce]);

  // Keyboard navigation for year selection
  useKeyboardNavigation(
    () => {
      if (!hasGuessed && locationGuess) {
        onSubmitGuess();
      }
    },
    undefined,
    (direction) => {
      if (!hasGuessed && (direction === 'left' || direction === 'right')) {
        const increment = direction === 'right' ? 1 : -1;
        const currentYear = yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT;
        const newYear = Math.max(
          GAME_CONSTANTS.YEAR_RANGE.MIN,
          Math.min(GAME_CONSTANTS.YEAR_RANGE.MAX, currentYear + increment)
        );
        onYearSelected(newYear);
      }
    }
  );

  // Memoize year difference calculation
  const yearDifference = useMemo(() => {
    if (!yearGuess || !hasGuessed) return null;
    const diff = Math.abs(yearGuess - currentImage.year);
    const direction = yearGuess > currentImage.year ? 'too late' : 'too early';
    return { diff, direction };
  }, [yearGuess, currentImage.year, hasGuessed]);

  // Memoize the actual location for MapSelector
  const actualLocation = useMemo(() => 
    hasGuessed ? currentImage?.location : undefined,
    [hasGuessed, currentImage?.location]
  );

  const handleSubmitGuess = () => {
    console.log('🎯 handleSubmitGuess called, locationGuess:', locationGuess);
    if (!locationGuess) {
      console.log('❌ No location selected, showing error');
      toast.error("Please select a location on the map before submitting your guess!");
      announce("Please select a location on the map before submitting your guess!", "assertive");
      return;
    }
    console.log('✅ Location selected, calling onSubmitGuess');
    onSubmitGuess();
  };

  // Desktop-first responsive layout classes
  const containerClasses = "flex gap-8 flex-grow lg:gap-6 md:gap-4 md:flex-col sm:flex-col sm:gap-3";

  const leftColumnClasses = "flex-1 relative md:w-full md:flex-1 md:min-h-0 sm:w-full sm:flex-1 sm:min-h-0";

  const rightColumnClasses = "flex-1 flex flex-col md:w-full md:flex-1 md:min-h-0 md:flex md:flex-col sm:w-full sm:flex-1 sm:min-h-0 sm:flex sm:flex-col";

  return (
    <div 
      className={containerClasses}
      role="main"
      aria-label="Game content area"
    >
      {/* Mobile: Image takes smaller portion, Desktop: Left Column */}
      <motion.div 
        className={leftColumnClasses}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Image container with enhanced loading states */}
        <motion.div 
          className={`w-full relative ${isMobile ? 'h-full' : ''}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          <GameImage 
            imageUrl={currentImage.image_url} 
            description={currentImage.description} 
            revealDescription={hasGuessed}
          />
        </motion.div>
        
        {/* Desktop Year selector OR Mobile overlay */}
        <AnimatePresence>
          {!isMobile && !hasGuessed && (
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            >
              {/* Year display box - enhanced visual styling */}
              <motion.div 
                className="bg-[#ea384c] text-white py-3 px-6 text-center rounded-xl mb-3 flex items-center justify-center shadow-lg border-2 border-red-600 transition-all duration-200 hover:shadow-xl" 
                style={{ height: GAME_CONSTANTS.UI.YEAR_DISPLAY_HEIGHT }}
                role="status"
                aria-live="polite"
                aria-label={`Selected year: ${yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}`}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  className="text-5xl font-bold drop-shadow-sm"
                  key={yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                </motion.div>
              </motion.div>
              
              {/* Slider with enhanced styling and accessibility */}
              <motion.div 
                className="relative p-4 bg-white/50 rounded-xl shadow-sm border border-gray-200"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <label htmlFor="year-slider" className="sr-only">
                  Select year between {GAME_CONSTANTS.YEAR_RANGE.MIN} and {GAME_CONSTANTS.YEAR_RANGE.MAX}
                </label>
                <input
                  id="year-slider"
                  type="range"
                  min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                  max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                  value={yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                  onChange={(e) => onYearSelected(parseInt(e.target.value))}
                  disabled={false}
                  className="w-full h-10 appearance-none bg-transparent cursor-pointer transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-red-200"
                  style={{ 
                    background: `linear-gradient(to right, #ea384c ${((yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT) - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100}%, #ea384c ${((yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT) - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100}%, #ccc ${((yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT) - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100}%)`,
                    height: '12px',
                    borderRadius: '6px',
                  }}
                  aria-describedby="year-range-description"
                />
                <div 
                  id="year-range-description"
                  className="flex justify-between text-sm text-gray-700 mt-3 font-medium"
                >
                  <span>{GAME_CONSTANTS.YEAR_RANGE.MIN}</span>
                  <span>{GAME_CONSTANTS.YEAR_RANGE.MAX}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Result details shown when user has guessed - Desktop only */}
        <AnimatePresence>
          {!isMobile && hasGuessed && (
            <motion.div 
              className="bg-white p-6 rounded-xl mt-4 shadow-lg border border-gray-200"
              role="region"
              aria-label="Guess results"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <motion.div 
                className="text-xl font-semibold text-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {currentImage.year} - {currentImage.location.name}
              </motion.div>
              {yearGuess && yearDifference && (
                <motion.div 
                  className="mt-3 text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="font-semibold">Your year guess: </span> 
                  <span className="font-bold text-[#ea384c]">{yearGuess}</span>
                  <span className="ml-2">
                    ({yearDifference.diff} years {yearDifference.direction})
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Mobile: Map + Controls, Desktop: Right Column */}
      <motion.div 
        className={rightColumnClasses}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        {/* Map container - Mobile gets more space */}
        <motion.div 
          className="rounded-xl overflow-hidden shadow-lg border-2 border-gray-300 bg-white relative" 
          style={{ height: isMobile ? '100%' : GAME_CONSTANTS.UI.MAP_HEIGHT }}
          role="application"
          aria-label="Interactive map for location selection"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          whileHover={{ scale: isMobile ? 1 : 1.01 }}
        >
          <MapSelector 
            onLocationSelected={hasGuessed ? () => {} : onLocationSelected} 
            isDisabled={hasGuessed} 
            actualLocation={actualLocation} 
            guessedLocation={locationGuess} 
          />

          {/* Mobile: Year Slider Overlay on Map */}
          <AnimatePresence>
            {isMobile && !hasGuessed && (
              <motion.div 
                className="absolute bottom-4 left-4 right-4 z-20"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
              >
                <motion.div 
                  className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col space-y-3">
                    <label className="text-lg font-semibold text-gray-800 text-center">
                      Year: <motion.span 
                        className="text-[#ea384c] font-bold"
                        key={yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                      </motion.span>
                    </label>
                    <input
                      type="range"
                      min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                      max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                      value={yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                      onChange={(e) => onYearSelected(parseInt(e.target.value))}
                      className="w-full h-10 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-slider"
                      style={{
                        background: `linear-gradient(to right, #ea384c 0%, #ea384c ${((yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT) - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100}%, #e5e7eb ${((yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT) - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-sm text-gray-600 font-medium">
                      <span>{GAME_CONSTANTS.YEAR_RANGE.MIN}</span>
                      <span>{GAME_CONSTANTS.YEAR_RANGE.MAX}</span>
                    </div>
                    
                    {/* Mobile Submit Button */}
                    <motion.div
                      className="mt-3"
                      whileHover={{ scale: locationGuess ? 1.02 : 1 }}
                      whileTap={{ scale: locationGuess ? 0.98 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <EnhancedButton 
                        onClick={handleSubmitGuess} 
                        disabled={!locationGuess} 
                        animationType="pulse" 
                        className={`w-full py-2 px-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center shadow-lg border-2 focus:ring-4 focus:ring-red-200 focus:outline-none text-lg ${
                          locationGuess 
                            ? "bg-[#ea384c] hover:bg-red-600 text-white border-red-600 hover:shadow-xl" 
                            : "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 shadow-sm"
                        }`}
                        aria-label={locationGuess ? "Submit your guess" : "Select a location first to submit guess"}
                      >
                        <motion.span 
                          className="drop-shadow-sm"
                          animate={locationGuess ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          Make Guess
                        </motion.span>
                      </EnhancedButton>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile: Results Overlay */}
          <AnimatePresence>
            {isMobile && hasGuessed && (
              <motion.div 
                className="absolute top-4 left-4 right-4 z-20"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <motion.div 
                  className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                >
                  <motion.div 
                    className="text-lg font-semibold text-gray-800 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {currentImage.year} - {currentImage.location.name}
                  </motion.div>
                  {yearGuess && yearDifference && (
                    <motion.div 
                      className="mt-2 text-center text-gray-600"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <span className="font-semibold">Your guess: </span> 
                      <span className="font-bold text-[#ea384c]">{yearGuess}</span>
                      <span className="block text-sm mt-1">
                        ({yearDifference.diff} years {yearDifference.direction})
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Desktop Submit button */}
        <AnimatePresence>
          {!isMobile && !hasGuessed && (
            <motion.div 
              className="flex-shrink-0"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
            >
              <div className="mb-3 mt-3">
                <motion.div
                  whileHover={{ scale: locationGuess ? 1.02 : 1 }}
                  whileTap={{ scale: locationGuess ? 0.98 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <EnhancedButton 
                    onClick={handleSubmitGuess} 
                    disabled={!locationGuess} 
                    animationType="pulse" 
                    className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center shadow-lg border-2 focus:ring-4 focus:ring-red-200 focus:outline-none text-5xl ${
                      locationGuess 
                        ? "bg-[#ea384c] hover:bg-red-600 text-white border-red-600 hover:shadow-xl" 
                        : "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 shadow-sm"
                    }`}
                    style={{ height: GAME_CONSTANTS.UI.SUBMIT_BUTTON_HEIGHT }}
                    aria-label={locationGuess ? "Submit your guess" : "Select a location first to submit guess"}
                  >
                    <motion.span 
                      className="drop-shadow-sm"
                      animate={locationGuess ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Make Guess
                    </motion.span>
                  </EnhancedButton>
                </motion.div>
              </div>
              
              {/* Enhanced spacer */}
              <div className="h-20"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

GameContent.displayName = 'GameContent';

export default GameContent;
