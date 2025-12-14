import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { canCreateEmployee } from '@/utils/permissions';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronRight, ChevronLeft, Filter } from 'lucide-react'; // MessageSquare temporarily hidden due to chat performance issues
import { NewEmployeeDialog } from '@/components/NewEmployeeDialog';
// import { NewChatDialog } from '@/components/NewChatDialog'; // Temporarily hidden due to chat performance issues
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';

const ITEMS_PER_PAGE = 20;

type Employee = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  department: string | null;
  location: string | null;
  start_date: string | null;
  status: 'candidate' | 'onboarding' | 'active' | 'inactive' | 'on_leave' | 'offboarded';
  created_at: string;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'candidate':
      return 'Candidate';
    case 'onboarding':
      return 'Onboarding';
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'on_leave':
      return 'On Leave';
    case 'offboarded':
      return 'Offboarded';
    default:
      return status;
  }
};

export default function Employees() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  // const [showNewChatDialog, setShowNewChatDialog] = useState(false); // Temporarily hidden due to chat performance issues
  // const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(); // Temporarily hidden due to chat performance issues

  // Fetch current user's role
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
  });

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter and paginate employees
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter((employee) => {
      // Search filter
      const matchesSearch = 
        employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      
      // Department filter
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, searchQuery, statusFilter, departmentFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!employees) return { total: 0, active: 0, onLeave: 0 };
    
    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      onLeave: employees.filter(e => e.status === 'on_leave').length,
    };
  }, [employees]);

  // Paginate
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const userRole = userProfile?.role as Database['public']['Enums']['user_role'] | undefined;

  return (
    <PageContent className="max-w-2xl space-y-4">
      <PageHeader 
        title="Employees" 
        description="Browse team members"
        actions={userRole && canCreateEmployee(userRole) ? <NewEmployeeDialog /> : undefined}
      />

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleFilterChange();
            }}
            className="pl-9 bg-card border-border"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              handleFilterChange();
            }}>
              <SelectTrigger className="bg-card border-border">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="offboarded">Offboarded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={departmentFilter} onValueChange={(value) => {
              setDepartmentFilter(value);
              handleFilterChange();
            }}>
              <SelectTrigger className="bg-card border-border">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept as string}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-semibold text-foreground">
                {isLoading ? '—' : stats.total}
              </div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-semibold text-foreground">
                {isLoading ? '—' : stats.active}
              </div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-semibold text-foreground">
                {isLoading ? '—' : stats.onLeave}
              </div>
              <div className="text-[10px] text-muted-foreground">On Leave</div>
            </CardContent>
          </Card>
        </div>

      {/* Employee List */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : paginatedEmployees.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
                  ? 'No employees found matching your filters.'
                  : 'No employees yet. Add your first employee to get started.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-1.5">
              {paginatedEmployees.map((employee) => (
                <Card key={employee.id} className="border-border transition-all duration-200 hover:bg-accent/5 hover:shadow-sm active:bg-accent/10">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <Link to={`/app/employees/${employee.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {employee.full_name}
                          </h3>
                          {employee.status !== 'active' && (
                            <Badge
                              variant={employee.status === 'on_leave' ? 'secondary' : 'outline'}
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                            >
                              {getStatusLabel(employee.status)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {employee.job_title || 'No title'} · {employee.department || 'No department'}
                        </p>
                      </Link>

                      {/* Temporarily hidden due to chat performance issues
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 shrink-0 h-8 px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedEmployeeId(employee.id);
                          setShowNewChatDialog(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      */}
                    </div>
                  </CardContent>
                </Card>
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

      {/* Temporarily hidden due to chat performance issues
      <NewChatDialog
        open={showNewChatDialog}
        onOpenChange={(open) => {
          setShowNewChatDialog(open);
          if (!open) setSelectedEmployeeId(undefined);
        }}
        preSelectedEmployeeId={selectedEmployeeId}
      />
      */}
    </PageContent>
  );
}
