// Re-export scoring functions from the new scoring system
export { 
  calculateYearScore, 
  calculateLocationScore, 
  calculateTotalScore,
  calculateCompleteScore,
  calculateFinalScore,
  getScoreFeedback,
  getFinalScoreFeedback,
  SCORE_CONSTANTS
} from './scoringSystem';

// Calculate distance between two points using the Haversine formula (kept for compatibility)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Shuffle an array (for randomizing images) - kept for compatibility
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Format year for display
export const formatYear = (year: number): string => {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  } else {
    return `${year} CE`;
  }
};

// Google Drive URL converter utility
export const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;
  
  // Check if it's a Google Drive URL that needs conversion
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  const driveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  
  let fileId = null;
  
  if (driveFileMatch) {
    fileId = driveFileMatch[1];
  } else if (driveOpenMatch) {
    fileId = driveOpenMatch[1];
  } else if (driveUcMatch) {
    fileId = driveUcMatch[1];
  }
  
  if (fileId) {
    // Use the thumbnail method which still works as of 2024
    // sz=s4000 sets max size - can be increased for higher resolution
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s4000`;
    console.log(`🔄 Converting Google Drive URL: ${url.substring(0, 50)}... → ${convertedUrl}`);
    return convertedUrl;
  }
  
  // Return original URL if it's not a Google Drive URL that needs conversion
  return url;
};

// Transform database response to GameImage interface with Google Drive URL conversion
export const transformDatabaseImageToGameImage = (item: {
  id: string;
  image_url: string;
  year: number;
  location_lat: number;
  location_lng: number;
  location_name: string;
  description: string;
}) => {
  return {
    id: item.id,
    image_url: convertGoogleDriveUrl(item.image_url), // Convert Google Drive URLs
    year: item.year,
    location: {
      lat: item.location_lat,
      lng: item.location_lng,
      name: item.location_name
    },
    description: item.description
  };
};
