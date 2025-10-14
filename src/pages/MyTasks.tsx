import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface MyTask {
  id: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  run_id: string;
  step_title: string;
  step_type: string;
  workflow_name: string;
  employee_name: string;
}

export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchMyTasks = async () => {
      setLoading(true);
      try {
        const { data: stepInstances, error: stepError } = await (supabase as any)
          .from('run_step_instances')
          .select('id, status, due_at, completed_at, run_id, workflow_step_id')
          .eq('assigned_to', user.id)
          .in('status', ['pending', 'in_progress'])
          .order('due_at', { ascending: true, nullsFirst: false });

        if (stepError) throw stepError;

        if (!stepInstances || stepInstances.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const stepIds = stepInstances.map((si: any) => si.workflow_step_id);
        const { data: workflowSteps, error: wsError } = await (supabase as any)
          .from('workflow_steps')
          .select('id, title, type, workflow_id')
          .in('id', stepIds);

        if (wsError) throw wsError;

        const runIds = [...new Set(stepInstances.map((si: any) => si.run_id))];
        const { data: runs, error: runsError } = await (supabase as any)
          .from('runs')
          .select('id, employee_id, workflow_id')
          .in('id', runIds);

        if (runsError) throw runsError;

        const employeeIds = [...new Set((runs || []).map((r: any) => r.employee_id))];
        const { data: employees, error: empError } = await (supabase as any)
          .from('employees')
          .select('id, full_name')
          .in('id', employeeIds);

        if (empError) throw empError;

        const workflowIds = [...new Set((runs || []).map((r: any) => r.workflow_id))];
        const { data: workflows, error: wfError } = await (supabase as any)
          .from('workflows')
          .select('id, name')
          .in('id', workflowIds);

        if (wfError) throw wfError;

        const formattedTasks: MyTask[] = stepInstances.map((item: any) => {
          const step = (workflowSteps || []).find((ws: any) => ws.id === item.workflow_step_id);
          const run = (runs || []).find((r: any) => r.id === item.run_id);
          const employee = (employees || []).find((e: any) => e.id === run?.employee_id);
          const workflow = (workflows || []).find((w: any) => w.id === run?.workflow_id);

          return {
            id: item.id,
            status: item.status,
            due_at: item.due_at,
            completed_at: item.completed_at,
            run_id: item.run_id,
            step_title: step?.title || 'Unknown Step',
            step_type: step?.type || 'task',
            workflow_name: workflow?.name || 'Unknown Workflow',
            employee_name: employee?.full_name || 'Unknown Employee',
          };
        });

        setTasks(formattedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'done':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'skipped':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'form':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <PageContent>
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            You don't have any pending tasks right now. New tasks will appear here when they're assigned to you.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/app/runs/${task.run_id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="mt-0.5 text-muted-foreground">
                    {getTypeIcon(task.step_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 truncate">
                      {task.step_title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.employee_name} • {task.workflow_name}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </div>
              
              {task.due_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                  <Clock className="h-3 w-3" />
                  <span>Due {format(new Date(task.due_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContent>
  );
}
