import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export type YearConfidence = 'exact' | 'approximate' | 'decade' | 'unknown';

export interface PhotoSubmissionData {
  submitterName: string;
  email: string;
  photoFile: File;
  locationDescription: string;
  yearTaken?: number;
  yearConfidence: YearConfidence;
  description?: string;
  cluesDescription?: string;
}

export interface SubmitPhotoOptions extends Omit<PhotoSubmissionData, 'photoFile'> {
  photoUrl: string;
  photoMetadata?: {
    originalName: string;
    fileSize: number;
    fileType: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

/**
 * Upload photo to Supabase Storage with fallback to base64
 */
export async function uploadPhoto(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `photo-${timestamp}-${randomString}.${fileExtension}`;

    console.log('🚀 Attempting Supabase Storage upload:', fileName);

    // Try uploading to Supabase storage first
    const { data, error } = await supabase.storage
      .from('photo-submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.warn('⚠️ Supabase Storage failed, using base64 fallback:', error.message);
      
      // Fallback to base64 if storage fails
      const base64Result = await convertImageToBase64(file);
      if (base64Result.success) {
        console.log('✅ Base64 fallback successful');
        return { success: true, url: base64Result.dataUrl };
      } else {
        return { success: false, error: base64Result.error };
      }
    }

    // Get public URL if upload succeeded
    const { data: { publicUrl } } = supabase.storage
      .from('photo-submissions')
      .getPublicUrl(data.path);

    console.log('✅ Supabase Storage upload successful:', publicUrl);
    return { success: true, url: publicUrl };

  } catch (error) {
    console.warn('❌ Storage error, trying base64 fallback:', error);
    
    // Fallback to base64 on any error
    const base64Result = await convertImageToBase64(file);
    if (base64Result.success) {
      console.log('✅ Base64 fallback after error');
      return { success: true, url: base64Result.dataUrl };
    }
    
    return { success: false, error: 'Failed to upload photo' };
  }
}

/**
 * Convert image file to base64 data URL (fallback option)
 */
export async function convertImageToBase64(file: File): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
  try {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ success: true, dataUrl: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read image file' });
      };
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Image conversion error:', error);
    return { success: false, error: 'Failed to process image' };
  }
}

/**
 * Submit photo to the Supabase database
 */
export async function submitPhoto(options: SubmitPhotoOptions): Promise<{ success: boolean; error?: string; submissionId?: string }> {
  try {
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare submission data
    const submissionData: TablesInsert<'photo_submissions'> = {
      user_id: user?.id || null,
      submitter_name: options.submitterName,
      email: options.email,
      photo_url: options.photoUrl,
      location_description: options.locationDescription,
      year_taken: options.yearTaken || null,
      year_confidence: options.yearConfidence,
      description: options.description || null,
      clues_description: options.cluesDescription || null,
      photo_metadata: options.photoMetadata || null,
      submission_source: 'web_app',
      status: 'pending'
    };

    // Insert into database
    const { data, error } = await supabase
      .from('photo_submissions')
      .insert(submissionData)
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, submissionId: data.id };
  } catch (error) {
    console.error('Submission error:', error);
    return { success: false, error: 'Failed to submit photo' };
  }
}

/**
 * Main function to submit photo - handles upload and database insertion
 */
export async function submitPhotoWithFile(data: PhotoSubmissionData): Promise<{ success: boolean; error?: string; submissionId?: string }> {
  try {
    // Validate the data first
    const validation = validatePhotoSubmission(data);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('; ') };
    }

    console.log('📤 Starting photo submission...');

    // Upload photo (tries Storage first, falls back to base64)
    const uploadResult = await uploadPhoto(data.photoFile);
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error || 'Failed to upload photo' };
    }

    // Extract metadata
    const metadata = await extractImageMetadata(data.photoFile);

    // Submit to database
    const submitResult = await submitPhoto({
      submitterName: data.submitterName,
      email: data.email,
      photoUrl: uploadResult.url!,
      locationDescription: data.locationDescription,
      yearTaken: data.yearTaken,
      yearConfidence: data.yearConfidence,
      description: data.description,
      cluesDescription: data.cluesDescription,
      photoMetadata: metadata
    });

    if (submitResult.success) {
      console.log('✅ Photo submission completed:', submitResult.submissionId);
    }

    return submitResult;
  } catch (error) {
    console.error('Photo submission error:', error);
    return { success: false, error: 'Failed to submit photo' };
  }
}

/**
 * Validate photo submission data
 */
export function validatePhotoSubmission(data: Partial<PhotoSubmissionData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.submitterName?.trim()) {
    errors.push('Name is required');
  }

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (!data.photoFile) {
    errors.push('Photo is required');
  } else {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(data.photoFile.type)) {
      errors.push('Please upload a valid image file (JPEG, PNG, or WebP)');
    }

    // Validate file size (10MB max)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (data.photoFile.size > maxSizeInBytes) {
      errors.push('Photo size must be less than 10MB');
    }
  }

  if (!data.locationDescription?.trim()) {
    errors.push('Location description is required');
  } else if (data.locationDescription.length > 500) {
    errors.push('Location description must be less than 500 characters');
  }

  // Optional fields validation
  if (data.description && data.description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  if (data.cluesDescription && data.cluesDescription.length > 1000) {
    errors.push('Clues description must be less than 1000 characters');
  }

  if (data.yearTaken !== undefined) {
    const currentYear = new Date().getFullYear();
    if (data.yearTaken < 1800 || data.yearTaken > currentYear) {
      errors.push(`Year must be between 1800 and ${currentYear}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract metadata from image file
 */
export async function extractImageMetadata(file: File): Promise<{
  originalName: string;
  fileSize: number;
  fileType: string;
  lastModified: number;
  dimensions?: {
    width: number;
    height: number;
  };
}> {
  return new Promise((resolve) => {
    const metadata = {
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified
    };

    // Try to get image dimensions
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        resolve({
          ...metadata,
          dimensions: {
            width: img.width,
            height: img.height
          }
        });
      };
      img.onerror = () => resolve(metadata);
      img.src = URL.createObjectURL(file);
    } else {
      resolve(metadata);
    }
  });
} 