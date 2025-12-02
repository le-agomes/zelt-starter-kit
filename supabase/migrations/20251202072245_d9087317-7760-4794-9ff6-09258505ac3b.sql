CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_org_id uuid := (new.raw_user_meta_data->>'org_id')::uuid;
  meta_role user_role := (new.raw_user_meta_data->>'role')::user_role;
  meta_full_name text := (new.raw_user_meta_data->>'full_name');
  default_role user_role := 'employee';
BEGIN
  -- 1. Create the profile for the new user
  INSERT INTO public.profiles (id, email, full_name, org_id, role, active)
  VALUES (
    new.id,
    new.email,
    COALESCE(meta_full_name, new.email),
    meta_org_id,
    COALESCE(meta_role, default_role),
    true
  );

  -- 2. Assign the permission role
  INSERT INTO public.user_roles (user_id, role, profile_id)
  VALUES (new.id, COALESCE(meta_role, default_role), new.id);

  -- 3. Link to existing employee record (The Fix)
  IF meta_org_id IS NOT NULL THEN
    UPDATE public.employees
    SET profile_id = new.id
    -- NOTE: 'status' update is removed so Onboarding Wizard can run
    WHERE email = new.email
      AND org_id = meta_org_id
      AND profile_id IS NULL; -- Safety check added
  END IF;

  RETURN new;
END;
$$;