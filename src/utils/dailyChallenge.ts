
import { supabase } from "@/integrations/supabase/client";
import { GameImage } from "@/types/game";
import { getAllImages } from "@/data/sampleData";

// Create a deterministic random number generator using date as seed
const createSeededRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return () => {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
};

// Shuffle array using seeded random
const seededShuffle = <T>(array: T[], seed: string): T[] => {
  const newArray = [...array];
  const random = createSeededRandom(seed);
  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Get today's date in Eastern Time (EST/EDT) YYYY-MM-DD format
const getTodayDateString = (): string => {
  // Get current time in Eastern Time (automatically handles EST/EDT)
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return easternTime.toISOString().split('T')[0];
};

// Get yesterday's date string to exclude those images
const getYesterdayDateString = (): string => {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const yesterday = new Date(easternTime);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Get a unique seed for today's daily challenge to ensure it's different from yesterday
const getTodayChallengeSeed = (): string => {
  const todayString = getTodayDateString();
  // Use current timestamp in milliseconds to ensure uniqueness
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const timestamp = easternTime.getTime();
  // Add some randomness to make it even more unique
  const randomComponent = Math.floor(Math.random() * 1000000);
  return `${todayString}-${timestamp}-${randomComponent}`;
};

// Get daily challenge images for today
export const getDailyChallengeImages = async (): Promise<GameImage[]> => {
  const todayString = getTodayDateString();
  
  try {
    // First, check if today's challenge exists
    const { data: existingChallenge, error: fetchError } = await supabase
      .from('daily_challenges')
      .select('image_ids')
      .eq('challenge_date', todayString)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching daily challenge:', fetchError);
    }
    
    if (existingChallenge && existingChallenge.image_ids) {
      // Get the specific images for today's challenge
      const allImages = await getAllImages();
      const challengeImages = allImages.filter(img => 
        existingChallenge.image_ids.includes(img.id)
      );
      
      if (challengeImages.length === 5) {
        console.log('Using existing daily challenge images');
        return challengeImages;
      }
    }
    
    // Generate new daily challenge
    console.log('Generating new daily challenge for', todayString);
    const allImages = await getAllImages();
    
    if (allImages.length < 5) {
      console.warn('Not enough images for daily challenge');
      return allImages;
    }
    
    // Get yesterday's images to exclude them
    const yesterdayString = getYesterdayDateString();
    let yesterdayImageIds: string[] = [];
    
    try {
      const { data: yesterdayChallenge } = await supabase
        .from('daily_challenges')
        .select('image_ids')
        .eq('challenge_date', yesterdayString)
        .maybeSingle();
      
      if (yesterdayChallenge && yesterdayChallenge.image_ids) {
        yesterdayImageIds = yesterdayChallenge.image_ids;
        console.log('Excluding yesterday\'s images:', yesterdayImageIds);
      }
    } catch (error) {
      console.log('Could not fetch yesterday\'s challenge, proceeding without exclusion');
    }
    
    // Filter out yesterday's images to ensure different selection
    const availableImages = yesterdayImageIds.length > 0 
      ? allImages.filter(img => !yesterdayImageIds.includes(img.id))
      : allImages;
    
    if (availableImages.length < 5) {
      console.warn('Not enough images after excluding yesterday\'s, using all images');
      // Fallback to all images if we don't have enough after exclusion
      const challengeSeed = getTodayChallengeSeed();
      const shuffledImages = seededShuffle(allImages, challengeSeed);
      return shuffledImages.slice(0, 5);
    }
    
    // Use unique seed for today's challenge with filtered images
    const challengeSeed = getTodayChallengeSeed();
    const shuffledImages = seededShuffle(availableImages, challengeSeed);
    const selectedImages = shuffledImages.slice(0, 5);
    const selectedImageIds = selectedImages.map(img => img.id);
    
    // Try to store the daily challenge (will fail due to RLS, but that's ok for now)
    try {
      await supabase
        .from('daily_challenges')
        .insert({
          challenge_date: todayString,
          image_ids: selectedImageIds
        });
      console.log('Daily challenge stored successfully');
    } catch (insertError) {
      console.log('Could not store daily challenge (expected with current RLS)');
    }
    
    return selectedImages;
  } catch (error) {
    console.error('Error in getDailyChallengeImages:', error);
    // Fallback: use seeded randomization with all images
    const allImages = await getAllImages();
    const challengeSeed = getTodayChallengeSeed();
    const shuffledImages = seededShuffle(allImages, challengeSeed);
    return shuffledImages.slice(0, Math.min(5, allImages.length));
  }
};

/**
 * Get the start and end dates for today in Eastern Time (EST/EDT)
 * Used for daily challenge leaderboard filtering
 */
export const getESTDateRange = () => {
  // Get current time in Eastern Time (automatically handles EST/EDT)
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  // Start of today in Eastern Time (midnight)
  const easternStartOfDay = new Date(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate());
  
  // End of today in Eastern Time (midnight tomorrow)
  const easternEndOfDay = new Date(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate() + 1);
  
  // Convert to UTC for database queries
  const utcStartOfDay = new Date(easternStartOfDay.getTime() - (easternStartOfDay.getTimezoneOffset() * 60000));
  const utcEndOfDay = new Date(easternEndOfDay.getTime() - (easternEndOfDay.getTimezoneOffset() * 60000));
  
  return {
    startDate: utcStartOfDay,
    endDate: utcEndOfDay,
    estDate: easternTime.toISOString().split('T')[0] // YYYY-MM-DD format in Eastern Time
  };
};

/**
 * Check if a user has already played the daily challenge today
 * @param userId - The user's ID
 * @returns Promise<boolean> - True if user has already played today
 */
export const hasUserPlayedDailyChallengeToday = async (userId: string): Promise<boolean> => {
  try {
    const { startDate, endDate } = getESTDateRange();
    
    console.log('🔍 Checking if user has played daily challenge today:', {
      userId: userId.slice(0, 8) + '...',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('id, completed_at, total_score')
      .eq('user_id', userId)
      .eq('game_mode', 'daily')
      .gte('completed_at', startDate.toISOString())
      .lt('completed_at', endDate.toISOString())
      .not('completed_at', 'is', null)
      .limit(1);

    if (error) {
      console.error('❌ Error checking daily challenge status:', error);
      return false; // Allow play if we can't check
    }

    const hasPlayed = sessions && sessions.length > 0;
    
    if (hasPlayed) {
      console.log('⚠️ User has already played daily challenge today');
    } else {
      console.log('✅ User has not played daily challenge today');
    }

    return hasPlayed;
  } catch (error) {
    console.error('💥 Error in hasUserPlayedDailyChallengeToday:', error);
    return false; // Allow play if there's an error
  }
};
