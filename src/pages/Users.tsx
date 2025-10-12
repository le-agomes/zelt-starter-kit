import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Fetch current user's org_id
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch users in the same org
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', currentUser?.org_id],
    queryFn: async () => {
      if (!currentUser?.org_id) return [];
      
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email, role, active')
        .eq('org_id', currentUser.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as User[];
    },
    enabled: !!currentUser?.org_id,
  });

  // Show error toast if query fails
  if (error) {
    toast({
      title: 'Error',
      description: 'Failed to load users',
      variant: 'destructive',
    });
  }

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user) => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [users, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, inactive: 0 };
    
    return {
      total: users.length,
      active: users.filter(u => u.active).length,
      inactive: users.filter(u => !u.active).length,
    };
  }, [users]);

  // Paginate
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
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
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-11 bg-card border-border"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {isLoading ? '—' : stats.total}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {isLoading ? '—' : stats.active}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {isLoading ? '—' : stats.inactive}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Inactive</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paginatedUsers.length === 0 ? (
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
          <>
            <div className="space-y-2">
              {paginatedUsers.map((user) => (
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
                            {user.full_name || 'Unnamed User'}
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
                          {user.email || 'No email'}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
        )}
      </div>
    </PageContent>
  );
}
