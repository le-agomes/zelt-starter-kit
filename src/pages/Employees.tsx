import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronRight } from 'lucide-react';

// Placeholder data
const employees = [
  { id: '1', name: 'Sarah Johnson', role: 'HR Manager', department: 'Human Resources', status: 'active' },
  { id: '2', name: 'Michael Chen', role: 'Software Engineer', department: 'Engineering', status: 'active' },
  { id: '3', name: 'Emily Davis', role: 'Product Designer', department: 'Design', status: 'active' },
  { id: '4', name: 'James Wilson', role: 'Sales Lead', department: 'Sales', status: 'on-leave' },
  { id: '5', name: 'Lisa Martinez', role: 'Marketing Manager', department: 'Marketing', status: 'active' },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export default function Employees() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container max-w-2xl px-4 py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team members</p>
        </div>
      </div>

      {/* Search */}
      <div className="container max-w-2xl px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-9 h-11 bg-card border-border"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container max-w-2xl px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">24</div>
              <div className="text-xs text-muted-foreground mt-1">Total</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">22</div>
              <div className="text-xs text-muted-foreground mt-1">Active</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">2</div>
              <div className="text-xs text-muted-foreground mt-1">On Leave</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Employee List */}
      <div className="container max-w-2xl px-4 pb-4">
        <div className="space-y-2">
          {employees.map((employee) => (
            <Link key={employee.id} to={`/app/employees/${employee.id}`}>
              <Card className="border-border transition-colors hover:bg-accent/5 active:bg-accent/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(employee.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">
                          {employee.name}
                        </h3>
                        {employee.status === 'on-leave' && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            On Leave
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {employee.role}
                      </p>
                      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                        {employee.department}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
