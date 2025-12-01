import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface StartRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string;
  employeeId?: string;
}

interface Workflow {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  full_name: string;
}

export function StartRunDialog({ open, onOpenChange, workflowId, employeeId }: StartRunDialogProps) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflowId || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedWorkflowId(workflowId || '');
      setSelectedEmployeeId(employeeId || '');
    }
  }, [open, workflowId, employeeId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [workflowsRes, employeesRes] = await Promise.all([
        supabase.from('workflows').select('id, name').eq('is_active', true).order('name'),
        supabase.from('employees').select('id, full_name').eq('status', 'active').order('full_name')
      ]);

      if (workflowsRes.error) throw workflowsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setWorkflows(workflowsRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWorkflowId || !selectedEmployeeId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a workflow and an employee',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get session and profile
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found');
      }

      // Call the database function
      const { data: runId, error } = await supabase.rpc('start_workflow_run', {
        p_workflow_id: selectedWorkflowId,
        p_employee_id: selectedEmployeeId,
        p_starter_id: sessionData.session.user.id,
        p_org_id: profile.org_id,
        p_start_date: startDate ? new Date(startDate).toISOString() : undefined
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Run started successfully'
      });

      onOpenChange(false);
      navigate(`/app/runs/${runId}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start run',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Workflow Run</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflow">Workflow</Label>
            <Select
              value={selectedWorkflowId}
              onValueChange={setSelectedWorkflowId}
              disabled={!!workflowId || isLoading}
            >
              <SelectTrigger id="workflow">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={!!employeeId || isLoading}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (Optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Run
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
