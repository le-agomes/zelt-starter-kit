import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  ArrowLeft,
  Mail,
  Shield,
  User as UserIcon,
  Plus,
  X,
} from 'lucide-react';

type UserRole = 'admin' | 'hr' | 'manager' | 'it' | 'employee';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean | null;
};

type AdditionalRole = {
  id: string;
  role: UserRole;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'hr':
      return 'Human Resources';
    case 'manager':
      return 'Manager';
    case 'it':
      return 'IT Support';
    case 'employee':
      return 'Employee';
    default:
      return role;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin':
      return 'default';
    case 'hr':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [additionalRoles, setAdditionalRoles] = useState<AdditionalRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);

  const fetchUser = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email, role, active')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (profileData) {
        setUser(profileData);
      }

      // Fetch additional roles
      const { data: rolesData, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('id, role')
        .eq('user_id', id);

      if (rolesError) throw rolesError;
      
      // Filter out the primary role from additional roles
      const filtered = rolesData?.filter((r: AdditionalRole) => r.role !== profileData?.role) || [];
      setAdditionalRoles(filtered);

    } catch (error) {
      console.error('Error fetching user:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: { userId: user.id, role: newRole },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role updated',
      });

      await fetchUser();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActiveToggle = async (newActive: boolean) => {
    if (!user) return;

    if (!newActive) {
      setShowDeactivateWarning(true);
      return;
    }

    await updateActiveStatus(true);
  };

  const updateActiveStatus = async (newActive: boolean) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: { userId: user.id, active: newActive },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: newActive ? 'User activated' : 'User deactivated',
      });

      await fetchUser();
    } catch (error: any) {
      console.error('Error updating active status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
      setShowDeactivateWarning(false);
    }
  };

  const handleAddRole = async (roleToAdd: UserRole) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('manage-user-roles', {
        body: { userId: user.id, action: 'add', role: roleToAdd },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role added',
      });

      await fetchUser();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveRole = async (roleId: string, role: UserRole) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('manage-user-roles', {
        body: { userId: user.id, action: 'remove', role },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role removed',
      });

      await fetchUser();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <PageContent className="max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/users')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-8 w-48 mt-4" />
              <Skeleton className="h-6 w-32 mt-3" />
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

  if (!user) {
    return (
      <PageContent className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">User not found</p>
            <Button onClick={() => navigate('/app/users')} variant="outline" className="mt-4">
              Back to Users
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
          onClick={() => navigate('/app/users')}
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
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-semibold text-foreground mt-4">
              {user.full_name || 'Unnamed User'}
            </h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
              <Badge variant={user.active ? 'secondary' : 'outline'}>
                {user.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email Address</p>
                <p className="text-sm text-foreground break-all">{user.email || 'No email'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Primary Role</p>
                <Select
                  value={user.role}
                  onValueChange={handleRoleChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="text-sm text-foreground font-mono">{user.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                Account Status
              </Label>
              <p className="text-sm text-muted-foreground">
                {user.active ? 'User can access the system' : 'User access is disabled'}
              </p>
            </div>
            <Switch
              id="active-toggle"
              checked={user.active ?? false}
              onCheckedChange={handleActiveToggle}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Roles */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Additional Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {additionalRoles.map((roleItem) => (
              <Badge
                key={roleItem.id}
                variant="outline"
                className="gap-1 pr-1"
              >
                {getRoleLabel(roleItem.role)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-destructive/20"
                  onClick={() => handleRemoveRole(roleItem.id, roleItem.role)}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {additionalRoles.length === 0 && (
              <p className="text-sm text-muted-foreground">No additional roles</p>
            )}
          </div>

          <Select
            onValueChange={(value: UserRole) => handleAddRole(value)}
            disabled={isUpdating}
          >
            <SelectTrigger className="bg-background">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Add Role</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="it">IT</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

    </PageContent>

    {/* Deactivate Warning Dialog */}
    <AlertDialog open={showDeactivateWarning} onOpenChange={setShowDeactivateWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-destructive">Warning:</strong> User will be blocked from the app and will not be able to sign in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => updateActiveStatus(false)}
            disabled={isUpdating}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isUpdating ? 'Deactivating...' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
