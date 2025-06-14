import { supabase } from '@/integrations/supabase/client';
import { getAllImages } from '@/data/sampleData';

// Admin function to get database statistics
export const getDatabaseStats = async () => {
  try {
    console.log('📊 Fetching database statistics...');
    
    // Get game images count
    const { count: imageCount, error: imageError } = await supabase
      .from('game_images')
      .select('*', { count: 'exact', head: true });
    
    if (imageError) {
      console.error('Error fetching image count:', imageError);
    }
    
    // Get user pools count
    const { count: poolCount, error: poolError } = await supabase
      .from('user_image_pools')
      .select('*', { count: 'exact', head: true });
    
    if (poolError) {
      console.error('Error fetching pool count:', poolError);
    }
    
    // Get user profiles count
    const { count: userCount, error: userError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (userError) {
      console.error('Error fetching user count:', userError);
    }
    
    // Get game sessions count
    const { count: sessionCount, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (sessionError) {
      console.error('Error fetching session count:', sessionError);
    }
    
    const stats = {
      totalImages: imageCount || 0,
      totalUserPools: poolCount || 0,
      totalUsers: userCount || 0,
      totalGameSessions: sessionCount || 0,
    };
    
    console.log('✅ Database stats:', stats);
    return stats;
    
  } catch (error) {
    console.error('💥 Error fetching database stats:', error);
    return {
      totalImages: 0,
      totalUserPools: 0,
      totalUsers: 0,
      totalGameSessions: 0,
    };
  }
};

// Admin function to reset all user image pools
export const resetAllUserImagePools = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('🔄 Starting reset of all user image pools...');
    
    // First, get all user pools
    const { data: pools, error: fetchError } = await supabase
      .from('user_image_pools')
      .select('user_id, id');
    
    if (fetchError) {
      console.error('❌ Error fetching user pools:', fetchError);
      return { success: false, message: `Error fetching user pools: ${fetchError.message}` };
    }
    
    if (!pools || pools.length === 0) {
      console.log('ℹ️ No user pools found to reset');
      return { success: true, message: 'No user pools found to reset', details: { poolsReset: 0 } };
    }
    
    // Get all image IDs to create fresh pools
    const allImages = await getAllImages();
    if (allImages.length === 0) {
      return { success: false, message: 'No images found in database' };
    }
    
    const allImageIds = allImages.map(img => img.id);
    
    // Shuffle function
    const shuffleArray = (array: string[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    console.log(`🎲 Resetting ${pools.length} user pools with ${allImageIds.length} images each...`);
    
    // Reset each user pool
    let successCount = 0;
    const errors: string[] = [];
    
    for (const pool of pools) {
      try {
        const shuffledImageIds = shuffleArray(allImageIds);
        
        const { error: updateError } = await supabase
          .from('user_image_pools')
          .update({
            available_image_ids: shuffledImageIds,
            used_image_ids: [],
            total_images_in_database: allImages.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', pool.id);
        
        if (updateError) {
          const errorMsg = `Error updating pool for user ${pool.user_id}: ${updateError.message}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        } else {
          successCount++;
          console.log(`✅ Reset pool for user ${pool.user_id?.substring(0, 8)}...`);
        }
      } catch (error) {
        const errorMsg = `Exception updating pool for user ${pool.user_id}: ${error}`;
        console.error('💥', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const message = `Successfully reset ${successCount}/${pools.length} user image pools`;
    console.log(`\n🎉 ${message}`);
    
    return {
      success: successCount === pools.length,
      message,
      details: {
        poolsReset: successCount,
        totalPools: pools.length,
        totalImages: allImages.length,
        errors: errors.length > 0 ? errors : undefined
      }
    };
    
  } catch (error) {
    console.error('💥 Unexpected error resetting pools:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
};

// Admin function to validate image pool integrity for all users
export const validateAllUserImagePools = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('🔍 Validating all user image pools...');
    
    const { data: pools, error: fetchError } = await supabase
      .from('user_image_pools')
      .select('*');
    
    if (fetchError) {
      return { success: false, message: `Error fetching user pools: ${fetchError.message}` };
    }
    
    if (!pools || pools.length === 0) {
      return { success: true, message: 'No user pools found to validate', details: { poolsValidated: 0 } };
    }
    
    const allImages = await getAllImages();
    const allImageIds = allImages.map(img => img.id);
    
    let validPools = 0;
    let invalidPools = 0;
    const issues: string[] = [];
    
    for (const pool of pools) {
      const poolIssues: string[] = [];
      
      // Check for invalid image IDs
      const invalidAvailable = pool.available_image_ids?.filter(id => !allImageIds.includes(id)) || [];
      const invalidUsed = pool.used_image_ids?.filter(id => !allImageIds.includes(id)) || [];
      
      if (invalidAvailable.length > 0) {
        poolIssues.push(`${invalidAvailable.length} invalid available image IDs`);
      }
      
      if (invalidUsed.length > 0) {
        poolIssues.push(`${invalidUsed.length} invalid used image IDs`);
      }
      
      // Check for duplicates
      const availableSet = new Set(pool.available_image_ids || []);
      const usedSet = new Set(pool.used_image_ids || []);
      
      if (availableSet.size !== (pool.available_image_ids?.length || 0)) {
        poolIssues.push('duplicate IDs in available list');
      }
      
      if (usedSet.size !== (pool.used_image_ids?.length || 0)) {
        poolIssues.push('duplicate IDs in used list');
      }
      
      // Check for conflicts (IDs in both lists)
      const conflicts = (pool.available_image_ids || []).filter(id => 
        (pool.used_image_ids || []).includes(id)
      );
      
      if (conflicts.length > 0) {
        poolIssues.push(`${conflicts.length} IDs in both available and used lists`);
      }
      
      // Check total count
      if (pool.total_images_in_database !== allImages.length) {
        poolIssues.push(`incorrect total count (${pool.total_images_in_database} vs ${allImages.length})`);
      }
      
      if (poolIssues.length > 0) {
        invalidPools++;
        issues.push(`User ${pool.user_id?.substring(0, 8)}...: ${poolIssues.join(', ')}`);
      } else {
        validPools++;
      }
    }
    
    const message = `Validated ${pools.length} pools: ${validPools} valid, ${invalidPools} invalid`;
    console.log(`📊 ${message}`);
    
    return {
      success: invalidPools === 0,
      message,
      details: {
        totalPools: pools.length,
        validPools,
        invalidPools,
        issues: issues.length > 0 ? issues : undefined
      }
    };
    
  } catch (error) {
    console.error('💥 Error validating pools:', error);
    return { success: false, message: `Validation error: ${error}` };
  }
};

// Admin function to clear guest user localStorage pools (instructions)
export const getGuestPoolResetInstructions = () => {
  return {
    title: 'Reset Guest User Image Pools',
    instructions: [
      'Guest users store their image pools in browser localStorage',
      'To reset guest pools, users need to:',
      '1. Open browser developer tools (F12)',
      '2. Go to Application/Storage tab',
      '3. Find and delete these localStorage items:',
      '   • smrutimap_image_pool',
      '   • smrutimap_used_images',
      '4. Refresh the page',
      '',
      'Alternative: Users can clear all site data in browser settings'
    ]
  };
};

// Admin function to handle new images added to the database
export const handleNewImagesAdded = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    console.log('🆕 Handling new images added to database...');
    
    // Get current database image count
    const allImages = await getAllImages();
    if (allImages.length === 0) {
      return { success: false, message: 'No images found in database' };
    }
    
    console.log(`📊 Current database has ${allImages.length} images`);
    
    // Check if any user pools exist and if they need updating
    const { data: pools, error: fetchError } = await supabase
      .from('user_image_pools')
      .select('*');
    
    if (fetchError) {
      return { success: false, message: `Error fetching user pools: ${fetchError.message}` };
    }
    
    if (!pools || pools.length === 0) {
      console.log('ℹ️ No existing user pools - new users will automatically get all images');
      return { 
        success: true, 
        message: 'No existing user pools to update - new users will get all images automatically',
        details: { totalImages: allImages.length, poolsUpdated: 0 }
      };
    }
    
    // Check which pools need updating (have fewer images than current database)
    const poolsNeedingUpdate = pools.filter(pool => 
      pool.total_images_in_database < allImages.length
    );
    
    if (poolsNeedingUpdate.length === 0) {
      console.log('✅ All user pools are already up to date');
      return {
        success: true,
        message: 'All user pools are already up to date',
        details: { totalImages: allImages.length, poolsUpdated: 0, totalPools: pools.length }
      };
    }
    
    console.log(`🔄 Updating ${poolsNeedingUpdate.length} user pools that need new images...`);
    
    const allImageIds = allImages.map(img => img.id);
    
    // Shuffle function
    const shuffleArray = (array: string[]) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };
    
    let successCount = 0;
    const errors: string[] = [];
    
    for (const pool of poolsNeedingUpdate) {
      try {
        // Get current available and used image IDs
        const currentAvailable = pool.available_image_ids || [];
        const currentUsed = pool.used_image_ids || [];
        
        // Find new image IDs that this user doesn't have yet
        const currentAllIds = [...currentAvailable, ...currentUsed];
        const newImageIds = allImageIds.filter(id => !currentAllIds.includes(id));
        
        console.log(`📋 User ${pool.user_id?.substring(0, 8)}... - Adding ${newImageIds.length} new images`);
        
        // Add new images to available pool (shuffled)
        const updatedAvailable = shuffleArray([...currentAvailable, ...newImageIds]);
        
        const { error: updateError } = await supabase
          .from('user_image_pools')
          .update({
            available_image_ids: updatedAvailable,
            used_image_ids: currentUsed, // Keep existing used images
            total_images_in_database: allImages.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', pool.id);
        
        if (updateError) {
          const errorMsg = `Error updating pool for user ${pool.user_id}: ${updateError.message}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        } else {
          successCount++;
          console.log(`✅ Updated pool for user ${pool.user_id?.substring(0, 8)}...`);
        }
      } catch (error) {
        const errorMsg = `Exception updating pool for user ${pool.user_id}: ${error}`;
        console.error('💥', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    const message = `Successfully updated ${successCount}/${poolsNeedingUpdate.length} user pools with new images`;
    console.log(`\n🎉 ${message}`);
    
    return {
      success: successCount === poolsNeedingUpdate.length,
      message,
      details: {
        totalImages: allImages.length,
        poolsUpdated: successCount,
        poolsNeedingUpdate: poolsNeedingUpdate.length,
        totalPools: pools.length,
        errors: errors.length > 0 ? errors : undefined
      }
    };
    
  } catch (error) {
    console.error('💥 Unexpected error handling new images:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
};

// Make admin functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).adminUtils = {
    getDatabaseStats,
    resetAllUserImagePools,
    validateAllUserImagePools,
    getGuestPoolResetInstructions,
    handleNewImagesAdded
  };
} 