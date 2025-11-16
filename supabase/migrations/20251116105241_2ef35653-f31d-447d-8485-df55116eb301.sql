-- Update the handle_new_user function to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  
  -- Insert default role into user_roles
  INSERT INTO public.user_roles (user_id, role, profile_id)
  VALUES (new.id, 'employee', new.id);
  
  RETURN new;
END;
$$;

-- Sync existing profiles to user_roles table (for users who don't have roles yet)
INSERT INTO public.user_roles (user_id, role, profile_id)
SELECT 
  p.id,
  p.role,
  p.id
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = p.role
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;