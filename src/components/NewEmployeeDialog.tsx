import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';

const employeeSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  job_title: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  start_date: z.date().optional(),
  status: z.enum(['candidate', 'onboarding', 'active', 'offboarded']),
  send_invitation: z.boolean().default(true),
  role: z.enum(['admin', 'hr', 'manager', 'it', 'employee']).default('employee'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export function NewEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: '',
      email: '',
      job_title: '',
      department: '',
      location: '',
      status: 'candidate',
      send_invitation: true,
      role: 'employee',
    },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    setIsSubmitting(true);
    try {
      // Get the current user's org_id from profiles
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.org_id) {
        throw new Error('Could not fetch organization');
      }

      // Insert the new employee
      const { data: newEmployee, error: insertError } = await supabase
        .from('employees')
        .insert({
          org_id: profile.org_id,
          full_name: values.full_name,
          email: values.email,
          job_title: values.job_title || null,
          department: values.department || null,
          location: values.location || null,
          start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : null,
          status: values.status,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If send_invitation is checked, call invite-user edge function
      if (values.send_invitation && newEmployee) {
        console.log('Sending invitation to:', values.email);
        
        const { error: inviteError } = await supabase.functions.invoke('invite-user', {
          body: {
            email: values.email,
            full_name: values.full_name,
            role: values.role,
            create_employee: false, // Employee already created
            employee_id: newEmployee.id, // Pass the employee ID to link
          },
        });

        if (inviteError) {
          console.error('Error sending invitation:', inviteError);
          toast({
            title: 'Employee Created',
            description: 'Employee added but invitation email failed to send. You can resend it later.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Success',
            description: 'Employee added and invitation email sent successfully',
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Employee added successfully',
        });
      }

      setOpen(false);
      form.reset();
      
      // Redirect to the new employee's detail page
      if (newEmployee) {
        navigate(`/app/employees/${newEmployee.id}`);
      }
    } catch (error: any) {
      console.error('Error creating employee:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      
      // Check for duplicate email error (Postgres error code 23505)
      // Check multiple possible locations for the error code and constraint name
      const isDuplicateEmail = 
        (error?.code === '23505' || error?.code === 23505) && 
        (
          error?.message?.includes('employees_org_id_email_key') ||
          error?.details?.includes('employees_org_id_email_key') ||
          error?.hint?.includes('employees_org_id_email_key')
        );
      
      if (isDuplicateEmail) {
        toast({
          title: 'Duplicate Email',
          description: 'An employee with this email already exists in your organization.',
          variant: 'destructive',
        });
        form.setError('email', {
          type: 'manual',
          message: 'This email already exists in your organization',
        });
        form.setFocus('email');
        setIsSubmitting(false);
        return; // Keep form open with data
      }
      
      // Handle other errors
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add employee',
        variant: 'destructive',
      });
      
      // Reset and close only for non-duplicate errors
      setOpen(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the employee's information below
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="San Francisco, CA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="candidate">Candidate</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="offboarded">Offboarded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <FormField
                control={form.control}
                name="send_invitation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Send invitation email
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Invite this employee to access the platform and complete their profile
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('send_invitation') && (
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="it">IT</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Employee'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
