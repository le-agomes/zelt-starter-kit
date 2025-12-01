import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

// Define access levels for employee fields
const PUBLIC_FIELDS = [
  'full_name',
  'job_title',
  'department',
  'work_email',
  'location',
  'manager_profile_id',
  'status',
  'email',
];

const TEAM_FIELDS = [
  'phone_mobile',
  'emergency_name',
  'emergency_phone',
  'emergency_email',
  'emergency_relation',
];

const SENSITIVE_FIELDS = [
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
  'birth_date',
  'personal_email',
  'pronouns',
  'nationality',
  'gender',
  'preferred_name',
  'start_date',
  'end_date',
  'employment_type',
];

/**
 * Determines if a viewer can see a specific employee field
 * @param fieldKey - The field name to check
 * @param viewerRole - The role of the current user
 * @param isViewerManager - Whether the viewer is the direct manager of the employee
 * @returns true if the field should be visible, false otherwise
 */
export function canViewField(
  fieldKey: string,
  viewerRole: UserRole,
  isViewerManager: boolean = false
): boolean {
  // Admin and HR can see everything
  if (viewerRole === 'admin' || viewerRole === 'hr') {
    return true;
  }

  // Public fields are visible to everyone
  if (PUBLIC_FIELDS.includes(fieldKey)) {
    return true;
  }

  // Team fields are visible to IT and direct managers
  if (TEAM_FIELDS.includes(fieldKey)) {
    return viewerRole === 'it' || isViewerManager;
  }

  // Sensitive fields are only visible to admin/hr (already handled above)
  if (SENSITIVE_FIELDS.includes(fieldKey)) {
    return false;
  }

  // Default: allow if not explicitly restricted
  return true;
}

/**
 * Check if a user can edit employee records
 */
export function canEditEmployee(viewerRole: UserRole): boolean {
  return viewerRole === 'admin' || viewerRole === 'hr';
}

/**
 * Check if a user can create new employee records
 */
export function canCreateEmployee(viewerRole: UserRole): boolean {
  return viewerRole === 'admin' || viewerRole === 'hr';
}

/**
 * Check if a user can delete employee records
 */
export function canDeleteEmployee(viewerRole: UserRole): boolean {
  return viewerRole === 'admin';
}
