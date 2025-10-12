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
import { Skeleton } from '@/components/ui/skeleton';
import { PageContent } from '@/components/PageContent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Mail,
  Shield,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
  active: boolean | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUser = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch both the target user and current user's role
      const [userResult, currentUserResult] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('id, full_name, email, role, active')
          .eq('id', id)
          .maybeSingle(),
        (supabase as any)
          .from('profiles')
          .select('role')
          .eq('id', (await supabase.auth.getUser()).data.user?.id)
          .single()
      ]);

      if (userResult.error) throw userResult.error;
      
      if (userResult.data) {
        setUser(userResult.data);
      }

      if (currentUserResult.data) {
        setCurrentUserRole(currentUserResult.data.role);
      }
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

  const handleRoleChange = async (newRole: string) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: { userId: user.id, role: newRole }
      });

      if (error) throw error;

      setUser({ ...user, role: newRole as any });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      const message = error.message?.includes('permission') 
        ? "You don't have permission to modify users"
        : 'Failed to update user role';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleActiveChange = async (newActive: boolean) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('update-user-profile', {
        body: { userId: user.id, active: newActive }
      });

      if (error) throw error;

      setUser({ ...user, active: newActive });
      toast({
        title: 'Success',
        description: `User ${newActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating active status:', error);
      const message = error.message?.includes('permission') 
        ? "You don't have permission to modify users"
        : 'Failed to update user status';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

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
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm text-foreground">{getRoleLabel(user.role)}</p>
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
        <CardContent className="space-y-6">
          {/* Primary Role */}
          <div className="space-y-2">
            <Label htmlFor="role-select" className="text-sm font-medium">
              Primary Role
            </Label>
            <Select 
              value={user.role} 
              onValueChange={handleRoleChange}
              disabled={!currentUserRole || (currentUserRole !== 'admin' && currentUserRole !== 'hr') || isSaving}
            >
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="it">IT Support</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Active Status */}
          <div className="space-y-3">
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
                onCheckedChange={handleActiveChange}
                disabled={!currentUserRole || (currentUserRole !== 'admin' && currentUserRole !== 'hr') || isSaving}
              />
            </div>
            
            {!user.active && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  User will be blocked from the app
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

    </PageContent>
  );
}
