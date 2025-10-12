-- Add email and active fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Create index for email searches
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create index for full_name searches
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Update existing profiles to sync email from auth.users
UPDATE public.profiles p
SET email = (
  SELECT au.email 
  FROM auth.users au 
  WHERE au.id = p.id
)
WHERE p.email IS NULL;