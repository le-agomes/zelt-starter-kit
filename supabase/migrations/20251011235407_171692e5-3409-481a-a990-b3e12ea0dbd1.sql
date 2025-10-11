-- Create security definer function to get user's org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS profiles_read_org ON public.profiles;

-- Create new non-recursive policy using security definer function
CREATE POLICY profiles_read_org ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.get_user_org_id(auth.uid()) = profiles.org_id
  AND public.get_user_org_id(auth.uid()) IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'hr')
  )
);