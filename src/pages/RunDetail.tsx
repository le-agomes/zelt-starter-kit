import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { AssigneeCell } from '@/components/AssigneeCell';
import { format } from 'date-fns';

interface RunStepInstance {
  id: string;
  ordinal: number;
  status: string;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  workflow_step_id: string;
  workflow_step: {
    title: string;
    type: string;
    config: any;
  };
  assignee?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

interface Run {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  workflow: {
    name: string;
  };
  employee: {
    full_name: string;
    email: string;
  };
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [steps, setSteps] = useState<RunStepInstance[]>([]);

  const fetchRunData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch run details
      const { data: runData, error: runError } = await (supabase as any)
        .from('runs')
        .select(`
          id,
          status,
          started_at,
          completed_at,
          workflow:workflows(name),
          employee:employees(full_name, email)
        `)
        .eq('id', id)
        .single();

      if (runError) throw runError;
      setRun(runData);

      // Fetch step instances with assignee details
      const { data: stepsData, error: stepsError } = await (supabase as any)
        .from('run_step_instances')
        .select(`
          id,
          ordinal,
          status,
          assigned_to,
          due_at,
          completed_at,
          workflow_step_id,
          workflow_step:workflow_steps(title, type, config),
          assignee:profiles!run_step_instances_assigned_to_fkey(id, full_name, email)
        `)
        .eq('run_id', id)
        .order('ordinal');

      if (stepsError) throw stepsError;
      setSteps(stepsData || []);
    } catch (error) {
      console.error('Error fetching run:', error);
      toast({
        title: 'Error',
        description: 'Failed to load run details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunData();
  }, [id]);

  const handleReassign = async (stepInstanceId: string, userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('reassign-step', {
        body: {
          step_instance_id: stepInstanceId,
          user_id: userId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Step reassigned successfully',
      });

      fetchRunData(); // Refresh the data
    } catch (error) {
      console.error('Error reassigning step:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign step',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Run Details" />
        <PageContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </>
    );
  }

  if (!run) {
    return (
      <>
        <PageHeader title="Run Not Found" />
        <PageContent>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">This run could not be found.</p>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title={`Run: ${run.workflow.name}`}
        actions={
          <Badge variant={run.status === 'running' ? 'default' : 'secondary'}>
            {run.status}
          </Badge>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Run Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Run Information</CardTitle>
              <CardDescription>Details about this workflow run</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee</p>
                  <p className="text-lg">{run.employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">{run.employee.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Started</p>
                  <p className="text-lg">
                    {format(new Date(run.started_at), 'PPp')}
                  </p>
                </div>
                {run.completed_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-lg">
                      {format(new Date(run.completed_at), 'PPp')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Steps Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>Track progress of each step</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{step.ordinal}
                        </span>
                        <h4 className="font-medium">{step.workflow_step.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {step.workflow_step.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge
                          variant={
                            step.status === 'completed'
                              ? 'default'
                              : step.status === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {step.status}
                        </Badge>
                        {step.due_at && (
                          <span>Due: {format(new Date(step.due_at), 'PP')}</span>
                        )}
                        {step.completed_at && (
                          <span>Completed: {format(new Date(step.completed_at), 'PP')}</span>
                        )}
                      </div>
                    </div>
                    <AssigneeCell
                      assignee={step.assignee}
                      onReassign={(userId) => handleReassign(step.id, userId)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
