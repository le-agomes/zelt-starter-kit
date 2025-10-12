import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageContent } from '@/components/PageContent';
import {
  ArrowLeft,
  Mail,
  Shield,
  User as UserIcon,
} from 'lucide-react';

type User = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
  active: boolean;
};

// Mock data - same as Users.tsx
const mockUsers: User[] = [
  {
    id: '1',
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'admin',
    active: true,
  },
  {
    id: '2',
    full_name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'hr',
    active: true,
  },
  {
    id: '3',
    full_name: 'Emma Williams',
    email: 'emma.williams@company.com',
    role: 'manager',
    active: true,
  },
  {
    id: '4',
    full_name: 'James Taylor',
    email: 'james.taylor@company.com',
    role: 'employee',
    active: false,
  },
];

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
  
  // Find user from mock data
  const user = mockUsers.find(u => u.id === id);
  const [isActive, setIsActive] = useState(user?.active ?? false);

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
              {user.full_name}
            </h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
              <Badge variant={isActive ? 'secondary' : 'outline'}>
                {isActive ? 'Active' : 'Inactive'}
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
                <p className="text-sm text-foreground break-all">{user.email}</p>
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
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                Account Status
              </Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'User can access the system' : 'User access is disabled'}
              </p>
            </div>
            <Switch
              id="active-toggle"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Notice */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            This is a mock view. Database integration coming soon.
          </p>
        </CardContent>
      </Card>
    </PageContent>
  );
}
