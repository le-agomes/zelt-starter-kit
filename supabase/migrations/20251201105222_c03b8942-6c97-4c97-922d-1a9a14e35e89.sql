-- Sync user_roles to match profiles.role for all mismatched records
UPDATE user_roles ur
SET role = p.role
FROM profiles p
WHERE ur.user_id = p.id
  AND ur.role != p.role;

-- Update handle_new_user trigger to use consistent role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  org_id_from_meta uuid;
  role_from_meta user_role;
BEGIN
  -- Extract from metadata
  org_id_from_meta := (NEW.raw_user_meta_data->>'org_id')::uuid;
  role_from_meta := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'::user_role);
  
  -- Insert profile with consistent role
  INSERT INTO public.profiles (id, email, full_name, org_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    org_id_from_meta,
    role_from_meta
  );
  
  -- Insert SAME role into user_roles
  INSERT INTO public.user_roles (user_id, role, profile_id)
  VALUES (NEW.id, role_from_meta, NEW.id);
  
  RETURN NEW;
END;
$$;