import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Target, Clock, MapPin, Calendar, Navigation } from 'lucide-react';
import GameImage from '@/components/GameImage';
import MapSelector from '@/components/MapSelector';
import GameHeader from '@/components/GameHeader';
import EnhancedButton from '@/components/EnhancedButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import { loadGoogleMapsScript, createOptimizedMap } from '@/utils/mapUtils';
import { calculateCompleteScore } from '@/utils/scoringSystem';
import { calculateDistance, transformDatabaseImageToGameImage } from '@/utils/gameUtils';

interface TutorialPracticeRoundProps {
  onComplete: (score: number) => void;
  onSkip: () => void;
}

const TutorialPracticeRound: React.FC<TutorialPracticeRoundProps> = ({
  onComplete,
  onSkip,
}) => {
  const [practiceImage, setPracticeImage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [yearGuess, setYearGuess] = useState<number | null>(null);
  const [locationGuess, setLocationGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentStep, setCurrentStep] = useState<'observe' | 'year' | 'location' | 'submit' | 'results'>('observe');
  const [score, setScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<any>(null);
  const [encouragementShown, setEncouragementShown] = useState(false);
  
  // Map refs for results display
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Fetch a practice image from the database
  useEffect(() => {
    const fetchPracticeImage = async () => {
      try {
        const { data, error } = await supabase
          .from('game_images')
          .select('*')
          .limit(1)
          .single();

        if (error) throw error;

        // Transform the database response with Google Drive URL conversion
        const transformedImage = transformDatabaseImageToGameImage(data);

        console.log('✅ Fetched and transformed practice image:', transformedImage);
        setPracticeImage(transformedImage);
      } catch (error) {
        console.error('Error fetching practice image:', error);
        // Fallback to a default image with proper structure
        setPracticeImage({
          id: 'tutorial-practice',
          image_url: 'https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800&h=600&fit=crop&auto=format&q=85',
          description: 'A classic 1960s Volkswagen Beetle parked on a street',
          year: 1967,
          location: {
            lat: 37.7749,
            lng: -122.4194,
            name: 'San Francisco, California, USA',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeImage();
  }, []);

  // Calculate score using the actual game's scoring system
  const calculateScore = useCallback(() => {
    try {
      if (!yearGuess || !locationGuess || !practiceImage) return { totalScore: 0, breakdown: null };

      // Ensure practiceImage has the required structure
      if (!practiceImage.year || !practiceImage.location || typeof practiceImage.location.lat !== 'number') {
        console.error('Practice image missing required data:', practiceImage);
        return { totalScore: 0, breakdown: null };
      }

      // Use the actual game's scoring system
      const scoreBreakdown = calculateCompleteScore(
        practiceImage.year,
        practiceImage.location.lat,
        practiceImage.location.lng,
        yearGuess,
        locationGuess.lat,
        locationGuess.lng,
        0, // No time remaining for tutorial
        false, // Not timed mode
        'per-round'
      );

      return {
        totalScore: scoreBreakdown.displayTotalScore,
        breakdown: scoreBreakdown
      };
    } catch (error) {
      console.error('Error calculating score:', error);
      return { totalScore: 0, breakdown: null };
    }
  }, [yearGuess, locationGuess, practiceImage]);

  // Auto-advance through steps with guidance
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep === 'observe' && !encouragementShown) {
        setEncouragementShown(true);
        toast.info("Take your time to examine the image for clues about when and where it was taken!");
        setTimeout(() => setCurrentStep('year'), 3000);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentStep, encouragementShown]);

  const handleYearSelected = (year: number) => {
    setYearGuess(year);
    if (currentStep === 'year') {
      toast.success("Great! Now click on the map to guess the location.");
      setCurrentStep('location');
    }
  };

  const handleLocationSelected = (lat: number, lng: number) => {
    setLocationGuess({ lat, lng });
    if (currentStep === 'location') {
      toast.success("Perfect! Now submit your guess to see how you did.");
      setCurrentStep('submit');
    }
  };

  const handleSubmitGuess = () => {
    try {
      if (!yearGuess || !locationGuess) {
        toast.error("Please make both year and location guesses before submitting!");
        return;
      }

      if (!practiceImage || !practiceImage.location) {
        toast.error("Unable to process your guess. Please try again.");
        console.error('Practice image or location is missing:', practiceImage);
        return;
      }

      setHasGuessed(true);
      setShowResults(true);
      setCurrentStep('results');
      
      const scoreResult = calculateScore();
      const finalScore = scoreResult.totalScore;
      setScore(finalScore);
      setScoreBreakdown(scoreResult.breakdown);

      // Show encouraging feedback based on actual scoring ranges
      setTimeout(() => {
        if (finalScore >= 8000) {
          toast.success("Outstanding! You're a master detective!");
        } else if (finalScore >= 6000) {
          toast.success("Excellent work! You have great intuition!");
        } else if (finalScore >= 4000) {
          toast.success("Good job! You're getting the hang of it!");
        } else if (finalScore >= 2000) {
          toast.success("Nice try! Practice makes perfect!");
        } else {
          toast.success("Keep practicing! Every detective started somewhere!");
        }
      }, 1000);
    } catch (error) {
      console.error('Error submitting guess:', error);
      toast.error("Something went wrong while submitting your guess. Please try again.");
    }
  };

  const handleComplete = () => {
    onComplete(score);
  };

  const handleGoHome = () => {
    onSkip();
  };

  // Create custom marker with consistent styling
  const createCustomMarker = (
    position: { lat: number; lng: number },
    map: google.maps.Map,
    isGuess: boolean,
    title: string
  ): google.maps.Marker => {
    return new google.maps.Marker({
      position,
      map,
      title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: isGuess ? "#3b82f6" : "#ea384c",
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: "#ffffff",
        strokeOpacity: 1
      }
    });
  };

  // Clear all markers and polylines
  const clearMapElements = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
  };

  // Initialize results map
  useEffect(() => {
    if (!hasGuessed || !window.google?.maps || !mapRef.current || !locationGuess || !practiceImage?.location) return;
    
    try {
      // Use optimized map configuration for better performance
      const map = createOptimizedMap(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2
      });
      
      googleMapRef.current = map;
      
      // Clear existing elements
      clearMapElements();
      
      // Add guessed location marker
      const guessedMarker = createCustomMarker(
        locationGuess,
        map,
        true,
        "Your Guess"
      );
      markersRef.current.push(guessedMarker);
      
      // Add actual location marker
      const actualMarker = createCustomMarker(
        practiceImage.location,
        map,
        false,
        "Actual Location"
      );
      markersRef.current.push(actualMarker);
      
      // Draw line between the two points
      const polyline = new google.maps.Polyline({
        path: [locationGuess, practiceImage.location],
        geodesic: true,
        strokeColor: "#ea384c",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map
      });
      polylinesRef.current.push(polyline);
      
      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(locationGuess);
      bounds.extend(practiceImage.location);
      map.fitBounds(bounds, 100);
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
    }
  }, [hasGuessed, locationGuess, practiceImage]);

  // Load Google Maps API for results
  useEffect(() => {
    if (hasGuessed) {
      if (window.google?.maps) {
        setMapReady(true);
        return;
      }
      
      loadGoogleMapsScript()
        .then(() => {
          setMapReady(true);
        })
        .catch((error) => {
          console.error('Failed to load Google Maps:', error);
        });
    }
  }, [hasGuessed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMapElements();
    };
  }, []);

  const getStepGuidance = () => {
    switch (currentStep) {
      case 'observe':
        return {
          title: "Observe the Image",
          description: "Look carefully at the image for clues about the time period and location. Notice clothing, architecture, vehicles, and other details.",
          icon: <Target className="w-5 h-5" />,
        };
      case 'year':
        return {
          title: "Guess the Year",
          description: "Based on what you observed, use the slider below to select when you think this photo was taken.",
          icon: <Calendar className="w-5 h-5" />,
        };
      case 'location':
        return {
          title: "Guess the Location",
          description: "Click on the map to place your guess for where this photo was taken. Look for geographical and architectural clues.",
          icon: <MapPin className="w-5 h-5" />,
        };
      case 'submit':
        return {
          title: "Submit Your Guess",
          description: "Ready to see how you did? Click the button below to submit your guesses and get your score!",
          icon: <CheckCircle className="w-5 h-5" />,
        };
      case 'results':
        return {
          title: "Practice Complete!",
          description: "Great job! See how you did and get ready to play the real game.",
          icon: <CheckCircle className="w-5 h-5" />,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ea384c]/30 border-t-[#ea384c] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-xl">Loading practice round...</p>
        </div>
      </div>
    );
  }

  if (!practiceImage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8f5f0] to-[#e8e0d0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-xl mb-4">Unable to load practice image</p>
          <Button onClick={onSkip}>Skip Practice</Button>
        </div>
      </div>
    );
  }

  const guidance = getStepGuidance();
  const yearDifference = hasGuessed && yearGuess && practiceImage?.year ? {
    diff: Math.abs(yearGuess - practiceImage.year),
    direction: yearGuess > practiceImage.year ? 'too late' : 'too early'
  } : null;

  // Get distance for display
  const distanceOff = hasGuessed && locationGuess && practiceImage?.location 
    ? calculateDistance(
        locationGuess.lat, locationGuess.lng,
        practiceImage.location.lat, practiceImage.location.lng
      )
    : 0;

  // If showing results, use the same layout as RoundResults
  if (hasGuessed && practiceImage?.location) {
    return (
      <div className="w-full min-h-screen bg-[#eee9da] p-6">
        {/* Header with logo and practice complete */}
        <div className="flex items-center justify-between mb-6">
          {/* Logo on the left */}
          <div className="flex items-center">
            <button 
              onClick={handleGoHome}
              className="hover:scale-105 hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ea384c] focus:ring-opacity-50 rounded-lg"
              aria-label="Go to home page"
            >
              <img 
                src="/Smruti-map.png" 
                alt="SMRUTIMAP Logo"
                className="h-20 lg:h-28 xl:h-32 w-auto cursor-pointer" 
              />
            </button>
          </div>
          
          {/* Practice complete in the center */}
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Practice Complete!
            </h1>
            <div className="w-full bg-gray-300 rounded-full h-2 max-w-lg mx-auto">
              <div 
                className="bg-[#ea384c] h-2 rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Complete Tutorial button on the right */}
          <div className="flex items-center">
            <Button 
              onClick={handleGoHome}
              className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-semibold shadow-xl transition-all hover:scale-105"
            >
              Complete Tutorial
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Description section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-4 border-[#ea384c]">
            <p className="text-lg text-gray-800 leading-relaxed text-center">
              {practiceImage.description || "Practice image from the tutorial"}
            </p>
          </div>

          {/* Score display - same style as RoundResults */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#ea384c] text-white rounded-2xl p-8 shadow-xl"
          >
            <div className="text-center mb-6">
              <div className="text-6xl font-bold mb-2">
                {Math.round(score)}
              </div>
              <div className="text-2xl font-semibold opacity-90">POINTS</div>
            </div>
            
            {/* Score breakdown - same style as RoundResults */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-center">
              <div className="flex-1 min-w-[90px] max-w-[120px] space-y-1">
                <div className="text-sm opacity-90 font-medium">Year Score</div>
                <div className="text-xl font-bold">{Math.round(scoreBreakdown.displayYearScore)}</div>
              </div>
              
              <div className="hidden md:block w-px bg-white/30 self-stretch"></div>
              
              <div className="flex-1 min-w-[90px] max-w-[120px] space-y-1">
                <div className="text-sm opacity-90 font-medium">Distance Score</div>
                <div className="text-xl font-bold">{Math.round(scoreBreakdown.displayLocationScore)}</div>
              </div>
              
              <div className="hidden md:block w-px bg-white/30 self-stretch"></div>
              
              <div className="flex-1 min-w-[90px] max-w-[120px] space-y-1">
                <div className="text-sm opacity-90 font-medium">Year Guess</div>
                <div className="text-xl font-bold">{yearGuess}</div>
              </div>
              
              <div className="hidden md:block w-px bg-white/30 self-stretch"></div>
              
              <div className="flex-1 min-w-[90px] max-w-[120px] space-y-1">
                <div className="text-sm opacity-90 font-medium">Actual Year</div>
                <div className="text-xl font-bold">{practiceImage.year}</div>
              </div>
            </div>

            {/* Additional details matching actual game */}
            <div className="mt-6 pt-6 border-t border-white/20 text-center">
              <div className="text-lg mb-2">
                <strong>Year difference:</strong> {Math.abs(yearGuess! - practiceImage!.year)} years
              </div>
              <div className="text-lg">
                <strong>Distance:</strong> {Math.round(calculateDistance(
                  locationGuess!.lat, locationGuess!.lng,
                  practiceImage!.location.lat, practiceImage!.location.lng
                ) * 0.621371)} miles away
              </div>
            </div>
          </motion.div>

          {/* Image and Map side by side - same style as RoundResults */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Game Image with fixed aspect ratio */}
            <div className="relative w-full aspect-[4/3] bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-[#ea384c]">
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <img 
                  src={practiceImage.image_url} 
                  alt="Practice image" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
                  }}
                />
              </div>
            </div>
            
            {/* Map with identical fixed aspect ratio */}
            <Card className="relative w-full aspect-[4/3] overflow-hidden shadow-xl border-4 border-[#ea384c]">
              <div className="absolute inset-0">
                <div 
                  ref={mapRef} 
                  className="w-full h-full rounded-lg"
                />
                
                {!mapReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <Navigation className="animate-spin mb-3 mx-auto text-[#ea384c]" size={32} />
                      <p className="text-gray-700 font-medium">Loading map...</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Regular tutorial UI when not showing results
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
        onGoHome={handleGoHome}
        onTimeUp={() => {}}
      />

      {/* Guidance Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="bg-blue-50 border-b border-blue-200 p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              {guidance.icon}
            </div>
            <div>
              <h2 className="font-semibold text-blue-900">{guidance.title}</h2>
              <p className="text-blue-700 text-sm">{guidance.description}</p>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={onSkip}>
                Skip Practice
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Main Game Content - Exact same layout as actual game */}
      <div className="w-full max-w-full mx-auto h-[calc(100vh-140px)] flex flex-col py-4 px-6">
        <div className="flex gap-8 flex-grow">
          {/* Left Column - Image and Year Selector */}
          <div className="flex-1 relative">
            {/* Image container */}
            <div className="w-full relative">
              <GameImage 
                imageUrl={practiceImage.image_url}
                description={practiceImage.description}
                revealDescription={hasGuessed}
              />
            </div>
            
            {/* Year selector - exact same as actual game */}
            {!hasGuessed && (
              <div className="mt-4">
                {/* Year display box */}
                <div 
                  className={`bg-[#ea384c] text-white py-3 px-6 text-center rounded-xl mb-3 flex items-center justify-center shadow-lg border-2 transition-all duration-200 hover:shadow-xl ${
                    currentStep === 'year' ? 'border-yellow-400 shadow-xl scale-105' : 'border-red-600'
                  }`}
                  style={{ height: GAME_CONSTANTS.UI.YEAR_DISPLAY_HEIGHT }}
                  role="status"
                  aria-live="polite"
                  aria-label={`Selected year: ${yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}`}
                >
                  <div className="font-bold text-5xl drop-shadow-sm">
                    {yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                  </div>
                </div>
                
                {/* Slider - exact same as actual game */}
                <div className={`relative p-4 bg-white/50 rounded-xl shadow-sm border border-gray-200 ${
                  currentStep === 'year' ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                }`}>
                  <label htmlFor="year-slider" className="sr-only">
                    Select year between {GAME_CONSTANTS.YEAR_RANGE.MIN} and {GAME_CONSTANTS.YEAR_RANGE.MAX}
                  </label>
                  <input
                    id="year-slider"
                    type="range"
                    min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                    max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                    value={yearGuess || GAME_CONSTANTS.YEAR_RANGE.DEFAULT}
                    onChange={(e) => handleYearSelected(parseInt(e.target.value))}
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
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Map and Submit Button */}
          <div className="flex-1 flex flex-col">
            {/* Map - Fixed height instead of flex-1 */}
            <div 
              className={`rounded-xl overflow-hidden shadow-lg border-2 bg-white mb-6 transition-all duration-200 ${
                currentStep === 'location' ? 'border-yellow-400 shadow-xl' : 'border-gray-300'
              }`}
              style={{ height: '450px' }}
            >
              <MapSelector 
                onLocationSelected={hasGuessed ? () => {} : handleLocationSelected}
                isDisabled={hasGuessed}
                actualLocation={hasGuessed ? practiceImage.location : undefined}
                guessedLocation={locationGuess}
              />
            </div>

            {/* Submit Button */}
            {!hasGuessed && (
              <div className="flex-shrink-0">
                <EnhancedButton 
                  onClick={handleSubmitGuess}
                  disabled={!locationGuess || !yearGuess}
                  animationType="pulse"
                  className={`w-full py-4 px-6 rounded-xl font-bold text-2xl transition-all duration-300 flex items-center justify-center shadow-lg border-2 transform hover:scale-105 focus:ring-4 focus:ring-red-200 focus:outline-none ${
                    currentStep === 'submit' ? 'border-yellow-400 shadow-xl scale-105' : ''
                  } ${
                    locationGuess && yearGuess
                      ? "bg-[#ea384c] hover:bg-red-600 text-white border-red-600 hover:shadow-xl" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 shadow-sm"
                  }`}
                  style={{ height: '80px' }}
                >
                  <span className="drop-shadow-sm">Submit Practice Guess</span>
                </EnhancedButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialPracticeRound; 