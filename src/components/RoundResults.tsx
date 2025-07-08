import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuessResult } from '@/types/game';
import { Navigation, Home, ArrowRight } from 'lucide-react';
import { loadGoogleMapsScript, cleanupMapElements, createOptimizedMap, createMarker, createPolyline } from '@/utils/mapUtils';
import { ENV_CONFIG } from '@/constants/gameConstants';

interface RoundResultsProps {
  result: GuessResult;
  onNext?: () => void;
  onGoHome: () => void;
  isLastRound: boolean;
  roundNumber: number;
  totalRounds: number;
  imageDescription?: string;
  multiplayerMode?: boolean;
  isHost?: boolean;
}

const RoundResults: React.FC<RoundResultsProps> = ({ 
  result, 
  onNext, 
  onGoHome,
  isLastRound, 
  roundNumber, 
  totalRounds,
  imageDescription,
  multiplayerMode = false,
  isHost = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const animationRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

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

  // Get distance for display
  const distanceOff = result.actualLocation 
    ? calculateDistance(
        result.locationGuess.lat, result.locationGuess.lng,
        result.actualLocation.lat, result.actualLocation.lng
      )
    : 0;

  // Use consistent scoring - prefer display scores when available
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

  const totalScore = getScaledScore(result);
  const yearScore = result.displayYearScore || 0;
  const locationScore = result.displayLocationScore || 0;
  const timeBonus = result.timeBonus || 0;

  // Clear all markers and polylines
  const clearMapElements = () => {
    // Cancel any running animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
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

  // Initialize Google Maps
  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return;
    
    try {
      // Use optimized map configuration for better performance
      const map = createOptimizedMap(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2
      });
      
      googleMapRef.current = map;
      setMapReady(true);
      
      // Clear existing elements
      clearMapElements();
      
      // If no actual location, stop here
      if (!result.actualLocation) return;
      
      // Add guessed location marker with custom blue styling
      const guessedMarker = createCustomMarker(
        result.locationGuess,
        map,
        true,
        "Your Guess"
      );
      markersRef.current.push(guessedMarker);
      
      // Add actual location marker with custom red styling
      const actualMarker = createCustomMarker(
        result.actualLocation,
        map,
        false,
        "Actual Location"
      );
      markersRef.current.push(actualMarker);
      
      // Create animated dotted line symbol
      const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        strokeColor: "#ea384c",
        strokeWeight: 3,
        scale: 1.5
      };

      // Draw animated dotted line between the two points
      const polyline = new google.maps.Polyline({
        path: [result.locationGuess, result.actualLocation],
        geodesic: true,
        strokeOpacity: 0,
        strokeWeight: 0,
        icons: [{
          icon: lineSymbol,
          offset: '0',
          repeat: '20px'
        }],
        map
      });

      polylinesRef.current.push(polyline);

      // Animate the dotted line with requestAnimationFrame
      let offset = 0;
      const animatePolyline = () => {
        offset = (offset + 0.05) % 100;
        const icons = polyline.get('icons');
        if (icons && icons[0] && polylinesRef.current.includes(polyline)) {
          icons[0].offset = offset + '%';
          polyline.set('icons', icons);
          animationRef.current = requestAnimationFrame(animatePolyline);
        }
      };

      // Start the animation
      animationRef.current = requestAnimationFrame(animatePolyline);
      
      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(result.locationGuess);
      bounds.extend(result.actualLocation);
      map.fitBounds(bounds, 100);
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
    }
  }, [result]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMapElements();
    };
  }, []);

  // Animate progress bar on mount
  useEffect(() => {
    const targetWidth = (roundNumber / totalRounds) * 100;
    const duration = 2000; // 2 seconds for smoother animation
    const startTime = Date.now();
    
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smoother ease-out effect
      const easeOut = 1 - Math.pow(1 - progress, 4);
      setProgressWidth(targetWidth * easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };
    
    // Reduced delay for more immediate start
    const timer = setTimeout(() => {
      requestAnimationFrame(animateProgress);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [roundNumber, totalRounds]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="w-full min-h-screen bg-[#eee9da] p-3 lg:p-6"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <button 
          onClick={onGoHome}
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
            Round {roundNumber} of {totalRounds}
          </h1>
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl bg-white rounded-full h-3 lg:h-4 mx-auto shadow-inner">
            <div 
              className="bg-gradient-to-r from-[#ea384c] to-[#d32f42] h-3 lg:h-4 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="text-sm lg:text-base text-gray-600 mt-2 font-medium font-poppins">
            {Math.round(progressWidth)}% Complete
          </div>
        </div>

        {/* Next button - only show for host in multiplayer mode, or always in single player */}
        {(!multiplayerMode || isHost) && onNext ? (
          <Button 
            onClick={onNext}
            className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 lg:px-8 xl:px-10 py-3 lg:py-4 xl:py-5 rounded-xl text-base lg:text-lg xl:text-xl font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl font-poppins"
          >
            {isLastRound ? 'Final Results' : (multiplayerMode ? 'Next Round (Host)' : 'Next Round')}
          </Button>
        ) : multiplayerMode && !isHost ? (
          <div className="bg-gray-200 text-gray-600 px-6 lg:px-8 xl:px-10 py-3 lg:py-4 xl:py-5 rounded-xl text-base lg:text-lg xl:text-xl font-bold shadow-xl font-poppins text-center">
            {isLastRound ? 'Waiting for final results...' : 'Waiting for host to continue...'}
          </div>
        ) : null}
      </div>

      {/* Full width container for better screen usage */}
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-5">
        {/* Prominent Distance Display */}
        <div className="text-center px-4">
          <p className="text-xl lg:text-3xl xl:text-4xl text-gray-800 font-work">
            Your guess was <span className="font-bold text-[#ea384c] text-2xl lg:text-4xl xl:text-5xl font-anton">{Math.round(distanceOff).toLocaleString()} miles</span> from the correct location
          </p>
          <p className="text-base lg:text-lg xl:text-xl text-gray-600 mt-2 font-work">
            You were <span className="font-bold text-[#ea384c] font-anton">{Math.abs(result.yearGuess - result.actualYear)} years</span> off
          </p>
        </div>

        {/* Always Centered Score Cards with Better Screen Usage */}
        <div className="flex justify-center px-2 lg:px-4">
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 xl:gap-5 max-w-5xl">
            {/* Total Score - prominent */}
            <div className="bg-[#ea384c] text-white rounded-xl p-4 lg:p-5 xl:p-6 text-center shadow-lg min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]">
              <div className="text-sm lg:text-base xl:text-lg opacity-90 font-medium mb-1 font-inter">Total</div>
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold font-space">{Math.round(totalScore)}</div>
              <div className="text-xs lg:text-sm opacity-75 font-inter">points</div>
            </div>

            {/* Year Score */}
            <div className="bg-white rounded-xl p-4 lg:p-5 xl:p-6 text-center shadow-lg border-2 border-[#ea384c]/20 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]">
              <div className="text-sm lg:text-base xl:text-lg text-gray-600 mb-1 font-inter">Year</div>
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold text-[#ea384c] font-space">{Math.round(yearScore)}</div>
              <div className="text-xs lg:text-sm text-gray-500 font-inter">/5000</div>
            </div>

            {/* Location Score */}
            <div className="bg-white rounded-xl p-4 lg:p-5 xl:p-6 text-center shadow-lg border-2 border-[#ea384c]/20 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]">
              <div className="text-sm lg:text-base xl:text-lg text-gray-600 mb-1 font-inter">Location</div>
              <div className="text-2xl lg:text-3xl xl:text-4xl font-bold text-[#ea384c] font-space">{Math.round(locationScore)}</div>
              <div className="text-xs lg:text-sm text-gray-500 font-inter">/5000</div>
            </div>

            {/* Year Comparison */}
            <div className="bg-gray-50 rounded-xl p-4 lg:p-5 xl:p-6 text-center shadow-lg min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]">
              <div className="text-sm lg:text-base xl:text-lg text-gray-600 mb-1 font-inter">Year Guess</div>
              <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 font-space">{result.yearGuess}</div>
              <div className="text-xs lg:text-sm text-gray-500 font-inter">vs {result.actualYear}</div>
            </div>

            {/* Time Bonus (if applicable) - always in the flow */}
            {timeBonus > 0 && (
              <div className="bg-yellow-400 text-yellow-900 rounded-xl p-4 lg:p-5 xl:p-6 text-center shadow-lg min-w-[140px] lg:min-w-[160px] xl:min-w-[180px]">
                <div className="text-sm lg:text-base xl:text-lg font-medium mb-1 font-inter">Time Bonus</div>
                <div className="text-2xl lg:text-3xl xl:text-4xl font-bold font-anton">+{Math.round(timeBonus)}</div>
                <div className="text-xs lg:text-sm opacity-75 font-inter">bonus</div>
              </div>
            )}
          </div>
        </div>

        {/* Description - more prominent */}
        {imageDescription && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 lg:p-6 xl:p-8 shadow-lg border border-[#ea384c]/30 mx-2 lg:mx-6">
            <p className="text-gray-800 text-center leading-relaxed text-base lg:text-lg xl:text-xl font-manrope">
              {imageDescription}
            </p>
          </div>
        )}

        {/* Image and Map - Larger for better screen usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 xl:gap-8 px-2 lg:px-4">
          {/* Map */}
          <Card className="relative w-full aspect-[4/3] lg:aspect-[5/4] xl:aspect-[3/2] overflow-hidden shadow-xl border-2 border-[#ea384c]/30">
            <div className="absolute inset-0">
              <div 
                ref={mapRef} 
                className="w-full h-full rounded-lg"
              />
              
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Navigation className="animate-spin mb-2 mx-auto text-[#ea384c]" size={32} />
                    <p className="text-gray-700 text-sm lg:text-base">Loading map...</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Image */}
          <div className="relative w-full aspect-[4/3] lg:aspect-[5/4] xl:aspect-[3/2] bg-white rounded-xl shadow-xl overflow-hidden border-2 border-[#ea384c]/30">
            <div className="absolute inset-0 flex items-center justify-center p-3 lg:p-4 xl:p-6">
              <img 
                src={result.imageUrl} 
                alt="Historical image" 
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517022812141-23620dba5c23';
                }}
              />
            </div>
          </div>
        </div>
      </div>
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

export default RoundResults;
