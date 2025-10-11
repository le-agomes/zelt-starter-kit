-- Create user_roles table (roles must be in separate table for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create helper function to check if user can access org
CREATE OR REPLACE FUNCTION public.user_can_access_org(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND org_id = _org_id
      AND (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'hr')
      )
  );
$$;

-- Drop old recursive policies
DROP POLICY IF EXISTS profiles_read_org ON public.profiles;
DROP POLICY IF EXISTS employees_read_org ON public.employees;
DROP POLICY IF EXISTS employees_insert_org ON public.employees;
DROP POLICY IF EXISTS employees_update_org ON public.employees;
DROP POLICY IF EXISTS employees_delete_org ON public.employees;

-- Create new non-recursive policies for profiles
CREATE POLICY profiles_read_org ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles me
    WHERE me.id = auth.uid()
      AND me.org_id IS NOT NULL
      AND me.org_id = profiles.org_id
      AND (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'hr')
      )
  )
);

-- Create new non-recursive policies for employees
CREATE POLICY employees_read_org ON public.employees
FOR SELECT
TO authenticated
USING (public.user_can_access_org(employees.org_id));

CREATE POLICY employees_insert_org ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (public.user_can_access_org(employees.org_id));

CREATE POLICY employees_update_org ON public.employees
FOR UPDATE
TO authenticated
USING (public.user_can_access_org(employees.org_id));

CREATE POLICY employees_delete_org ON public.employees
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND public.user_can_access_org(employees.org_id));

-- RLS policies for user_roles table
CREATE POLICY user_roles_read_self ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_roles_read_org ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND org_id IN (
        SELECT org_id FROM public.profiles WHERE id = user_roles.user_id
      )
      AND public.has_role(auth.uid(), 'admin')
  )
);