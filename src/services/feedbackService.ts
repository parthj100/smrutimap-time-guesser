import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'ui' | 'performance' | 'content';

export interface FeedbackData {
  category: FeedbackCategory;
  message: string;
  email?: string;
}

export interface SubmitFeedbackOptions {
  category: FeedbackCategory;
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
}

/**
 * Submit feedback to the Supabase database
 */
export async function submitFeedback(options: SubmitFeedbackOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare feedback data
    const feedbackInsert: TablesInsert<'feedback'> = {
      category: options.category,
      message: options.message.trim(),
      email: options.email?.trim() || null,
      user_id: user?.id || null,
      page_url: options.pageUrl || window.location.href,
      user_agent: options.userAgent || navigator.userAgent,
      status: 'open'
    };

    // Insert feedback into database
    const { error } = await supabase
      .from('feedback')
      .insert([feedbackInsert]);

    if (error) {
      console.error('Error submitting feedback:', error);
      return { 
        success: false, 
        error: 'Failed to submit feedback. Please try again.' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error submitting feedback:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}

/**
 * Get feedback submissions for the current user (if logged in)
 */
export async function getUserFeedback(): Promise<{ data?: any[]; error?: string }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: 'User not logged in' };
    }

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return { error: 'Failed to fetch feedback history' };
    }

    return { data };
  } catch (error) {
    console.error('Unexpected error fetching feedback:', error);
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Validate feedback data before submission
 */
export function validateFeedback(data: FeedbackData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check message
  if (!data.message || data.message.trim().length === 0) {
    errors.push('Feedback message is required');
  } else if (data.message.trim().length > 2000) {
    errors.push('Feedback message must be 2000 characters or less');
  }

  // Check category
  const validCategories: FeedbackCategory[] = ['general', 'bug', 'feature', 'ui', 'performance', 'content'];
  if (!validCategories.includes(data.category)) {
    errors.push('Invalid feedback category');
  }

  // Check email if provided
  if (data.email && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Invalid email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 