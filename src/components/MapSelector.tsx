import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { GlobeIcon } from 'lucide-react';
import { loadGoogleMapsScript, createOptimizedMap } from '@/utils/mapUtils';

interface MapSelectorProps {
  onLocationSelected: (lat: number, lng: number) => void;
  isDisabled?: boolean;
  actualLocation?: { lat: number; lng: number } | null;
  guessedLocation?: { lat: number; lng: number } | null;
}

const MapSelector: React.FC<MapSelectorProps> = ({ 
  onLocationSelected, 
  isDisabled = false,
  actualLocation = null,
  guessedLocation = null
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const guessedMarkerRef = useRef<google.maps.Marker | null>(null);
  const actualMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ lat: number, lng: number } | null>(null);
  const mouseMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  
  // Store the current guessed location in a ref to persist across re-renders
  const currentGuessedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Function to update guessed marker - stabilized dependencies
  const updateGuessedMarker = useCallback((location: { lat: number; lng: number }) => {
    if (!mapReady || !googleMapRef.current) return;

    // Check if location actually changed to avoid unnecessary updates
    if (currentGuessedLocationRef.current && 
        currentGuessedLocationRef.current.lat === location.lat && 
        currentGuessedLocationRef.current.lng === location.lng) {
      return; // Location hasn't changed, don't update marker
    }

    // Store the new location
    currentGuessedLocationRef.current = location;

    // Remove existing guessed marker
    if (guessedMarkerRef.current) {
      guessedMarkerRef.current.setMap(null);
      guessedMarkerRef.current = null;
    }

    // Add new guessed marker with custom blue styling (same as RoundResults)
    guessedMarkerRef.current = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: googleMapRef.current,
      title: "Your guess",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: "#ffffff",
        strokeOpacity: 1
      },
      zIndex: 10 // Higher z-index to ensure it's always visible
    });

    // Don't draw line here - let a separate effect handle line drawing
    // This prevents the marker from being recreated when actualLocation changes
  }, [mapReady]); // Removed actualLocation dependency

  // Memoize the click handler to prevent constant re-renders
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.latLng || isDisabled) return;
    
    const position = { 
      lat: event.latLng.lat(), 
      lng: event.latLng.lng() 
    };
    
    // Add visual feedback with temporary click marker
    if (googleMapRef.current && !isDisabled) {
      // Create temporary click feedback marker
      const clickFeedbackMarker = new google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: "#00ff00",
          fillOpacity: 0.6,
          strokeWeight: 2,
          strokeColor: "#ffffff",
          strokeOpacity: 1
        },
        animation: google.maps.Animation.DROP,
        zIndex: 20 // Very high to show on top
      });

      // Remove click feedback marker after animation
      setTimeout(() => {
        clickFeedbackMarker.setMap(null);
      }, 800);
    }
    
    // Don't clear the mouse cursor marker - let it continue following the mouse
    // The guessed marker will be placed/updated and the cursor will keep following
    
    if (onLocationSelected && !isDisabled) {
      onLocationSelected(position.lat, position.lng);
      // The guessed marker will be updated via the useEffect when guessedLocation prop changes
    }
  }, [onLocationSelected, isDisabled]);

  // Function to initialize the map
  const initMap = useCallback(() => {
    if (!mapRef.current || googleMapRef.current || !window.google?.maps) return;

    try {
      // Use optimized map configuration for better performance
      const map = createOptimizedMap(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2
      });

      googleMapRef.current = map;

      // Add click listener once
      map.addListener('click', handleMapClick);

      // If not disabled, set up event listeners for map movement
      if (!isDisabled) {
        map.addListener('mousemove', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const position = { 
              lat: event.latLng.lat(), 
              lng: event.latLng.lng() 
            };
            setCursorPosition(position);
            
            // Always show cursor marker (blue follower) regardless of guess status
            // Update cursor marker position
            if (mouseMarkerRef.current) {
              mouseMarkerRef.current.setPosition(position);
            } else {
              mouseMarkerRef.current = new google.maps.Marker({
                position: position,
                map: map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: "#0000ff",
                  fillOpacity: 0.4,
                  strokeWeight: 1,
                  strokeColor: "#0000ff"
                },
                clickable: false,
                zIndex: 1 // Lower z-index so guessed marker is on top
              });
            }
          }
        });

        map.addListener('mouseout', () => {
          setCursorPosition(null);
          if (mouseMarkerRef.current) {
            mouseMarkerRef.current.setMap(null);
            mouseMarkerRef.current = null;
          }
        });
      }

      setMapReady(true);
      
      // Don't initialize markers here - let the useEffect hooks handle them
      // This prevents the map from reinitializing when locations change
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
    }
  }, [handleMapClick, isDisabled]);

  // Load Google Maps Script
  useEffect(() => {
    if (window.google?.maps) {
      setIsScriptLoaded(true);
      return;
    }
    
    loadGoogleMapsScript()
      .then(() => {
        setIsScriptLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
  }, []);

  // Initialize map when script is loaded
  useEffect(() => {
    if (isScriptLoaded && mapRef.current) {
      initMap();
    }
    
    // Cleanup function
    return () => {
      if (guessedMarkerRef.current) {
        guessedMarkerRef.current.setMap(null);
      }
      if (actualMarkerRef.current) {
        actualMarkerRef.current.setMap(null);
      }
      if (mouseMarkerRef.current) {
        mouseMarkerRef.current.setMap(null);
      }
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [isScriptLoaded, isDisabled, initMap]);

  // Draw a line between two markers and display distance
  const drawLineBetweenMarkers = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!googleMapRef.current) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Draw new polyline with consistent styling
    polylineRef.current = new google.maps.Polyline({
      path: [from, to],
      geodesic: true,
      strokeColor: '#ea384c',
      strokeOpacity: 0.8,
        strokeWeight: 3,
      map: googleMapRef.current
    });
  }, []);

  // Function to update actual marker
  const updateActualMarker = useCallback((location: { lat: number; lng: number }) => {
    if (!mapReady || !googleMapRef.current) return;

    // Remove existing actual marker
    if (actualMarkerRef.current) {
      actualMarkerRef.current.setMap(null);
      actualMarkerRef.current = null;
    }

    // Add new actual marker with custom red styling (same as RoundResults)
    actualMarkerRef.current = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: googleMapRef.current,
      title: "Actual location",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#ea384c",
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: "#ffffff",
        strokeOpacity: 1
      },
      zIndex: 15 // Highest z-index so actual location is always visible on top
    });

    // If we have both markers, draw a line between them
    if (guessedLocation && guessedMarkerRef.current) {
      drawLineBetweenMarkers(guessedLocation, location);
    }

    // Center the map to show both markers if guessed location exists
    if (guessedLocation) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: location.lat, lng: location.lng });
      bounds.extend({ lat: guessedLocation.lat, lng: guessedLocation.lng });
      googleMapRef.current.fitBounds(bounds, 50); // 50px padding
    } else {
      // Just center on actual location
      googleMapRef.current.panTo({ lat: location.lat, lng: location.lng });
      googleMapRef.current.setZoom(4);
    }
  }, [mapReady, guessedLocation, drawLineBetweenMarkers]);

  // Update markers when locations change - important to keep this separate from other effects
  useEffect(() => {
    if (mapReady && guessedLocation) {
      updateGuessedMarker(guessedLocation);
    } else if (mapReady && !guessedLocation) {
      // Clear the marker and ref when location is removed
      if (guessedMarkerRef.current) {
        guessedMarkerRef.current.setMap(null);
        guessedMarkerRef.current = null;
      }
      currentGuessedLocationRef.current = null;
    }
  }, [guessedLocation, mapReady, updateGuessedMarker]);

  useEffect(() => {
    if (mapReady && actualLocation) {
      updateActualMarker(actualLocation);
    }
  }, [actualLocation, mapReady, updateActualMarker]);

  // Separate effect for drawing lines between markers
  useEffect(() => {
    if (mapReady && guessedLocation && actualLocation && guessedMarkerRef.current && actualMarkerRef.current) {
      drawLineBetweenMarkers(guessedLocation, actualLocation);
    }
  }, [mapReady, guessedLocation, actualLocation, drawLineBetweenMarkers]);

  return (
    <Card className="w-full h-full overflow-hidden flex flex-col">
      <div 
        className="map-container relative flex-grow"
        style={{ opacity: isDisabled ? 0.8 : 1 }}
      >
        <div 
          ref={mapRef} 
          className={`w-full h-full rounded-lg ${!isDisabled ? 'cursor-pointer' : 'cursor-default'}`}
        />
        
        {/* Loading indicator */}
        {!mapReady && (
          <div className="flex items-center justify-center h-full bg-slate-100 absolute top-0 left-0 w-full">
            <div className="flex items-center space-x-2">
              <GlobeIcon className="animate-spin" />
              <span>Loading map...</span>
            </div>
          </div>
        )}
        
        {/* Enhanced mouse position coordinates with better styling */}
        {!isDisabled && cursorPosition && (
          <div className="absolute bottom-4 left-4 z-10 bg-black/75 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg backdrop-blur-sm border border-white/20">
            <div className="flex items-center space-x-2">
              <span className="text-blue-300">📍</span>
              <div>
                <div className="text-xs text-gray-300">Coordinates</div>
                <div className="font-semibold">
                  {cursorPosition.lat.toFixed(4)}°, {cursorPosition.lng.toFixed(4)}°
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Click instruction overlay */}
        {!isDisabled && !guessedLocation && (
          <div className="absolute top-4 right-4 z-10 bg-[#ea384c]/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm animate-pulse">
            🎯 Click anywhere on the map to place your guess
          </div>
        )}
        
        {/* Guess confirmation overlay */}
        {!isDisabled && guessedLocation && (
          <div className="absolute top-4 right-4 z-10 bg-green-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg backdrop-blur-sm border-2 border-white/30">
            ✅ Location selected! Click elsewhere to move it or press Enter to submit
          </div>
        )}
        
        {/* Only show distance info when disabled and both locations exist */}
        {isDisabled && guessedLocation && actualLocation && (
          <div className="absolute bottom-0 left-0 w-full bg-white/90 p-3 text-center backdrop-blur-sm border-t border-gray-200">
            <p className="font-medium text-gray-800">
              Your guess was <span className="font-bold text-[#ea384c]">{getDistanceBetweenPoints(guessedLocation, actualLocation).toFixed(1)} km</span> from the actual location
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// Calculate distance between two points in km using the Haversine formula
const getDistanceBetweenPoints = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) => {
  const R = 6371; // Earth's radius in km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Define Google Maps types
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default MapSelector;
