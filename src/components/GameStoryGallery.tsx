import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GuessResult } from '@/types/game';
import { MapPin, Clock, Trophy, ArrowRight, Calendar, Timer } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';

interface GameStoryGalleryProps {
  results: GuessResult[];
  onViewDetailedBreakdown: () => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
  isTimedMode?: boolean;
  multiplayerMode?: boolean;
}

// Photo component with interactive hover and drag effects
const Photo: React.FC<{
  src: string;
  alt: string;
  className?: string;
  direction?: 'left' | 'right';
  width: number;
  height: number;
  rotation: number;
  roundInfo: {
    roundNumber: number;
    score: number;
    distance: number;
    yearDiff: number;
    timeUsed?: number;
    locationName: string;
  };
  isTimedMode: boolean;
}> = ({ 
  src, 
  alt, 
  className, 
  direction = 'left', 
  width, 
  height, 
  rotation,
  roundInfo,
  isTimedMode
}) => {
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  function handleMouse(event: {
    currentTarget: { getBoundingClientRect: () => any };
    clientX: number;
    clientY: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  const resetMouse = () => {
    x.set(200);
    y.set(200);
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={{ scale: 1.05 }}
      whileHover={{
        scale: 1.1,
        rotateZ: 2 * (direction === 'left' ? -1 : 1),
      }}
      whileDrag={{
        scale: 1.1,
      }}
      initial={{ rotate: 0 }}
      animate={{ rotate: rotation }}
      style={{
        width,
        height,
        perspective: 400,
        transform: `rotate(0deg) rotateX(0deg) rotateY(0deg)`,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
      className={`relative mx-auto shrink-0 cursor-grab active:cursor-grabbing group ${className}`}
      onMouseMove={handleMouse}
      onMouseLeave={resetMouse}
      draggable={false}
      tabIndex={0}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-lg">
        <img
          className="rounded-3xl object-cover w-full h-full"
          src={src}
          alt={alt}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
          }}
        />
        
        {/* Round number badge */}
        <div className="absolute top-4 left-4 bg-[#ea384c] text-white rounded-full w-10 h-10 flex items-center justify-center text-base font-bold shadow-lg z-10">
          {roundInfo.roundNumber}
        </div>

        {/* Hover overlay with round info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl">
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="font-bold text-xl mb-2">Round {roundInfo.roundNumber}</div>
            <div className="text-base opacity-90 mb-4 line-clamp-2">
              {roundInfo.locationName}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Trophy size={16} />
                {Math.round(roundInfo.score)} pts
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {Math.round(roundInfo.distance)}mi
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {roundInfo.yearDiff}yr
              </div>
              {isTimedMode && roundInfo.timeUsed && (
                <div className="flex items-center gap-2">
                  <Timer size={16} />
                  {Math.floor(roundInfo.timeUsed / 60)}:{(roundInfo.timeUsed % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const GameStoryGallery: React.FC<GameStoryGalleryProps> = ({
  results,
  onViewDetailedBreakdown,
  onPlayAgain,
  onGoHome,
  isTimedMode = false,
  multiplayerMode = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredPhoto, setHoveredPhoto] = useState<string | null>(null);

  useEffect(() => {
    // First make the container visible with a fade-in
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, 200);

    // Then start the photo animations after a short delay
    const animationTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 600);

    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(animationTimer);
    };
  }, []);

  // Calculate scores consistently with GameSummary
  const getScaledScore = (result: GuessResult) => {
    if (result.scaledScore !== undefined) {
      return result.scaledScore;
    }
    
    if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
      const baseScore = result.displayYearScore + result.displayLocationScore;
      const timeBonus = result.timeBonus || 0;
      return baseScore + timeBonus;
    }
    
    return (result.totalScore * 100) + (result.timeBonus || 0);
  };

  const finalScore = results.length > 0
    ? results.reduce((sum, result) => sum + getScaledScore(result), 0)
    : 0;

  const totalTimeUsed = results.reduce((sum, result) => sum + (result.timeUsed || 0), 0);

  // Calculate distance for display
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (result: GuessResult) => {
    return result.imageUrl || 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
  };

  // Generate random rotations for photos
  const getRandomRotation = (index: number, direction: 'left' | 'right') => {
    const baseRotations = [2, -1, 3, -2, 1]; // Predefined rotations for consistency
    const rotation = baseRotations[index % baseRotations.length];
    return rotation * (direction === 'left' ? -1 : 1);
  };

  // Photo positions - horizontal layout with random y offsets (scaled up)
  const getPhotoPositions = (numPhotos: number) => {
    const basePositions = [
      { x: -420, y: 20, direction: 'left' as const },
      { x: -210, y: 40, direction: 'left' as const },
      { x: 0, y: 10, direction: 'right' as const },
      { x: 210, y: 30, direction: 'right' as const },
      { x: 420, y: 55, direction: 'left' as const },
    ];

    // Adjust positions based on number of photos (scaled up)
    if (numPhotos <= 3) {
      return [
        { x: -280, y: 25, direction: 'left' as const },
        { x: 0, y: 15, direction: 'right' as const },
        { x: 280, y: 40, direction: 'left' as const },
      ].slice(0, numPhotos);
    } else if (numPhotos === 4) {
      return [
        { x: -315, y: 25, direction: 'left' as const },
        { x: -105, y: 45, direction: 'left' as const },
        { x: 105, y: 15, direction: 'right' as const },
        { x: 315, y: 35, direction: 'right' as const },
      ];
    }

    return basePositions.slice(0, numPhotos);
  };

  const photoPositions = getPhotoPositions(results.length);

  // Animation variants for the container
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  // Animation variants for each photo
  const photoVariants = {
    hidden: () => ({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    }),
    visible: (custom: { x: any; y: any; order: number }) => ({
      x: custom.x,
      y: custom.y,
      rotate: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 70,
        damping: 12,
        mass: 1,
        delay: custom.order * 0.15,
      },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] flex flex-col">
      {/* Background grid pattern */}
      <div className="absolute inset-0 max-md:hidden top-[200px] -z-10 h-[300px] w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-10 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      
      {/* Main Content Container - Moved up more with reduced padding */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-6xl mx-auto pt-2 px-8">
        
        {/* Header Section - More spacing from images */}
        <div className="text-center mb-16 z-20">
          {/* SmrutiMap Logo - Centered */}
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          >
            <motion.button 
              onClick={onGoHome} 
              className="hover:scale-105 hover:opacity-90 transition-all duration-200 cursor-pointer"
              aria-label="Go to home page"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src="/Smruti-map.png" 
                alt="SMRUTIMAP Logo"
                className="h-20 lg:h-28 xl:h-32 w-auto" 
              />
            </motion.button>
          </motion.div>

          {/* Subtitle */}
          <motion.div 
            className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            A Journey Through Visual Smrutis
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            className="text-5xl md:text-6xl font-bold text-gray-800 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Your Game <span className="text-[#ea384c]">Story</span>
          </motion.h1>

          {/* Score Summary */}
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <div className="text-3xl font-bold text-[#ea384c] mb-1">
                  {Math.round(finalScore)}
                </div>
                <div className="text-sm text-gray-600 font-medium">Total Score</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <div className="text-3xl font-bold text-[#ea384c] mb-1">
                  {results.length}
                </div>
                <div className="text-sm text-gray-600 font-medium">Rounds Completed</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <div className="text-3xl font-bold text-[#ea384c] mb-1">
                  {isTimedMode ? formatTime(totalTimeUsed) : `${Math.round(finalScore / results.length)}`}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {isTimedMode ? 'Total Time' : 'Avg Score'}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Photo Gallery - Centered */}
        <div className="mb-24">
          <motion.div
            className="relative mx-auto flex w-full justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <motion.div
              className="relative flex w-full justify-center"
              variants={containerVariants}
              initial="hidden"
              animate={isLoaded ? 'visible' : 'hidden'}
            >
              <div className="relative h-[300px] w-[300px]">
                {/* Render photos in reverse z-index order */}
                {results.map((result, index) => {
                  const distance = result.actualLocation ? calculateDistance(
                    result.locationGuess.lat, result.locationGuess.lng,
                    result.actualLocation.lat, result.actualLocation.lng
                  ) : 0;

                  const yearDiff = result.actualYear ? Math.abs(result.yearGuess - result.actualYear) : 0;
                  const position = photoPositions[index];
                  
                  // Base z-index with higher index = higher z-index, but hovered photo gets highest
                  const baseZIndex = results.length - index + 10;
                  const isHovered = hoveredPhoto === result.imageId;
                  const zIndex = isHovered ? 9999 : baseZIndex;

                  return (
                    <motion.div
                      key={result.imageId}
                      className="absolute left-0 top-0"
                      style={{ zIndex }}
                      variants={photoVariants}
                      custom={{
                        x: `${position.x}px`,
                        y: `${position.y}px`,
                        order: index,
                      }}
                      onMouseEnter={() => setHoveredPhoto(result.imageId)}
                      onMouseLeave={() => setHoveredPhoto(null)}
                    >
                      <Photo
                        width={300}
                        height={300}
                        src={getImageUrl(result)}
                        alt={`Round ${index + 1}`}
                        direction={position.direction}
                        rotation={getRandomRotation(index, position.direction)}
                        roundInfo={{
                          roundNumber: index + 1,
                          score: getScaledScore(result),
                          distance,
                          yearDiff,
                          timeUsed: result.timeUsed,
                          locationName: result.actualLocation?.name || 'Unknown Location',
                        }}
                        isTimedMode={isTimedMode}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          className={`flex justify-center gap-4 mb-8 ${multiplayerMode ? 'flex-col sm:flex-row' : ''}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onViewDetailedBreakdown}
              className="bg-[#ea384c] hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 min-w-[200px]"
            >
              View Detailed Map
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowRight size={20} />
              </motion.div>
            </Button>
          </motion.div>
          
          {multiplayerMode && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onPlayAgain}
                variant="outline"
                className="border-[#ea384c] text-[#ea384c] hover:bg-[#ea384c] hover:text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 min-w-[200px]"
              >
                <Trophy size={20} />
                View Leaderboard
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default GameStoryGallery; 