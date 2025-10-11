-- Create enum for employee status
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'on_leave');

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  status employee_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for reading employees (users can view employees in their org if they are admin or hr)
CREATE POLICY "employees_read_org"
ON public.employees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = employees.org_id
    AND profiles.role IN ('admin', 'hr')
  )
);

-- Create RLS policy for inserting employees (only admin and hr can add employees)
CREATE POLICY "employees_insert_org"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = employees.org_id
    AND profiles.role IN ('admin', 'hr')
  )
);

-- Create RLS policy for updating employees (only admin and hr can update employees)
CREATE POLICY "employees_update_org"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = employees.org_id
    AND profiles.role IN ('admin', 'hr')
  )
);

-- Create RLS policy for deleting employees (only admin can delete employees)
CREATE POLICY "employees_delete_org"
ON public.employees
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.org_id = employees.org_id
    AND profiles.role = 'admin'
  )
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_employees_org_id ON public.employees(org_id);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_employees_created_at ON public.employees(created_at DESC);