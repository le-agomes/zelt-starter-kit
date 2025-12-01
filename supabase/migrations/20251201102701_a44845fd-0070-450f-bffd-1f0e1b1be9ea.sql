-- Update handle_new_user trigger to use org_id from invite metadata
-- This ensures new invited users get their org_id set immediately

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id_from_meta uuid;
BEGIN
  -- Try to extract org_id from user metadata (invite flow)
  org_id_from_meta := (NEW.raw_user_meta_data->>'org_id')::uuid;
  
  -- Insert into profiles with org_id if available
  INSERT INTO public.profiles (id, email, full_name, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    org_id_from_meta
  );
  
  -- Insert default role into user_roles
  INSERT INTO public.user_roles (user_id, role, profile_id)
  VALUES (NEW.id, 'employee', NEW.id);
  
  RETURN NEW;
END;
$$;