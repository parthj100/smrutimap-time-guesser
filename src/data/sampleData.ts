import { GameImage } from "../types/game";
import { supabase } from "@/integrations/supabase/client";

// Google Drive URL converter function
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return url;
  
  // Check if it's a Google Drive URL that needs conversion
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  
  if (driveFileMatch) {
    const fileId = driveFileMatch[1];
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}`;
    console.log(`🔄 Converting Google Drive URL: ${url.substring(0, 50)}... → ${convertedUrl}`);
    return convertedUrl;
  }
  
  if (driveOpenMatch) {
    const fileId = driveOpenMatch[1];
    const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}`;
    console.log(`🔄 Converting Google Drive URL: ${url.substring(0, 50)}... → ${convertedUrl}`);
    return convertedUrl;
  }
  
  // Return original URL if it's not a Google Drive URL that needs conversion
  return url;
};

// Helper function to fetch images from Supabase with enhanced logging
export const fetchImagesFromSupabase = async (): Promise<GameImage[]> => {
  console.log('🔍 Starting fetchImagesFromSupabase...');
  
  try {
    console.log('📡 Making Supabase query to game_images table...');
    const { data, error } = await supabase
      .from('game_images')
      .select('*');
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      console.error('Error details:', { code: error.code, message: error.message, details: error.details });
      return [];
    }
    
    console.log('✅ Supabase query successful, raw data:', data);
    console.log(`📊 Retrieved ${data?.length || 0} records from database`);
    
    if (!data || data.length === 0) {
      console.warn('⚠️ No data returned from game_images table');
      return [];
    }
    
    // Transform the data to match our GameImage interface
    const transformedData = data.map((item: { 
      id: string; 
      image_url: string; 
      year: number; 
      location_lat: number; 
      location_lng: number; 
      location_name: string; 
      description: string; 
    }) => {
      console.log('🔄 Transforming item:', item);
      
      // Convert Google Drive URLs to direct image URLs
      const convertedImageUrl = convertGoogleDriveUrl(item.image_url);
      
      return {
        id: item.id,
        image_url: convertedImageUrl, // Use converted URL
        year: item.year,
        location: {
          lat: item.location_lat,
          lng: item.location_lng,
          name: item.location_name
        },
        description: item.description
      };
    });
    
    console.log('✨ Successfully transformed data:', transformedData);
    return transformedData;
    
  } catch (error) {
    console.error('💥 Unexpected error in fetchImagesFromSupabase:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return [];
  }
};

// Function to get all images with retry logic
export const getAllImages = async (): Promise<GameImage[]> => {
  console.log('🎯 getAllImages called');
  
  try {
    const images = await fetchImagesFromSupabase();
    console.log(`📋 getAllImages returning ${images.length} images`);
    return images;
  } catch (error) {
    console.error('❌ Error in getAllImages:', error);
    return [];
  }
};

// Enhanced shuffle function using Fisher-Yates algorithm with crypto random
const cryptoShuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  
  // Use crypto.getRandomValues for better randomization if available
  const getRandomValue = () => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    }
    return Math.random();
  };
  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(getRandomValue() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Function to get a random subset of images for the game with enhanced logging
export const getRandomGameImages = async (count: number = 5): Promise<GameImage[]> => {
  console.log('🎲 getRandomGameImages called with count:', count);
  
  const allImages = await getAllImages();
  console.log(`📦 Retrieved ${allImages.length} total images for random selection`);
  
  if (allImages.length === 0) {
    console.error('🚫 No images available from database for random game');
    return [];
  }
  
  // Use all images from database without filtering
  console.log(`🎯 Using all ${allImages.length} images from database (ImgBB, BAPS.org, and other sources)`);
  
  // Always shuffle the entire array first
  const shuffledImages = cryptoShuffleArray(allImages);
  console.log('🔀 All images shuffled successfully');
  
  // If we don't have enough images, return all available images shuffled
  if (shuffledImages.length <= count) {
    console.log(`📤 Returning all ${shuffledImages.length} available images (requested ${count})`);
    return shuffledImages;
  }
  
  // Otherwise, pick a random subset and shuffle again for extra randomness
  const selectedImages = shuffledImages.slice(0, count);
  const finalShuffled = cryptoShuffleArray(selectedImages);
  
  console.log(`🎯 Selected ${finalShuffled.length} random images from ${allImages.length} total images`);
  return finalShuffled;
};

// Function to get daily challenge images with enhanced logging
export const getDailyChallengeImages = async (): Promise<GameImage[]> => {
  console.log('📅 getDailyChallengeImages called');
  
  try {
    // Use EST timezone for daily challenge date
    const estOffset = -5; // EST is UTC-5
    const utcNow = new Date();
    const estNow = new Date(utcNow.getTime() + (estOffset * 60 * 60 * 1000));
    const today = estNow.toISOString().split('T')[0]; // YYYY-MM-DD format in EST
    console.log('📆 Daily challenge date (EST):', today);
    
    // First, check if we already have today's challenge
    console.log('🔍 Checking for existing daily challenge...');
    const { data: existingChallenge, error: fetchError } = await supabase
      .from('daily_challenges')
      .select('image_ids')
      .eq('challenge_date', today)
      .maybeSingle();
    
    if (fetchError) {
      console.error('❌ Error fetching daily challenge:', fetchError);
    }
    
    let imageIds: string[];
    
    if (existingChallenge && existingChallenge.image_ids && existingChallenge.image_ids.length > 0) {
      // Use existing challenge
      imageIds = existingChallenge.image_ids;
      console.log('✅ Using existing daily challenge with image IDs:', imageIds);
    } else {
      // Generate new daily challenge using all available images
      console.log('🆕 Generating new daily challenge');
      const allImages = await getAllImages();
      
      if (allImages.length === 0) {
        console.error('🚫 No images available for daily challenge generation');
        return [];
      }
      
      console.log(`🎯 Daily challenge: Using all ${allImages.length} images from database`);
      
      // Create deterministic seed from date
      const dateNumbers = today.split('-').map(num => parseInt(num, 10));
      const seed = dateNumbers[0] * 10000 + dateNumbers[1] * 100 + dateNumbers[2];
      console.log('🌱 Generated seed for daily challenge:', seed);
      
      // Deterministic shuffle using date seed on all images
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      const shuffledImages = [...allImages];
      for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
      }
      
      // Take first 5 images
      const selectedImages = shuffledImages.slice(0, Math.min(5, allImages.length));
      imageIds = selectedImages.map(img => img.id);
      
      console.log('🎯 Generated image IDs for daily challenge:', imageIds);
      
      // Store in database
      try {
        console.log('💾 Storing daily challenge in database...');
        const { error: insertError } = await supabase
          .from('daily_challenges')
          .insert({
            challenge_date: today,
            image_ids: imageIds
          });
        
        if (insertError) {
          console.error('❌ Error storing daily challenge:', insertError);
        } else {
          console.log('✅ Successfully stored daily challenge in database');
        }
      } catch (insertError) {
        console.error('💥 Unexpected error inserting daily challenge:', insertError);
        // Continue anyway - we can still use the generated images
      }
    }
    
    // Now fetch the actual image data
    console.log('📥 Fetching actual image data for daily challenge...');
    const allImages = await getAllImages();
    const challengeImages = imageIds
      .map(id => {
        const found = allImages.find(img => img.id === id);
        if (!found) {
          console.warn('⚠️ Image not found for ID:', id);
        }
        return found;
      })
      .filter((img): img is GameImage => img !== undefined);
    
    if (challengeImages.length === 0) {
      console.error('🚫 No valid images found for daily challenge, falling back to random images');
      return await getRandomGameImages(5);
    }
    
    console.log(`✅ Loaded ${challengeImages.length} images for daily challenge`);
    return challengeImages;
    
  } catch (error) {
    console.error('💥 Unexpected error in getDailyChallengeImages:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Fall back to random images if daily challenge fails
    console.log('🔄 Falling back to random images due to error');
    return await getRandomGameImages(5);
  }
};

// Utility function to clear daily challenges (for resetting image pools)
export const clearDailyChallenges = async (): Promise<boolean> => {
  console.log('🧹 Clearing daily challenges to reset image pools...');
  
  try {
    const { error } = await supabase
      .from('daily_challenges')
      .delete()
      .neq('id', 'impossible-value'); // This will delete all rows
    
    if (error) {
      console.error('❌ Error clearing daily challenges:', error);
      return false;
    } else {
      console.log('✅ Successfully cleared all daily challenges');
      console.log('🎯 All users will now get fresh image pools using all 198 database images');
      return true;
    }
  } catch (error) {
    console.error('💥 Unexpected error clearing daily challenges:', error);
    return false;
  }
};

// Make clearDailyChallenges available globally for easy access
if (typeof window !== 'undefined') {
  (window as any).clearDailyChallenges = clearDailyChallenges;
}

// Legacy functions for backwards compatibility
export const loadCustomImages = async (): Promise<GameImage[]> => {
  return await fetchImagesFromSupabase();
};

export const saveCustomImages = async (images: GameImage[]): Promise<boolean> => {
  console.warn('saveCustomImages is deprecated, use addImageToSupabase instead');
  return true;
};

export const customImages: GameImage[] = []; 