import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { EditEmployeeDialog } from '@/components/EditEmployeeDialog';
import { PageContent } from '@/components/PageContent';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  User,
  Clock,
  Edit,
  Trash2,
  Check,
  ChevronsUpDown,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface Employee {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  department: string | null;
  location: string | null;
  start_date: string | null;
  status: 'active' | 'inactive' | 'on_leave' | 'candidate' | 'onboarding' | 'offboarded';
  created_at: string;
  org_id: string;
  manager_profile_id: string | null;
  manager_name?: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [isSavingManager, setIsSavingManager] = useState(false);

  const fetchEmployee = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        let managerName = null;
        
        // Fetch manager name if manager_profile_id exists
        if (data.manager_profile_id) {
          const { data: managerData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.manager_profile_id)
            .maybeSingle();
          
          managerName = managerData?.full_name || null;
        }

        setEmployee({
          ...data,
          manager_name: managerName,
        } as Employee);

        // Fetch profiles from same org for manager selection
        if (data.org_id) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('org_id', data.org_id)
            .order('full_name');

          if (!profilesError && profilesData) {
            setProfiles(profilesData);
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

  const handleManagerChange = async (managerId: string | null) => {
    if (!employee) return;

    setIsSavingManager(true);
    try {
      const { error } = await (supabase as any)
        .from('employees')
        .update({ manager_profile_id: managerId })
        .eq('id', employee.id);

      if (error) throw error;

      const managerName = managerId 
        ? profiles.find(p => p.id === managerId)?.full_name || null
        : null;

      setEmployee({
        ...employee,
        manager_profile_id: managerId,
        manager_name: managerName,
      });

      toast({
        title: 'Success',
        description: 'Manager updated successfully',
      });
      setManagerPopoverOpen(false);
    } catch (error) {
      console.error('Error updating manager:', error);
      toast({
        title: 'Error',
        description: 'Failed to update manager',
        variant: 'destructive',
      });
    } finally {
      setIsSavingManager(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleDelete = async () => {
    if (!employee) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
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

  if (isLoading) {
    return (
      <PageContent className="max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/employees')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-8 w-48 mt-4" />
                <Skeleton className="h-4 w-32 mt-2" />
                <Skeleton className="h-6 w-20 mt-3" />
              </div>
              <Separator className="my-6" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
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
      <PageContent className="max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/employees')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Card */}
        <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-4 border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-semibold text-foreground mt-4">
                  {employee.full_name}
                </h1>
                {employee.job_title && (
                  <p className="text-muted-foreground mt-1">{employee.job_title}</p>
                )}
                {employee.manager_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Reports to {employee.manager_name}</span>
                  </div>
                )}
                <Badge variant="secondary" className="mt-3">
                  {getStatusLabel(employee.status)}
                </Badge>
              </div>

              <Separator className="my-6" />

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground break-all">{employee.email}</p>
                  </div>
                </div>

                {employee.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm text-foreground">{employee.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manager Selection */}
              <div className="space-y-2">
                <Label htmlFor="manager-select" className="text-xs text-muted-foreground">
                  Manager
                </Label>
                <Popover open={managerPopoverOpen} onOpenChange={setManagerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="manager-select"
                      variant="outline"
                      role="combobox"
                      aria-expanded={managerPopoverOpen}
                      className="w-full justify-between"
                      disabled={isSavingManager}
                    >
                      {employee.manager_profile_id
                        ? profiles.find((p) => p.id === employee.manager_profile_id)?.full_name || 'Select manager...'
                        : 'Select manager...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search managers..." />
                      <CommandList>
                        <CommandEmpty>No manager found.</CommandEmpty>
                        <CommandGroup>
                          {employee.manager_profile_id && (
                            <CommandItem
                              value="none"
                              onSelect={() => handleManagerChange(null)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  !employee.manager_profile_id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              No manager
                            </CommandItem>
                          )}
                          {profiles
                            .filter((p) => p.id !== employee.id)
                            .map((profile) => (
                              <CommandItem
                                key={profile.id}
                                value={profile.full_name || profile.email || profile.id}
                                onSelect={() => handleManagerChange(profile.id)}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    employee.manager_profile_id === profile.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{profile.full_name || 'Unnamed'}</span>
                                  {profile.email && (
                                    <span className="text-xs text-muted-foreground">
                                      {profile.email}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {employee.department && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm text-foreground">{employee.department}</p>
                  </div>
                </div>
              )}

              {employee.start_date && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm text-foreground">
                      {format(new Date(employee.start_date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm text-foreground">
                    {format(new Date(employee.created_at), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="h-12"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
      </PageContent>

      {/* Edit Dialog */}
      {employee && (
        <EditEmployeeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          employee={employee}
          onSuccess={fetchEmployee}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {employee.full_name} from your organization.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
