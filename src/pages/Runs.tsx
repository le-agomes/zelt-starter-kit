import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, ChevronRight, PlayCircle } from 'lucide-react';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { format } from 'date-fns';

type RunStatus = 'running' | 'completed' | 'paused' | 'cancelled';

type Run = {
  id: string;
  workflow_id: string;
  employee_id: string;
  started_at: string;
  status: RunStatus;
  workflow_name: string;
  employee_name: string;
};

const STATUS_COLORS: Record<RunStatus, string> = {
  running: 'default',
  completed: 'secondary',
  paused: 'outline',
  cancelled: 'destructive',
};

const STATUS_LABELS: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export default function Runs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [assignedToMe, setAssignedToMe] = useState(false);

  // Fetch current user profile
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, org_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch workflows for filter dropdown
  const { data: workflows } = useQuery({
    queryKey: ['workflows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Fetch runs
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', profile?.id, assignedToMe],
    queryFn: async () => {
      if (!profile) return [];

      const { data: runsData, error: runsError } = await (supabase as any)
        .from('runs')
        .select('id, workflow_id, employee_id, started_at, status')
        .eq('org_id', profile.org_id)
        .order('started_at', { ascending: false });

      if (runsError) throw runsError;
      if (!runsData) return [];

      // If "assigned to me" is enabled, filter runs
      let filteredRunIds = runsData.map((r: any) => r.id);
      
      if (assignedToMe && profile.id) {
        const { data: assignedSteps, error: stepsError } = await (supabase as any)
          .from('run_step_instances')
          .select('run_id')
          .eq('assigned_to', profile.id);

        if (stepsError) throw stepsError;
        
        const assignedRunIds = new Set(assignedSteps?.map((s: any) => s.run_id) || []);
        filteredRunIds = filteredRunIds.filter((id: string) => assignedRunIds.has(id));
      }

      // Fetch workflows and employees separately
      const workflowIds = [...new Set(runsData.map((r: any) => r.workflow_id))];
      const employeeIds = [...new Set(runsData.map((r: any) => r.employee_id))];

      const [workflowsRes, employeesRes] = await Promise.all([
        (supabase as any).from('workflows').select('id, name').in('id', workflowIds),
        (supabase as any).from('employees').select('id, full_name').in('id', employeeIds),
      ]);

      if (workflowsRes.error) throw workflowsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      const workflowMap = new Map(workflowsRes.data?.map((w: any) => [w.id, w.name]) || []);
      const employeeMap = new Map(employeesRes.data?.map((e: any) => [e.id, e.full_name]) || []);

      return runsData
        .filter((r: any) => filteredRunIds.includes(r.id))
        .map((run: any) => ({
          ...run,
          workflow_name: workflowMap.get(run.workflow_id) || 'Unknown Workflow',
          employee_name: employeeMap.get(run.employee_id) || 'Unknown Employee',
        })) as Run[];
    },
    enabled: !!profile,
  });

  // Filter runs
  const filteredRuns = useMemo(() => {
    if (!runs) return [];

    return runs.filter((run) => {
      const matchesSearch = run.employee_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || run.status === statusFilter;
      const matchesWorkflow = workflowFilter === 'all' || run.workflow_id === workflowFilter;

      return matchesSearch && matchesStatus && matchesWorkflow;
    });
  }, [runs, searchQuery, statusFilter, workflowFilter]);

  const statusCounts = useMemo(() => {
    if (!runs) return { all: 0, running: 0, completed: 0, paused: 0, cancelled: 0 };

    return {
      all: runs.length,
      running: runs.filter(r => r.status === 'running').length,
      completed: runs.filter(r => r.status === 'completed').length,
      paused: runs.filter(r => r.status === 'paused').length,
      cancelled: runs.filter(r => r.status === 'cancelled').length,
    };
  }, [runs]);

  return (
    <PageContent className="max-w-2xl space-y-4">
      <PageHeader 
        title="Runs" 
        description="Track active and completed onboarding runs"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by employee name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11 bg-card border-border"
        />
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className="shrink-0"
        >
          All ({statusCounts.all})
        </Button>
        <Button
          variant={statusFilter === 'running' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('running')}
          className="shrink-0"
        >
          Running ({statusCounts.running})
        </Button>
        <Button
          variant={statusFilter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('completed')}
          className="shrink-0"
        >
          Completed ({statusCounts.completed})
        </Button>
        <Button
          variant={statusFilter === 'paused' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('paused')}
          className="shrink-0"
        >
          Paused ({statusCounts.paused})
        </Button>
        <Button
          variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('cancelled')}
          className="shrink-0"
        >
          Cancelled ({statusCounts.cancelled})
        </Button>
      </div>

      {/* Additional Filters */}
      <div className="space-y-3">
        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="h-10 bg-card border-border">
            <SelectValue placeholder="Filter by workflow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            {workflows?.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <Label htmlFor="assigned-to-me" className="text-sm font-medium cursor-pointer">
            Assigned to me
          </Label>
          <Switch
            id="assigned-to-me"
            checked={assignedToMe}
            onCheckedChange={setAssignedToMe}
          />
        </div>
      </div>

      {/* Runs List */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredRuns.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              {runs?.length === 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <PlayCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">No runs yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Start a workflow to begin onboarding employees.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No runs found matching your filters.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredRuns.map((run) => (
              <Link key={run.id} to={`/app/runs/${run.id}`}>
                <Card className="border-border transition-colors hover:bg-accent/5 active:bg-accent/10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">
                            {run.employee_name}
                          </h3>
                          <Badge 
                            variant={STATUS_COLORS[run.status] as any}
                            className="text-xs shrink-0"
                          >
                            {STATUS_LABELS[run.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {run.workflow_name}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Started {format(new Date(run.started_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
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
