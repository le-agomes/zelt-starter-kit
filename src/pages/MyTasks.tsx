import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Clock, FileText, AlertCircle, ExternalLink, Search } from 'lucide-react';
import { format, isPast, isToday, startOfDay, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MyTask {
  id: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  run_id: string;
  step_title: string;
  step_type: string;
  step_config: any;
  workflow_name: string;
  employee_name: string;
}

type FilterType = 'all' | 'due_today' | 'overdue' | 'completed';

export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MyTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfileId(data?.id || null);
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!profileId) return;
    
    const fetchMyTasks = async () => {
      setLoading(true);
      try {
        let query = (supabase as any)
          .from('run_step_instances')
          .select('id, status, due_at, completed_at, run_id, workflow_step_id, created_at')
          .eq('assigned_to', profileId);

        // Apply status filter based on selected filter type
        if (filter === 'completed') {
          const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
          query = query
            .eq('status', 'done')
            .gte('completed_at', thirtyDaysAgo);
        } else {
          query = query.in('status', ['pending', 'active']);
        }

        const { data: stepInstances, error: stepError } = await query
          .order('due_at', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (stepError) throw stepError;

        if (!stepInstances || stepInstances.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const stepIds = stepInstances.map((si: any) => si.workflow_step_id);
        const { data: workflowSteps, error: wsError } = await (supabase as any)
          .from('workflow_steps')
          .select('id, title, type, workflow_id, config')
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
            step_config: step?.config || {},
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
  }, [profileId, filter]);

  // Filter tasks based on selected filter and search query
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply filter type
    if (filter === 'due_today') {
      filtered = filtered.filter((task) => task.due_at && isToday(new Date(task.due_at)));
    } else if (filter === 'overdue') {
      filtered = filtered.filter((task) => task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at)));
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.step_title.toLowerCase().includes(query) ||
          task.employee_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tasks, filter, searchQuery]);

  const handleComplete = async (taskId: string) => {
    setIsCompleting(taskId);
    try {
      const { error } = await supabase.functions.invoke('complete-step', {
        body: { step_instance_id: taskId },
      });

      if (error) throw error;

      // Remove from list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      
      toast({
        title: "Task completed",
        description: "The task has been marked as complete.",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete the task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(null);
    }
  };

  const handleOpen = (task: MyTask) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleMarkDone = async () => {
    if (!selectedTask) return;
    
    await handleComplete(selectedTask.id);
    setIsDialogOpen(false);
    setSelectedTask(null);
  };

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

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'due_today', 'overdue', 'completed'] as FilterType[]).map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterType)}
                className="whitespace-nowrap"
              >
                {filterType === 'all' && 'All'}
                {filterType === 'due_today' && 'Due today'}
                {filterType === 'overdue' && 'Overdue'}
                {filterType === 'completed' && 'Completed'}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks or employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No tasks found' : filter === 'completed' ? 'No completed tasks' : 'All caught up!'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : filter === 'completed'
                ? "You haven't completed any tasks in the last 30 days."
                : "You don't have any pending tasks right now. New tasks will appear here when they're assigned to you."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
            const isOverdue = task.due_at && isPast(new Date(task.due_at));
            
            return (
              <Card
                key={task.id}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div 
                    className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/app/runs/${task.run_id}`)}
                  >
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
                
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {task.due_at && (
                      <Badge 
                        variant={isOverdue ? "destructive" : "outline"}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        <span>{isOverdue ? 'Overdue' : `Due ${format(new Date(task.due_at), 'MMM d, yyyy')}`}</span>
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpen(task)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleComplete(task.id)}
                      disabled={isCompleting === task.id}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {isCompleting === task.id ? 'Completing...' : 'Complete'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.step_title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.employee_name} • {selectedTask?.workflow_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedTask?.step_type === 'form' && (
              <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Form rendering coming soon
                </p>
              </div>
            )}

            {selectedTask?.step_type === 'task' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Description</h4>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedTask.step_config?.description || 'No description provided'}
                    </p>
                  </div>
                </div>

                {selectedTask.step_config?.checklist && selectedTask.step_config.checklist.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Checklist</h4>
                    <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                      {selectedTask.step_config.checklist.map((item: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="mt-0.5">
                            <div className="h-4 w-4 rounded border border-border bg-background" />
                          </div>
                          <p className="text-sm text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleMarkDone}
                  disabled={isCompleting === selectedTask?.id}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isCompleting === selectedTask?.id ? 'Marking done...' : 'Mark done'}
                </Button>
              </div>
            )}

            {(selectedTask?.step_type === 'email' || selectedTask?.step_type === 'signature') && (
              <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Read-only preview for {selectedTask.step_type} steps
                </p>
                <p className="text-xs text-muted-foreground">
                  Completion is admin-driven until automations are wired
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
