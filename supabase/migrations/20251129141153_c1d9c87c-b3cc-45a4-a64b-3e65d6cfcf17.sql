-- Data repair script: Link orphaned profiles to employees and fix org_id
-- This is a one-time migration to clean up existing data

-- Step 1: Link profiles to employees where emails match and org_id is null
UPDATE profiles p
SET org_id = e.org_id
FROM employees e
WHERE p.org_id IS NULL
  AND p.id != e.profile_id
  AND (p.email = e.email OR p.email = e.work_email OR p.email = e.personal_email);

-- Step 2: Link employees to profiles where emails match and profile_id is null
UPDATE employees e
SET profile_id = p.id
FROM profiles p
WHERE e.profile_id IS NULL
  AND (e.email = p.email OR e.work_email = p.email OR e.personal_email = p.email);

-- Step 3: Update profiles role to 'employee' if they were linked
UPDATE profiles p
SET role = 'employee'
FROM employees e
WHERE e.profile_id = p.id
  AND p.role != 'admin'
  AND p.role != 'hr';