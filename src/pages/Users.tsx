import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight } from 'lucide-react';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';

type User = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
  active: boolean;
};

// Mock data
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
      return 'Admin';
    case 'hr':
      return 'HR';
    case 'manager':
      return 'Manager';
    case 'it':
      return 'IT';
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

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: mockUsers.length,
    active: mockUsers.filter(u => u.active).length,
    inactive: mockUsers.filter(u => !u.active).length,
  };

  return (
    <PageContent className="max-w-2xl space-y-4">
      <PageHeader 
        title="Users" 
        description="Manage user accounts and roles"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11 bg-card border-border"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.active}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.inactive}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Inactive</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <div>
        {filteredUsers.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'No users found matching your search.'
                  : 'No users yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <Link key={user.id} to={`/app/users/${user.id}`}>
                <Card className="border-border transition-colors hover:bg-accent/5 active:bg-accent/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground truncate">
                            {user.full_name}
                          </h3>
                          <Badge 
                            variant={getRoleBadgeVariant(user.role)}
                            className="text-xs shrink-0"
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                          <Badge 
                            variant={user.active ? 'secondary' : 'outline'}
                            className="text-xs shrink-0"
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContent>
  );
}
