-- Data repair migration: Fix orphaned profiles
-- This migration links profiles to employees and updates org_id

-- Step 1: Link profiles to employees where employee already has the profile_id set
UPDATE profiles p
SET org_id = e.org_id
FROM employees e
WHERE p.org_id IS NULL
  AND e.profile_id = p.id
  AND e.org_id IS NOT NULL;

-- Step 2: Link profiles to employees by matching emails (email field)
UPDATE profiles p
SET org_id = e.org_id
FROM employees e
WHERE p.org_id IS NULL
  AND e.profile_id IS NULL
  AND e.email = p.email
  AND e.org_id IS NOT NULL;

-- Step 3: Link profiles to employees by matching work_email
UPDATE profiles p
SET org_id = e.org_id
FROM employees e
WHERE p.org_id IS NULL
  AND e.profile_id IS NULL
  AND e.work_email = p.email
  AND e.work_email IS NOT NULL
  AND e.org_id IS NOT NULL;

-- Step 4: Link profiles to employees by matching personal_email
UPDATE profiles p
SET org_id = e.org_id
FROM employees e
WHERE p.org_id IS NULL
  AND e.profile_id IS NULL
  AND e.personal_email = p.email
  AND e.personal_email IS NOT NULL
  AND e.org_id IS NOT NULL;

-- Step 5: Update employee profile_id where email matches
UPDATE employees e
SET profile_id = p.id
FROM profiles p
WHERE e.profile_id IS NULL
  AND (e.email = p.email OR e.work_email = p.email OR e.personal_email = p.email)
  AND p.org_id = e.org_id;

-- Step 6: Update profile role to 'employee' where they have a linked employee record
UPDATE profiles p
SET role = 'employee'
FROM employees e
WHERE e.profile_id = p.id
  AND p.role != 'employee'
  AND e.org_id = p.org_id;