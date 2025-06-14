import { GameImage } from '@/types/game';
import { getAllImages } from '@/data/sampleData';
import { supabase } from '@/integrations/supabase/client';
import { GAME_CONSTANTS, ENV_CONFIG } from '@/constants/gameConstants';

const STORAGE_KEY = GAME_CONSTANTS.STORAGE_KEYS.IMAGE_POOL;
const USED_IMAGES_KEY = GAME_CONSTANTS.STORAGE_KEYS.USED_IMAGES;

interface ImagePoolState {
  availableImages: GameImage[];
  usedImages: string[];
  totalImagesInDatabase: number;
  poolCreatedAt: number;
}

interface UserImagePool {
  id: string;
  user_id: string;
  available_image_ids: string[];
  used_image_ids: string[];
  total_images_in_database: number;
  pool_created_at: string;
  updated_at: string;
}

// Enhanced shuffle function using crypto random
const cryptoShuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  
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

// Load image pool state from localStorage (for guests)
const loadPoolState = (): ImagePoolState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load image pool state:', error);
  }
  return null;
};

// Save image pool state to localStorage (for guests)
const savePoolState = (state: ImagePoolState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save image pool state:', error);
  }
};

// Load user image pool from database (for authenticated users)
const loadUserImagePool = async (userId: string): Promise<UserImagePool | null> => {
  try {
    console.log('🔍 Loading user image pool for user:', userId);
    
    const { data, error } = await supabase
      .from('user_image_pools' as any)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📝 No existing pool found for user, will create new one');
        return null;
      }
      console.error('❌ Error loading user image pool:', error);
      return null;
    }
    
    console.log('✅ User image pool loaded successfully');
    return data as unknown as UserImagePool;
  } catch (error) {
    console.error('❌ Exception loading user image pool:', error);
    return null;
  }
};

// Save user image pool to database
const saveUserImagePool = async (userId: string, availableImageIds: string[], usedImageIds: string[], totalImages: number): Promise<boolean> => {
  try {
    console.log('💾 Saving user image pool:', {
      userId: userId.slice(0, 8) + '...',
      availableCount: availableImageIds.length,
      usedCount: usedImageIds.length,
      totalImages,
      recentlyUsed: usedImageIds.slice(-3) // Show last 3 used images
    });
    
    // First try to update the existing record
    const { data: updateData, error: updateError } = await supabase
      .from('user_image_pools' as any)
      .update({
        available_image_ids: availableImageIds,
        used_image_ids: usedImageIds,
        total_images_in_database: totalImages,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();
    
    // If update affected no rows, insert a new record
    if (updateData && updateData.length === 0) {
      console.log('📝 No existing record found, inserting new one...');
      const { error: insertError } = await supabase
        .from('user_image_pools' as any)
        .insert({
          user_id: userId,
          available_image_ids: availableImageIds,
          used_image_ids: usedImageIds,
          total_images_in_database: totalImages,
          pool_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Error inserting user image pool:', insertError);
        return false;
      }
    } else if (updateError) {
      console.error('❌ Error updating user image pool:', updateError);
      return false;
    }
    
    console.log('✅ User image pool saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Exception saving user image pool:', error);
    return false;
  }
};

// Initialize a new image pool with all available images (for guests)
const initializeImagePool = async (): Promise<ImagePoolState> => {
  console.log('🎲 Initializing new guest image pool...');
  
  const allImages = await getAllImages();
  if (allImages.length === 0) {
    throw new Error('No images available in database');
  }
  
  const shuffledImages = cryptoShuffleArray(allImages);
  
  const newState: ImagePoolState = {
    availableImages: shuffledImages,
    usedImages: [],
    totalImagesInDatabase: allImages.length,
    poolCreatedAt: Date.now()
  };
  
  savePoolState(newState);
  console.log(`✅ Guest image pool initialized with ${allImages.length} images`);
  
  return newState;
};

// Initialize a new user image pool (for authenticated users)
const initializeUserImagePool = async (userId: string): Promise<UserImagePool | null> => {
  console.log('🎲 Initializing new user image pool for user:', userId);
  
  const allImages = await getAllImages();
  if (allImages.length === 0) {
    throw new Error('No images available in database');
  }
  
  const shuffledImages = cryptoShuffleArray(allImages);
  const shuffledImageIds = shuffledImages.map(img => img.id);
  
  const success = await saveUserImagePool(userId, shuffledImageIds, [], allImages.length);
  
  if (!success) {
    console.error('❌ Failed to save new user image pool');
    return null;
  }
  
  console.log(`✅ User image pool initialized with ${allImages.length} images`);
  
  return {
    id: '', // Will be set by database
    user_id: userId,
    available_image_ids: shuffledImageIds,
    used_image_ids: [],
    total_images_in_database: allImages.length,
    pool_created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// Get the next image from the pool (supports both user and guest pools)
export const getNextImageFromPool = async (userId?: string): Promise<GameImage | null> => {
  console.log('🎯 Getting next image from pool...', userId ? `for user: ${userId}` : 'for guest');
  
  if (userId) {
    // Authenticated user - use database pool
    return getNextImageFromUserPool(userId);
  } else {
    // Guest user - use localStorage pool
    return getNextImageFromGuestPool();
  }
};

// Get next image for authenticated user
const getNextImageFromUserPool = async (userId: string): Promise<GameImage | null> => {
  let userPool = await loadUserImagePool(userId);
  
  // Initialize pool if it doesn't exist or is empty
  if (!userPool || userPool.available_image_ids.length === 0) {
    console.log('🔄 User pool empty or doesn\'t exist, creating new pool...');
    userPool = await initializeUserImagePool(userId);
    
    if (!userPool) {
      console.error('❌ Failed to initialize user pool');
      return null;
    }
  }
  
  // If still no images available, return null
  if (userPool.available_image_ids.length === 0) {
    console.error('❌ No images available in user pool');
    return null;
  }
  
  // Get all images to find the actual image object
  const allImages = await getAllImages();
  const nextImageId = userPool.available_image_ids[0];
  const nextImage = allImages.find(img => img.id === nextImageId);
  
  if (!nextImage) {
    console.error('❌ Image not found in database:', nextImageId);
    return null;
  }
  
  // Update pool state
  const newAvailableIds = userPool.available_image_ids.slice(1);
  const newUsedIds = [...userPool.used_image_ids, nextImageId];
  
  // If pool is exhausted, log it
  if (newAvailableIds.length === 0) {
    console.log('🔄 User image pool exhausted! Will create new pool on next request.');
  }
  
  // Save updated pool state
  await saveUserImagePool(userId, newAvailableIds, newUsedIds, userPool.total_images_in_database);
  
  console.log(`📤 Retrieved image: ${nextImage.id}, ${newAvailableIds.length} remaining in user pool`);
  
  return nextImage;
};

// Get next image for guest user
const getNextImageFromGuestPool = async (): Promise<GameImage | null> => {
  let poolState = loadPoolState();
  
  // Initialize pool if it doesn't exist or is empty
  if (!poolState || poolState.availableImages.length === 0) {
    console.log('🔄 Guest pool empty or doesn\'t exist, creating new pool...');
    poolState = await initializeImagePool();
  }
  
  // If still no images available, return null
  if (poolState.availableImages.length === 0) {
    console.error('❌ No images available in guest pool');
    return null;
  }
  
  // Get the next image
  const nextImage = poolState.availableImages[0];
  
  // Update pool state
  poolState.availableImages = poolState.availableImages.slice(1);
  poolState.usedImages.push(nextImage.id);
  
  // If pool is exhausted, check if we should notify about reset
  if (poolState.availableImages.length === 0) {
    console.log('🔄 Guest image pool exhausted! Will create new pool on next request.');
  }
  
  savePoolState(poolState);
  
  console.log(`📤 Retrieved image: ${nextImage.id}, ${poolState.availableImages.length} remaining in guest pool`);
  
  return nextImage;
};

// Get multiple images from pool for a game session
export const getGameImagesFromPool = async (count: number, userId?: string): Promise<GameImage[]> => {
  console.log(`🎮 Getting ${count} images from pool for game session...`, userId ? `for user: ${userId}` : 'for guest');
  
  if (userId) {
    // Authenticated user - handle batch selection from database
    return getGameImagesFromUserPool(count, userId);
  } else {
    // Guest user - handle batch selection from localStorage
    return getGameImagesFromGuestPool(count);
  }
};

// Get multiple images for authenticated user (batch operation)
const getGameImagesFromUserPool = async (count: number, userId: string): Promise<GameImage[]> => {
  let userPool = await loadUserImagePool(userId);
  
  // Initialize pool if it doesn't exist or is empty
  if (!userPool || userPool.available_image_ids.length === 0) {
    console.log('🔄 User pool empty or doesn\'t exist, creating new pool...');
    userPool = await initializeUserImagePool(userId);
    
    if (!userPool) {
      console.error('❌ Failed to initialize user pool');
      return [];
    }
  } else {
    // Validate and repair existing pool
    userPool = await validateAndRepairUserPool(userId, userPool);
    if (!userPool) {
      console.error('❌ Failed to validate/repair user pool, creating new one...');
      userPool = await initializeUserImagePool(userId);
      if (!userPool) {
        console.error('❌ Failed to initialize user pool');
        return [];
      }
    }
  }
  
  // Determine how many images we can actually get
  const availableCount = userPool.available_image_ids.length;
  const actualCount = Math.min(count, availableCount);
  
  if (actualCount === 0) {
    console.error('❌ No images available in user pool');
    return [];
  }
  
  // Get the image IDs we'll use (first N from available)
  const selectedImageIds = userPool.available_image_ids.slice(0, actualCount);
  
  // DUPLICATE PREVENTION: Check for duplicates in selected IDs
  const uniqueSelectedIds = [...new Set(selectedImageIds)];
  if (uniqueSelectedIds.length !== selectedImageIds.length) {
    console.error('❌ DUPLICATE DETECTION: Found duplicate IDs in pool!', {
      selected: selectedImageIds,
      unique: uniqueSelectedIds,
      duplicates: selectedImageIds.filter((id, index) => selectedImageIds.indexOf(id) !== index)
    });
    // Use only unique IDs
    selectedImageIds.length = 0;
    selectedImageIds.push(...uniqueSelectedIds);
  }
  
  // DUPLICATE PREVENTION: Check if any selected IDs are already in used list
  const alreadyUsed = selectedImageIds.filter(id => userPool.used_image_ids.includes(id));
  if (alreadyUsed.length > 0) {
    console.error('❌ DUPLICATE DETECTION: Selected IDs already in used list!', {
      alreadyUsed,
      selectedImageIds,
      usedImageIds: userPool.used_image_ids
    });
    // Remove already used IDs and get fresh ones
    const freshIds = userPool.available_image_ids.filter(id => !userPool.used_image_ids.includes(id));
    selectedImageIds.length = 0;
    selectedImageIds.push(...freshIds.slice(0, actualCount));
  }
  
  // Get all images to find the actual image objects
  const allImages = await getAllImages();
  const selectedImages = selectedImageIds
    .map(id => allImages.find(img => img.id === id))
    .filter((img): img is GameImage => img !== undefined);
  
  if (selectedImages.length !== selectedImageIds.length) {
    console.warn('⚠️ Some images not found in database');
  }
  
  // DUPLICATE PREVENTION: Final check for duplicate images in result
  const uniqueImages = selectedImages.filter((img, index, arr) => 
    arr.findIndex(other => other.id === img.id) === index
  );
  if (uniqueImages.length !== selectedImages.length) {
    console.error('❌ DUPLICATE DETECTION: Found duplicate images in final result!', {
      original: selectedImages.map(img => img.id),
      unique: uniqueImages.map(img => img.id)
    });
  }
  
  // Update pool state in one batch operation
  const newAvailableIds = userPool.available_image_ids.slice(actualCount);
  const newUsedIds = [...userPool.used_image_ids, ...selectedImageIds];
  
  // DUPLICATE PREVENTION: Ensure no duplicates in used list
  const uniqueUsedIds = [...new Set(newUsedIds)];
  if (uniqueUsedIds.length !== newUsedIds.length) {
    console.warn('⚠️ Removing duplicates from used IDs list');
  }
  
  // If pool is exhausted, log it
  if (newAvailableIds.length === 0) {
    console.log('🔄 User image pool exhausted! Will create new pool on next request.');
  }
  
  // Save updated pool state
  const success = await saveUserImagePool(userId, newAvailableIds, uniqueUsedIds, userPool.total_images_in_database);
  
  if (!success) {
    console.error('❌ Failed to update user pool state');
    // Still return the images, but warn about the issue
  }
  
  console.log(`📤 Retrieved ${uniqueImages.length} images for user, ${newAvailableIds.length} remaining in pool`);
  console.log(`🎯 Selected image IDs: ${selectedImageIds.join(', ')}`);
  console.log(`🔍 Duplicate check: ${selectedImages.length} original -> ${uniqueImages.length} unique`);
  
  return uniqueImages;
};

// Get multiple images for guest user (batch operation)
const getGameImagesFromGuestPool = async (count: number): Promise<GameImage[]> => {
  let poolState = loadPoolState();
  
  // Initialize pool if it doesn't exist or is empty
  if (!poolState || poolState.availableImages.length === 0) {
    console.log('🔄 Guest pool empty or doesn\'t exist, creating new pool...');
    poolState = await initializeImagePool();
  } else {
    // Validate and repair existing pool
    poolState = await validateAndRepairGuestPool(poolState);
  }
  
  // Determine how many images we can actually get
  const availableCount = poolState.availableImages.length;
  const actualCount = Math.min(count, availableCount);
  
  if (actualCount === 0) {
    console.error('❌ No images available in guest pool');
    return [];
  }
  
  // Get the images we'll use (first N from available)
  const selectedImages = poolState.availableImages.slice(0, actualCount);
  
  // DUPLICATE PREVENTION: Check for duplicates in selected images
  const uniqueSelectedImages = selectedImages.filter((img, index, arr) => 
    arr.findIndex(other => other.id === img.id) === index
  );
  if (uniqueSelectedImages.length !== selectedImages.length) {
    console.error('❌ DUPLICATE DETECTION: Found duplicate images in guest pool selection!', {
      original: selectedImages.map(img => img.id),
      unique: uniqueSelectedImages.map(img => img.id),
      duplicates: selectedImages.filter((img, index) => selectedImages.findIndex(other => other.id === img.id) !== index).map(img => img.id)
    });
  }
  
  // DUPLICATE PREVENTION: Check if any selected images are already in used list
  const alreadyUsedIds = uniqueSelectedImages.filter(img => poolState.usedImages.includes(img.id));
  if (alreadyUsedIds.length > 0) {
    console.error('❌ DUPLICATE DETECTION: Selected images already in used list!', {
      alreadyUsed: alreadyUsedIds.map(img => img.id),
      selectedImages: uniqueSelectedImages.map(img => img.id),
      usedImages: poolState.usedImages
    });
    // Filter out already used images and get fresh ones
    const freshImages = poolState.availableImages.filter(img => !poolState.usedImages.includes(img.id));
    uniqueSelectedImages.length = 0;
    uniqueSelectedImages.push(...freshImages.slice(0, actualCount));
  }
  
  // Update pool state
  poolState.availableImages = poolState.availableImages.slice(actualCount);
  const newUsedImageIds = [...poolState.usedImages, ...uniqueSelectedImages.map(img => img.id)];
  
  // DUPLICATE PREVENTION: Ensure no duplicates in used list
  const uniqueUsedImageIds = [...new Set(newUsedImageIds)];
  if (uniqueUsedImageIds.length !== newUsedImageIds.length) {
    console.warn('⚠️ Removing duplicates from guest used images list');
  }
  poolState.usedImages = uniqueUsedImageIds;
  
  // If pool is exhausted, log it
  if (poolState.availableImages.length === 0) {
    console.log('🔄 Guest image pool exhausted! Will create new pool on next request.');
  }
  
  savePoolState(poolState);
  
  console.log(`📤 Retrieved ${uniqueSelectedImages.length} images for guest, ${poolState.availableImages.length} remaining in pool`);
  console.log(`🎯 Selected image IDs: ${uniqueSelectedImages.map(img => img.id).join(', ')}`);
  console.log(`🔍 Duplicate check: ${selectedImages.length} original -> ${uniqueSelectedImages.length} unique`);
  
  return uniqueSelectedImages;
};

// Get pool statistics (supports both user and guest pools)
export const getPoolStats = async (userId?: string): Promise<{ 
  availableImages: number; 
  usedImages: number; 
  totalImages: number;
  poolProgress: number;
}> => {
  if (userId) {
    // Authenticated user - get stats from database
    const userPool = await loadUserImagePool(userId);
    
    if (!userPool) {
      return {
        availableImages: 0,
        usedImages: 0,
        totalImages: 0,
        poolProgress: 0
      };
    }
    
    const totalImages = userPool.total_images_in_database;
    const usedImages = userPool.used_image_ids.length;
    const availableImages = userPool.available_image_ids.length;
    const poolProgress = totalImages > 0 ? (usedImages / totalImages) * 100 : 0;
    
    return {
      availableImages,
      usedImages,
      totalImages,
      poolProgress
    };
  } else {
    // Guest user - get stats from localStorage
    const poolState = loadPoolState();
    
    if (!poolState) {
      return {
        availableImages: 0,
        usedImages: 0,
        totalImages: 0,
        poolProgress: 0
      };
    }
    
    const totalImages = poolState.totalImagesInDatabase;
    const usedImages = poolState.usedImages.length;
    const availableImages = poolState.availableImages.length;
    const poolProgress = totalImages > 0 ? (usedImages / totalImages) * 100 : 0;
    
    return {
      availableImages,
      usedImages,
      totalImages,
      poolProgress
    };
  }
};

// Force reset the image pool (supports both user and guest pools)
export const resetImagePool = async (userId?: string): Promise<void> => {
  console.log('🔄 Force resetting image pool...', userId ? `for user: ${userId}` : 'for guest');
  
  if (userId) {
    // Authenticated user - reset database pool
    await initializeUserImagePool(userId);
  } else {
    // Guest user - reset localStorage pool
    localStorage.removeItem(STORAGE_KEY);
    await initializeImagePool();
  }
};

// Check if we need to notify about pool reset (supports both user and guest pools)
export const shouldNotifyPoolReset = async (userId?: string): Promise<boolean> => {
  if (userId) {
    // Authenticated user - check database pool
    const userPool = await loadUserImagePool(userId);
    return userPool ? userPool.available_image_ids.length === 0 : false;
  } else {
    // Guest user - check localStorage pool
    const poolState = loadPoolState();
    return poolState ? poolState.availableImages.length === 0 : false;
  }
};

// Test function to verify image pool system (for debugging)
export const testImagePoolSystem = async (userId?: string): Promise<void> => {
  console.log('🧪 Testing image pool system...');
  
  // Test getting 10 images in batches of 5
  console.log('📋 Test 1: Getting first batch of 5 images');
  const batch1 = await getGameImagesFromPool(5, userId);
  console.log('Batch 1 IDs:', batch1.map(img => img.id));
  
  console.log('📋 Test 2: Getting second batch of 5 images');
  const batch2 = await getGameImagesFromPool(5, userId);
  console.log('Batch 2 IDs:', batch2.map(img => img.id));
  
  // Check for duplicates
  const allIds = [...batch1.map(img => img.id), ...batch2.map(img => img.id)];
  const uniqueIds = new Set(allIds);
  
  if (allIds.length === uniqueIds.size) {
    console.log('✅ No duplicates found! Image pool system working correctly.');
  } else {
    console.error('❌ Duplicates found! Image pool system has issues.');
    console.log('All IDs:', allIds);
    console.log('Unique IDs:', Array.from(uniqueIds));
  }
  
  // Show pool stats
  const stats = await getPoolStats(userId);
  console.log('📊 Pool stats after test:', stats);
};

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testImagePool = testImagePoolSystem;
}

// Validate and repair pool integrity
const validateAndRepairUserPool = async (userId: string, userPool: UserImagePool): Promise<UserImagePool | null> => {
  console.log('🔍 Validating user pool integrity...');
  
  const allImages = await getAllImages();
  const allImageIds = allImages.map(img => img.id);
  
  let needsRepair = false;
  let repairedPool = { ...userPool };
  
  // Check 1: Remove any image IDs that don't exist in database
  const validAvailableIds = repairedPool.available_image_ids.filter(id => allImageIds.includes(id));
  const validUsedIds = repairedPool.used_image_ids.filter(id => allImageIds.includes(id));
  
  if (validAvailableIds.length !== repairedPool.available_image_ids.length) {
    console.warn('⚠️ Found invalid image IDs in available list, removing them');
    needsRepair = true;
  }
  
  if (validUsedIds.length !== repairedPool.used_image_ids.length) {
    console.warn('⚠️ Found invalid image IDs in used list, removing them');
    needsRepair = true;
  }
  
  // Check 2: Remove duplicates within each list
  const uniqueAvailableIds = [...new Set(validAvailableIds)];
  const uniqueUsedIds = [...new Set(validUsedIds)];
  
  if (uniqueAvailableIds.length !== validAvailableIds.length) {
    console.warn('⚠️ Found duplicates in available list, removing them');
    needsRepair = true;
  }
  
  if (uniqueUsedIds.length !== validUsedIds.length) {
    console.warn('⚠️ Found duplicates in used list, removing them');
    needsRepair = true;
  }
  
  // Check 3: Remove any IDs that appear in both lists
  const conflictIds = uniqueAvailableIds.filter(id => uniqueUsedIds.includes(id));
  if (conflictIds.length > 0) {
    console.warn('⚠️ Found IDs in both available and used lists, removing from available:', conflictIds);
    needsRepair = true;
  }
  
  const finalAvailableIds = uniqueAvailableIds.filter(id => !uniqueUsedIds.includes(id));
  const finalUsedIds = uniqueUsedIds;
  
  // Check 4: Ensure we have all images accounted for
  const totalAccountedIds = [...finalAvailableIds, ...finalUsedIds];
  const missingIds = allImageIds.filter(id => !totalAccountedIds.includes(id));
  
  if (missingIds.length > 0) {
    console.warn('⚠️ Found missing image IDs, adding to available list:', missingIds);
    finalAvailableIds.push(...missingIds);
    needsRepair = true;
  }
  
  // Check 5: Update total count if needed
  if (repairedPool.total_images_in_database !== allImages.length) {
    console.warn('⚠️ Total images count mismatch, updating');
    needsRepair = true;
  }
  
  if (needsRepair) {
    console.log('🔧 Repairing user pool...');
    repairedPool = {
      ...repairedPool,
      available_image_ids: cryptoShuffleArray(finalAvailableIds), // Reshuffle for fairness
      used_image_ids: finalUsedIds,
      total_images_in_database: allImages.length,
      updated_at: new Date().toISOString()
    };
    
    const success = await saveUserImagePool(userId, repairedPool.available_image_ids, repairedPool.used_image_ids, repairedPool.total_images_in_database);
    if (!success) {
      console.error('❌ Failed to save repaired pool');
      return null;
    }
    
    console.log('✅ User pool repaired successfully');
    return repairedPool;
  }
  
  console.log('✅ User pool integrity check passed');
  return userPool;
};

// Validate and repair guest pool integrity
const validateAndRepairGuestPool = async (poolState: ImagePoolState): Promise<ImagePoolState> => {
  console.log('🔍 Validating guest pool integrity...');
  
  const allImages = await getAllImages();
  const allImageIds = allImages.map(img => img.id);
  
  let needsRepair = false;
  let repairedState = { ...poolState };
  
  // Check 1: Remove any images that don't exist in database
  const validAvailableImages = repairedState.availableImages.filter(img => allImageIds.includes(img.id));
  const validUsedIds = repairedState.usedImages.filter(id => allImageIds.includes(id));
  
  if (validAvailableImages.length !== repairedState.availableImages.length) {
    console.warn('⚠️ Found invalid images in available list, removing them');
    needsRepair = true;
  }
  
  if (validUsedIds.length !== repairedState.usedImages.length) {
    console.warn('⚠️ Found invalid image IDs in used list, removing them');
    needsRepair = true;
  }
  
  // Check 2: Remove duplicates
  const uniqueAvailableImages = validAvailableImages.filter((img, index, arr) => 
    arr.findIndex(other => other.id === img.id) === index
  );
  const uniqueUsedIds = [...new Set(validUsedIds)];
  
  if (uniqueAvailableImages.length !== validAvailableImages.length) {
    console.warn('⚠️ Found duplicate images in available list, removing them');
    needsRepair = true;
  }
  
  if (uniqueUsedIds.length !== validUsedIds.length) {
    console.warn('⚠️ Found duplicates in used list, removing them');
    needsRepair = true;
  }
  
  // Check 3: Remove any images that appear in both lists
  const conflictImages = uniqueAvailableImages.filter(img => uniqueUsedIds.includes(img.id));
  if (conflictImages.length > 0) {
    console.warn('⚠️ Found images in both available and used lists, removing from available:', conflictImages.map(img => img.id));
    needsRepair = true;
  }
  
  const finalAvailableImages = uniqueAvailableImages.filter(img => !uniqueUsedIds.includes(img.id));
  const finalUsedIds = uniqueUsedIds;
  
  // Check 4: Ensure we have all images accounted for
  const availableImageIds = finalAvailableImages.map(img => img.id);
  const totalAccountedIds = [...availableImageIds, ...finalUsedIds];
  const missingIds = allImageIds.filter(id => !totalAccountedIds.includes(id));
  
  if (missingIds.length > 0) {
    console.warn('⚠️ Found missing images, adding to available list:', missingIds);
    const missingImages = allImages.filter(img => missingIds.includes(img.id));
    finalAvailableImages.push(...missingImages);
    needsRepair = true;
  }
  
  // Check 5: Update total count if needed
  if (repairedState.totalImagesInDatabase !== allImages.length) {
    console.warn('⚠️ Total images count mismatch, updating');
    needsRepair = true;
  }
  
  if (needsRepair) {
    console.log('🔧 Repairing guest pool...');
    repairedState = {
      ...repairedState,
      availableImages: cryptoShuffleArray(finalAvailableImages), // Reshuffle for fairness
      usedImages: finalUsedIds,
      totalImagesInDatabase: allImages.length
    };
    
    savePoolState(repairedState);
    console.log('✅ Guest pool repaired successfully');
  } else {
    console.log('✅ Guest pool integrity check passed');
  }
  
  return repairedState;
};
