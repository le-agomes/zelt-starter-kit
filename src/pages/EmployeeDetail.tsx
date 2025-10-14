import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  ArrowLeft,
  Edit,
  Trash2,
  Play,
  Save,
  X,
  EyeOff,
  User,
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [systemFields, setSystemFields] = useState<Record<string, FieldConfig>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [userRole, setUserRole] = useState<string>('employee');
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);

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

  const handleSaveChanges = async () => {
    if (!employee) return;

    setIsSaving(true);
    try {
      // Separate system fields and custom fields from editedValues
      const systemFieldUpdates: Record<string, any> = {};
      const customFieldUpdates: Array<{ field_id: string; value: any }> = [];

      Object.keys(editedValues).forEach((key) => {
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
      setEditedValues({});
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedValues({});
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
                  onClick={handleSaveChanges}
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
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setStartRunDialogOpen(true)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Workflow
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
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

        {/* Core Fields */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Core Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Title */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Job Title</Label>
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
                {isEditing ? (
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
            
            if (systemFieldKeys.length === 0 && customFieldsList.length === 0) return null;

            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle>{section}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {/* System Fields */}
                    {systemFieldKeys.map(fieldKey => (
                      <div key={fieldKey} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {formatFieldName(fieldKey)}
                          {systemFields[fieldKey]?.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderFieldInput(fieldKey, formatFieldName(fieldKey))}
                      </div>
                    ))}

                    {/* Custom Fields */}
                    {customFieldsList.map(field => (
                      <div key={field.id} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                          {field.is_sensitive && <span className="ml-1 text-amber-600">(Sensitive)</span>}
                        </Label>
                        {renderFieldInput(field.id, field.label, field.type, field.options, true, field.is_sensitive)}
                      </div>
                    ))}
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
    </>
  );
}
