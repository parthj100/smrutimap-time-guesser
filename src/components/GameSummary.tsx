import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, stagger } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuessResult } from '@/types/game';
import { Navigation, MapPin, Timer } from 'lucide-react';
import { loadGoogleMapsScript, createOptimizedMap } from '@/utils/mapUtils';

interface GameSummaryProps {
  results: GuessResult[];
  onPlayAgain: () => void;
  onGoHome: () => void;
  isTimedMode?: boolean;
}

const GameSummary: React.FC<GameSummaryProps> = ({ results, onPlayAgain, onGoHome, isTimedMode = false }) => {
  // Use consistent scoring - prefer display scores when available
  const getScaledScore = (result: GuessResult) => {
    // Use the stored scaled score or calculate from display scores
    if (result.scaledScore !== undefined) {
      return result.scaledScore;
    }
    
    // Fallback: use display scores if available
    if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
      const baseScore = result.displayYearScore + result.displayLocationScore;
      const timeBonus = result.timeBonus || 0;
      return baseScore + timeBonus;
    }
    
    // Final fallback: use raw scores with multiplier
    return (result.totalScore * 100) + (result.timeBonus || 0);
  };
  
  // Calculate the final score as sum of all scores
  const finalScore = results.length > 0
    ? results.reduce((sum, result) => sum + getScaledScore(result), 0)
    : 0;

  console.log('📊 GameSummary scoring:', {
    results: results.map(r => ({
      imageId: r.imageId,
      scaledScore: r.scaledScore,
      displayYearScore: r.displayYearScore,
      displayLocationScore: r.displayLocationScore,
      timeBonus: r.timeBonus,
      calculatedScore: getScaledScore(r)
    })),
    finalScore
  });
    
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Calculate total time used for timed mode
  const totalTimeUsed = results.reduce((sum, result) => sum + (result.timeUsed || 0), 0);

  // Calculate distance in miles for display purposes
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
  
  // Calculate years difference for display
  const getYearsDiff = (actual: number, guess: number) => {
    const diff = Math.abs(actual - guess);
    return `${diff} yrs off`;
  };
  
  // Get image URL for each result (using the stored imageUrl)
  const getImageUrl = (result: GuessResult) => {
    // Use the actual image URL stored in the result
    return result.imageUrl || 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
  };

  // Create custom marker with consistent styling
  const createCustomMarker = (
    position: { lat: number; lng: number },
    map: google.maps.Map,
    isGuess: boolean,
    title: string,
    label?: string
  ): google.maps.Marker => {
    return new google.maps.Marker({
      position,
      map,
      title,
      label: label ? {
        text: label,
        color: "#ffffff",
        fontSize: "12px",
        fontWeight: "bold"
      } : undefined,
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

  // Initialize Google Maps
  useEffect(() => {
    // Check if the Google Maps API is loaded
    if (!window.google?.maps || !mapRef.current) return;
    
    try {
      // Use optimized map configuration for better performance
      const map = createOptimizedMap(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2
      });
      
      googleMapRef.current = map;
      setMapReady(true);
      
      // Clear existing markers and lines
      markersRef.current.forEach(marker => marker.setMap(null));
      linesRef.current.forEach(line => line.setMap(null));
      markersRef.current = [];
      linesRef.current = [];
      
      // If no results, stop here
      if (results.length === 0) return;
      
      // Create bounds to fit all points
      const bounds = new google.maps.LatLngBounds();
      
      // Add markers and lines for each guess
      results.forEach((result, index) => {
        // Get the user's guessed location
        const guessedLocation = result.locationGuess;
        
        // Get the actual location from the result
        const actualLocation = result.actualLocation;
        
        if (!actualLocation) {
          console.error("Missing actual location for result:", result);
          return;
        }
        
        // Add guessed location marker with custom styling and label
        const guessMarker = createCustomMarker(
          guessedLocation,
          map,
          true,
          `Round ${index + 1} - Your Guess`,
          (index + 1).toString()
        );
        
        markersRef.current.push(guessMarker);
        bounds.extend(guessedLocation);
        
        // Add actual location marker with custom styling
        const actualMarker = createCustomMarker(
          actualLocation,
          map,
          false,
          `Round ${index + 1} - Actual Location`
        );
          
        // Line connecting the two
        const line = new google.maps.Polyline({
          path: [guessedLocation, actualLocation],
          geodesic: true,
          strokeColor: "#ea384c",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map
        });
          
        markersRef.current.push(actualMarker);
        linesRef.current.push(line);
        bounds.extend(actualLocation);
      });
      
      // Fit the map to show all points with some padding
      map.fitBounds(bounds, 50);
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
    }
  }, [results, mapRef]);

  // Load Google Maps API
  useEffect(() => {
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
  }, []);

  // Cleanup markers and lines on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      linesRef.current.forEach(line => line.setMap(null));
    };
  }, []);
  
  // Handle the exit button click to go back to home page
  const handleExitClick = () => {
    console.log('🏠 Navigating to home page (without page reload)...');
    onGoHome();
  };
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div 
      className="relative w-full h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Main map area with actual Google Maps */}
      <motion.div 
        className="relative w-full bg-[#eee9da] h-screen rounded-xl overflow-hidden"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
      >
        
        {/* Left side container with score and results */}
        <motion.div 
          className="absolute left-8 bottom-32 space-y-3 z-10"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
        >
          {/* Score display with timing info */}
          <motion.div 
            className="bg-[#ea384c] text-white py-3 px-6 rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div 
              className="text-4xl font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: "backOut", delay: 1.2 }}
            >
              {Math.round(finalScore)} <span className="text-base font-normal opacity-80">/50,000</span>
            </motion.div>
            {isTimedMode && (
              <motion.div 
                className="text-sm opacity-80 flex items-center mt-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
              >
                <Timer className="mr-1" size={14} />
                Total time: {formatTime(totalTimeUsed)}
              </motion.div>
            )}
          </motion.div>
          
          {/* Round results */}
          {results.map((result, index) => (
            <motion.div 
              key={index} 
              className="flex items-center bg-[#ea384c]/95 text-white rounded-lg overflow-hidden shadow-lg backdrop-blur-sm"
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                ease: "easeOut", 
                delay: 1.0 + (index * 0.1) 
              }}
              whileHover={{ scale: 1.02, x: 5 }}
            >
              <motion.div 
                className="text-white p-3 flex items-center justify-center w-12 font-bold text-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  duration: 0.4, 
                  ease: "backOut", 
                  delay: 1.2 + (index * 0.1) 
                }}
              >
                {index + 1})
              </motion.div>
              <div className="flex items-center p-2 pl-3 pr-4">
                <div className="flex flex-col mr-3">
                  <motion.div 
                    className="font-bold text-lg text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 + (index * 0.1) }}
                  >
                    {Math.round(getScaledScore(result))} pts
                  </motion.div>
                  <motion.div 
                    className="text-sm opacity-80"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4 + (index * 0.1) }}
                  >
                    {result.actualYear ? getYearsDiff(result.actualYear, result.yearGuess) : `Year: ${result.yearGuess}`} 
                    {result.actualLocation ? ` - ${Math.round(
                      calculateDistance(
                        result.locationGuess.lat, result.locationGuess.lng,
                        result.actualLocation.lat, result.actualLocation.lng
                      )
                    )} mi` : ''}
                    {isTimedMode && result.timeUsed && (
                      <div className="text-xs opacity-70">
                        {formatTime(result.timeUsed)}
                      </div>
                    )}
                  </motion.div>
                </div>
                <motion.div 
                  className="w-12 h-12 rounded-md overflow-hidden border-2 border-white/30 flex-shrink-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + (index * 0.1) }}
                  whileHover={{ scale: 1.1 }}
                >
                  <img 
                    src={getImageUrl(result)} 
                    alt={`Round ${index + 1}`} 
                    className="w-full h-full object-cover object-right"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Exit button - now leads to home page */}
        <motion.div 
          className="absolute right-8 top-8 z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-8 py-3 rounded-lg shadow-lg font-semibold text-lg transition-all duration-200" 
              onClick={handleExitClick}
            >
              Back to Home
            </Button>
          </motion.div>
        </motion.div>
        
        {/* Google Maps Component */}
        <motion.div 
          ref={mapRef} 
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        />
        
        {/* Loading state when map is not ready */}
        <AnimatePresence>
          {!mapReady && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center bg-[#eee9da]"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="text-center p-6 bg-white/95 rounded-lg shadow-lg"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Navigation className="mb-3 mx-auto text-[#ea384c]" size={32} />
                </motion.div>
                <p className="text-gray-700 font-medium">Loading map view...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Define Google Maps types
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default GameSummary;
