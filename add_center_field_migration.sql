-- Add center field to user_profiles table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE user_profiles 
ADD COLUMN center text;

-- No constraints needed - users can type any center location
-- This allows flexibility for any center name or location

-- Update existing users to have NULL center (they can update it later)
-- This is automatically handled since we're adding a nullable column 