import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase,
  User,
  Clock
} from 'lucide-react';

// Placeholder data
const employeeData: Record<string, any> = {
  '1': {
    name: 'Sarah Johnson',
    role: 'HR Manager',
    department: 'Human Resources',
    status: 'active',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    joinDate: 'January 15, 2022',
    employeeId: 'EMP001',
    manager: 'John Smith',
    workSchedule: 'Monday - Friday, 9:00 AM - 5:00 PM',
  },
  '2': {
    name: 'Michael Chen',
    role: 'Software Engineer',
    department: 'Engineering',
    status: 'active',
    email: 'michael.chen@company.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA',
    joinDate: 'March 10, 2021',
    employeeId: 'EMP002',
    manager: 'Alice Brown',
    workSchedule: 'Monday - Friday, 10:00 AM - 6:00 PM',
  },
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const employee = id ? employeeData[id] : null;

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Employee not found</p>
            <Button onClick={() => navigate('/app/employees')} variant="outline" className="mt-4">
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container max-w-2xl px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/employees')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container max-w-2xl px-4 py-6 space-y-4">
        {/* Profile Card */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-semibold text-foreground mt-4">
                {employee.name}
              </h1>
              <p className="text-muted-foreground mt-1">{employee.role}</p>
              <Badge variant="secondary" className="mt-3">
                {employee.status === 'active' ? 'Active' : 'On Leave'}
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

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm text-foreground">{employee.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground">{employee.location}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="text-sm text-foreground">{employee.employeeId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm text-foreground">{employee.department}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Reports To</p>
                <p className="text-sm text-foreground">{employee.manager}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Join Date</p>
                <p className="text-sm text-foreground">{employee.joinDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Work Schedule</p>
                <p className="text-sm text-foreground">{employee.workSchedule}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" size="lg" className="h-12">
            Edit Profile
          </Button>
          <Button variant="outline" size="lg" className="h-12">
            View Documents
          </Button>
        </div>
      </div>
    </div>
  );
}
