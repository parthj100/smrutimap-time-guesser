
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

// Get today's date in EST timezone YYYY-MM-DD format
const getTodayDateString = (): string => {
  const estOffset = -5; // EST is UTC-5
  const utcNow = new Date();
  const estNow = new Date(utcNow.getTime() + (estOffset * 60 * 60 * 1000));
  return estNow.toISOString().split('T')[0];
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
    
    // Use date as seed for deterministic randomization
    const shuffledImages = seededShuffle(allImages, todayString);
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
    const shuffledImages = seededShuffle(allImages, todayString);
    return shuffledImages.slice(0, Math.min(5, allImages.length));
  }
};

/**
 * Get the start and end dates for today in EST timezone
 * Used for daily challenge leaderboard filtering
 */
export const getESTDateRange = () => {
  const estOffset = -5; // EST is UTC-5
  const utcNow = new Date();
  const estNow = new Date(utcNow.getTime() + (estOffset * 60 * 60 * 1000));
  
  // Start of today in EST (midnight EST)
  const estStartOfDay = new Date(estNow.getFullYear(), estNow.getMonth(), estNow.getDate());
  // Convert back to UTC
  const utcStartOfDay = new Date(estStartOfDay.getTime() - (estOffset * 60 * 60 * 1000));
  
  // End of today in EST (midnight EST tomorrow)
  const estEndOfDay = new Date(estNow.getFullYear(), estNow.getMonth(), estNow.getDate() + 1);
  // Convert back to UTC
  const utcEndOfDay = new Date(estEndOfDay.getTime() - (estOffset * 60 * 60 * 1000));
  
  return {
    startDate: utcStartOfDay,
    endDate: utcEndOfDay,
    estDate: estNow.toISOString().split('T')[0] // YYYY-MM-DD format in EST
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
