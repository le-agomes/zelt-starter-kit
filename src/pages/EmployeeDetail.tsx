import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { canViewField, canEditEmployee, canDeleteEmployee } from '@/utils/permissions';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageContent } from '@/components/PageContent';
import { StartRunDialog } from '@/components/StartRunDialog';
import { SendFormRequestDialog } from '@/components/SendFormRequestDialog';
// import { NewChatDialog } from '@/components/NewChatDialog'; // Temporarily hidden due to chat performance issues
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Save,
  X,
  EyeOff,
  User,
  Mail,
  // MessageSquare, // Temporarily hidden due to chat performance issues
} from 'lucide-react';

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'on_leave':
      return 'On Leave';
    default:
      return status;
  }
};

interface FieldConfig {
  visible: boolean;
  required: boolean;
  section: string;
  ordinal: number;
}

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[];
  section: string;
  required: boolean;
  is_sensitive: boolean;
  active: boolean;
  ordinal: number;
}

const SECTIONS = ['Identity', 'Contact', 'Employment', 'Emergency'];

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Sections that employees can self-edit (not Employment)
const SELF_EDITABLE_SECTIONS = ['Identity', 'Contact', 'Emergency'];

// Employment fields that are always read-only for self-editing
const EMPLOYMENT_FIELDS = ['job_title', 'department', 'manager_profile_id', 'status', 'start_date', 'end_date', 'employment_type', 'location'];

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [startRunDialogOpen, setStartRunDialogOpen] = useState(false);
  const [sendFormDialogOpen, setSendFormDialogOpen] = useState(false);
  // const [showNewChatDialog, setShowNewChatDialog] = useState(false); // Temporarily hidden due to chat performance issues
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [systemFields, setSystemFields] = useState<Record<string, FieldConfig>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [userRole, setUserRole] = useState<Database['public']['Enums']['user_role']>('employee');
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);
  const [isViewerManager, setIsViewerManager] = useState(false);

  // Check if user is viewing their own profile
  const isOwnProfile = employee?.profile_id === user?.id;
  const canSelfEdit = isOwnProfile && !canEditEmployee(userRole);

  const fetchEmployee = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch employee
      const { data: empData, error: empError } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (empError) throw empError;
      if (!empData) return;

      setEmployee(empData);

      // Fetch org settings for system fields config
      const { data: settingsData, error: settingsError } = await supabase.functions.invoke('get-org-settings');
      if (!settingsError && settingsData?.employee_system_fields) {
        setSystemFields(settingsData.employee_system_fields);
      }

      // Fetch custom fields
      const { data: customData, error: customError } = await (supabase as any)
        .from('employee_fields')
        .select('*')
        .eq('org_id', empData.org_id)
        .eq('active', true)
        .order('section')
        .order('ordinal');

      if (!customError && customData) {
        setCustomFields(customData);

        // Fetch field values
        const fieldIds = customData.map((f: CustomField) => f.id);
        if (fieldIds.length > 0) {
          const { data: valuesData, error: valuesError } = await (supabase as any)
            .from('employee_field_values')
            .select('*')
            .eq('employee_id', id)
            .in('field_id', fieldIds);

          if (!valuesError && valuesData) {
            const valuesMap: Record<string, any> = {};
            valuesData.forEach((v: any) => {
              valuesMap[v.field_id] = v.value;
            });
            setFieldValues(valuesMap);
          }
        }
      }

      // Fetch user role and available managers
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileData?.role) {
          setUserRole(profileData.role);
          // Check if viewer is the manager of this employee
          setIsViewerManager(empData.manager_profile_id === user.id);
        }

        // Fetch available managers (all users in the same org)
        if (empData.org_id) {
          const { data: managersData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('org_id', empData.org_id)
            .order('full_name');
          
          if (managersData) {
            setAvailableManagers(managersData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employee details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validate required fields before saving
  const validateRequiredFields = (section?: string): string[] => {
    const errors: string[] = [];
    
    // Get fields to validate based on section
    const fieldsToValidate = section 
      ? Object.entries(systemFields).filter(([_, config]) => config.section === section)
      : Object.entries(systemFields);
    
    // Validate system fields
    for (const [key, config] of fieldsToValidate) {
      if (config.required && config.visible) {
        const value = editedValues[key] !== undefined ? editedValues[key] : employee?.[key];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(formatFieldName(key));
        }
      }
    }
    
    // Validate custom fields
    const customFieldsToValidate = section
      ? customFields.filter(f => f.section === section)
      : customFields;
      
    for (const field of customFieldsToValidate) {
      if (field.required && field.active) {
        const value = editedValues[field.id] !== undefined ? editedValues[field.id] : fieldValues[field.id];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(field.label);
        }
      }
    }
    
    return errors;
  };

  const handleSaveChanges = async (section?: string) => {
    if (!employee) return;

    // Validate required fields
    const validationErrors = validateRequiredFields(section);
    if (validationErrors.length > 0) {
      toast({
        title: 'Required Fields Missing',
        description: `Please fill in: ${validationErrors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Separate system fields and custom fields from editedValues
      const systemFieldUpdates: Record<string, any> = {};
      const customFieldUpdates: Array<{ field_id: string; value: any }> = [];

      // For self-editing, filter out employment fields
      const allowedKeys = canSelfEdit 
        ? Object.keys(editedValues).filter(key => !EMPLOYMENT_FIELDS.includes(key))
        : Object.keys(editedValues);

      allowedKeys.forEach((key) => {
        if (customFields.find(f => f.id === key)) {
          customFieldUpdates.push({ field_id: key, value: editedValues[key] });
        } else {
          systemFieldUpdates[key] = editedValues[key];
        }
      });

      // Update system fields in employees table
      if (Object.keys(systemFieldUpdates).length > 0) {
        const { error } = await (supabase as any)
          .from('employees')
          .update(systemFieldUpdates)
          .eq('id', employee.id);

        if (error) throw error;

        setEmployee({ ...employee, ...systemFieldUpdates });
      }

      // Upsert custom field values
      for (const { field_id, value } of customFieldUpdates) {
        const { error } = await (supabase as any)
          .from('employee_field_values')
          .upsert({
            employee_id: employee.id,
            field_id,
            value,
          }, {
            onConflict: 'employee_id,field_id'
          });

        if (error) throw error;

        setFieldValues(prev => ({ ...prev, [field_id]: value }));
      }

      toast({
        title: 'Success',
        description: 'Changes saved successfully',
      });

      setIsEditing(false);
      setEditingSection(null);
      setEditedValues({});
    } catch (error: any) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingSection(null);
    setEditedValues({});
  };

  const handleStartSectionEdit = (section: string) => {
    setEditingSection(section);
    setIsEditing(true);
  };

  // Check if a field is editable in current context
  const isFieldEditable = (fieldKey: string, section: string) => {
    // Full admin/HR editing mode
    if (isEditing && !editingSection && canEditEmployee(userRole)) {
      return true;
    }
    // Section-specific editing (self-service or admin)
    if (isEditing && editingSection === section) {
      // Employment fields are never self-editable
      if (canSelfEdit && EMPLOYMENT_FIELDS.includes(fieldKey)) {
        return false;
      }
      return true;
    }
    return false;
  };

  const handleDelete = async () => {
    if (!employee) return;

    setIsDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
      navigate('/app/employees');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete employee',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id, user]);

  const getFieldValue = (key: string, isCustom: boolean = false) => {
    if (editedValues[key] !== undefined) return editedValues[key];
    if (isCustom) return fieldValues[key] || '';
    return employee?.[key] || '';
  };

  const setFieldValue = (key: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const canSeeSensitiveField = () => {
    return userRole === 'admin' || userRole === 'hr';
  };

  const renderFieldInput = (key: string, label: string, type: string = 'text', options: string[] = [], isCustom: boolean = false, isSensitive: boolean = false) => {
    const value = getFieldValue(key, isCustom);
    const fieldKey = isCustom ? key : key;

    if (!isEditing) {
      if (isSensitive && !canSeeSensitiveField()) {
        return (
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Hidden (sensitive)</span>
          </div>
        );
      }
      return <p className="text-sm">{value || '—'}</p>;
    }

    if (type === 'select') {
      return (
        <Select value={value} onValueChange={(v) => setFieldValue(fieldKey, v)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'multiselect') {
      return (
        <Input
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => setFieldValue(fieldKey, e.target.value.split(',').map(v => v.trim()))}
          placeholder={`Enter ${label}`}
        />
      );
    }

    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => setFieldValue(fieldKey, e.target.checked)}
          className="h-4 w-4"
        />
      );
    }

    if (type === 'date') {
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => setFieldValue(fieldKey, e.target.value)}
        />
      );
    }

    if (type === 'number') {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => setFieldValue(fieldKey, e.target.value)}
        />
      );
    }

    if (type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => setFieldValue(fieldKey, e.target.value)}
          rows={3}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => setFieldValue(fieldKey, e.target.value)}
        placeholder={`Enter ${label}`}
      />
    );
  };

  const getSystemFieldsBySection = (section: string) => {
    return Object.entries(systemFields)
      .filter(([_, config]) => config.section === section && config.visible)
      .sort((a, b) => a[1].ordinal - b[1].ordinal)
      .map(([key]) => key);
  };

  const getCustomFieldsBySection = (section: string) => {
    return customFields
      .filter(f => f.section === section)
      .sort((a, b) => a.ordinal - b.ordinal);
  };

  if (isLoading) {
    return (
      <PageContent className="max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/employees')}
          className="-ml-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      </PageContent>
    );
  }

  if (!employee) {
    return (
      <PageContent className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Employee not found</p>
            <Button onClick={() => navigate('/app/employees')} variant="outline" className="mt-4">
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </PageContent>
    );
  }

  return (
    <>
      <PageContent className="max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/employees')}
            className="-ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSaveChanges(editingSection || undefined)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {(userRole === 'admin' || userRole === 'hr') && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setStartRunDialogOpen(true)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Workflow
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSendFormDialogOpen(true)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Form
                    </Button>
                    {/* Temporarily hidden due to chat performance issues
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowNewChatDialog(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                    */}
                  </>
                )}
                {canEditEmployee(userRole) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {canDeleteEmployee(userRole) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                  {getInitials(employee.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold">{employee.full_name}</h1>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
              <Badge variant="secondary">
                {getStatusLabel(employee.status)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Core Fields - Employment info (read-only for self-editing) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Core Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Job Title</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Input
                    value={getFieldValue('job_title')}
                    onChange={(e) => setFieldValue('job_title', e.target.value)}
                    placeholder="Enter job title"
                  />
                ) : (
                  <p className="text-sm">{employee.job_title || '—'}</p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Department</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Input
                    value={getFieldValue('department')}
                    onChange={(e) => setFieldValue('department', e.target.value)}
                    placeholder="Enter department"
                  />
                ) : (
                  <p className="text-sm">{employee.department || '—'}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Location</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Input
                    value={getFieldValue('location')}
                    onChange={(e) => setFieldValue('location', e.target.value)}
                    placeholder="Enter location"
                  />
                ) : (
                  <p className="text-sm">{employee.location || '—'}</p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Input
                    type="date"
                    value={getFieldValue('start_date')}
                    onChange={(e) => setFieldValue('start_date', e.target.value)}
                  />
                ) : (
                  <p className="text-sm">{employee.start_date || '—'}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Select 
                    value={getFieldValue('status')} 
                    onValueChange={(v) => setFieldValue('status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{getStatusLabel(employee.status)}</p>
                )}
              </div>

              {/* Manager */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Manager</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Select 
                    value={getFieldValue('manager_profile_id') || ''} 
                    onValueChange={(v) => setFieldValue('manager_profile_id', v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager">
                        {getFieldValue('manager_profile_id') ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>
                              {availableManagers.find(m => m.id === getFieldValue('manager_profile_id'))?.full_name || 'Select manager'}
                            </span>
                          </div>
                        ) : (
                          'Select manager'
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No manager</SelectItem>
                      {availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{manager.full_name || manager.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {employee.manager_profile_id ? (
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {availableManagers.find(m => m.id === employee.manager_profile_id)?.full_name || 
                         availableManagers.find(m => m.id === employee.manager_profile_id)?.email || 
                         '—'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                )}
              </div>

              {/* Work Email */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Work Email</Label>
                {isEditing && !editingSection && canEditEmployee(userRole) ? (
                  <Input
                    type="email"
                    value={getFieldValue('work_email')}
                    onChange={(e) => setFieldValue('work_email', e.target.value)}
                    placeholder="Enter work email"
                  />
                ) : (
                  <p className="text-sm">{employee.work_email || '—'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Additional Details</h2>
          <p className="text-sm text-muted-foreground">Configurable fields based on your organization settings</p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map(section => {
            const systemFieldKeys = getSystemFieldsBySection(section);
            const customFieldsList = getCustomFieldsBySection(section);
            
            // Filter fields based on permissions
            const visibleSystemFields = systemFieldKeys.filter(fieldKey => 
              canViewField(fieldKey, userRole, isViewerManager)
            );
            const visibleCustomFields = customFieldsList.filter(field =>
              !field.is_sensitive || canViewField('sensitive_custom_field', userRole, isViewerManager)
            );
            
            // Hide section if no visible fields
            if (visibleSystemFields.length === 0 && visibleCustomFields.length === 0) return null;

            const isSectionEditing = editingSection === section;
            const canEditThisSection = canEditEmployee(userRole) || (canSelfEdit && SELF_EDITABLE_SECTIONS.includes(section));

            return (
              <Card key={section}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{section}</CardTitle>
                  {/* Section Edit Button for self-service or admin */}
                  {!isEditing && canEditThisSection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartSectionEdit(section)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {isSectionEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSaveChanges(section)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                   <div className="grid gap-4">
                    {/* System Fields */}
                    {systemFieldKeys.map(fieldKey => {
                      // Check if viewer has permission to see this field
                      if (!canViewField(fieldKey, userRole, isViewerManager)) {
                        return null;
                      }
                      
                      const editable = isFieldEditable(fieldKey, section);
                      
                      return (
                        <div key={fieldKey} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {formatFieldName(fieldKey)}
                            {systemFields[fieldKey]?.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {editable ? renderFieldInput(fieldKey, formatFieldName(fieldKey)) : (
                            <p className="text-sm">{employee?.[fieldKey] || '—'}</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Custom Fields */}
                    {customFieldsList.map(field => {
                      // Apply same field-level security to custom fields if they're marked sensitive
                      if (field.is_sensitive && !canViewField('sensitive_custom_field', userRole, isViewerManager)) {
                        return null;
                      }
                      
                      const editable = isFieldEditable(field.id, section);
                      
                      return (
                        <div key={field.id} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                            {field.is_sensitive && <span className="ml-1 text-amber-600">(Sensitive)</span>}
                          </Label>
                          {editable ? renderFieldInput(field.id, field.label, field.type, field.options, true, field.is_sensitive) : (
                            field.is_sensitive && !canSeeSensitiveField() ? (
                              <div className="flex items-center gap-2">
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Hidden (sensitive)</span>
                              </div>
                            ) : (
                              <p className="text-sm">{fieldValues[field.id] || '—'}</p>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PageContent>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee
              record for {employee.full_name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Run Dialog */}
      <StartRunDialog
        employeeId={employee.id}
        open={startRunDialogOpen}
        onOpenChange={setStartRunDialogOpen}
      />

      {/* Send Form Request Dialog */}
      <SendFormRequestDialog
        employeeId={employee.id}
        open={sendFormDialogOpen}
        onClose={() => setSendFormDialogOpen(false)}
        onSuccess={() => {
          setSendFormDialogOpen(false);
          toast({
            title: 'Success',
            description: 'Form request sent successfully',
          });
        }}
      />

      {/* Temporarily hidden due to chat performance issues
      <NewChatDialog
        open={showNewChatDialog}
        onOpenChange={setShowNewChatDialog}
        preSelectedEmployeeId={employee?.id}
      />
      */}
    </>
  );
}
