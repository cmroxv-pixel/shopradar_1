-- Add theme_preference column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'ocean';
