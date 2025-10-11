-- Add new status values to the enum
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'candidate';
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.employee_status ADD VALUE IF NOT EXISTS 'offboarded';

-- Add location and start_date columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE;