import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, ArrowLeft, ListTodo, ArrowUp, ArrowDown, Edit, Trash2, Copy, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { NewStepDialog } from '@/components/NewStepDialog';
import { EditStepDialog } from '@/components/EditStepDialog';
import { StartRunDialog } from '@/components/StartRunDialog';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  ordinal: number;
  title: string;
  type: string;
  owner_role: string;
  due_days_from_start: number;
  auto_advance: boolean;
}

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [startRunDialogOpen, setStartRunDialogOpen] = useState(false);

  const fetchWorkflow = async () => {
    if (!id) return;

    try {
      const { data: workflowData, error: workflowError } = await (supabase as any)
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single();

      if (workflowError) throw workflowError;
      setWorkflow(workflowData);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow.',
        variant: 'destructive',
      });
    }
  };

  const fetchSteps = async () => {
    if (!id) return;

    try {
      const { data: stepsData, error: stepsError } = await (supabase as any)
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', id)
        .order('ordinal', { ascending: true });

      if (stepsError) throw stepsError;
      setSteps(stepsData || []);
    } catch (error) {
      console.error('Error fetching steps:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow steps.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
    fetchSteps();
  }, [id]);

  const handleStepCreated = () => {
    fetchSteps();
  };

  const handleStepUpdated = () => {
    fetchSteps();
    setEditingStep(null);
  };

  const moveStep = async (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const currentStep = steps[stepIndex];
    const fromOrdinal = currentStep.ordinal;
    const toOrdinal = steps[targetIndex].ordinal;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('reorder-steps', {
        body: {
          workflowId: id,
          fromOrdinal,
          toOrdinal,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Step reordered',
        description: 'The workflow step has been reordered successfully.',
      });

      fetchSteps();
    } catch (error) {
      console.error('Error moving step:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder step.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStep = async () => {
    if (!deletingStepId) return;

    try {
      const { error } = await (supabase as any)
        .from('workflow_steps')
        .delete()
        .eq('id', deletingStepId);

      if (error) throw error;

      toast({
        title: 'Step deleted',
        description: 'The workflow step has been deleted successfully.',
      });

      setDeletingStepId(null);
      fetchSteps();
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workflow step.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateWorkflow = async () => {
    if (!id || duplicating) return;

    setDuplicating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('duplicate-workflow', {
        body: { workflowId: id },
      });

      if (response.error) throw response.error;

      const { workflowId: newWorkflowId, stepsCount } = response.data;

      toast({
        title: 'Workflow duplicated',
        description: `Successfully copied workflow with ${stepsCount} step${stepsCount !== 1 ? 's' : ''}.`,
      });

      navigate(`/app/workflows/${newWorkflowId}`);
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate workflow.',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(false);
    }
  };

  const maxOrdinal = steps.length > 0 ? Math.max(...steps.map((s) => s.ordinal)) : 0;

  if (loading) {
    return (
      <PageContent>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link to="/app/workflows">
            <ArrowLeft className="h-4 w-4" />
            Back to Workflows
          </Link>
        </Button>

        <PageHeader
          title={workflow?.name || 'Workflow'}
          description={workflow?.description || 'Configure the steps for this onboarding workflow'}
          actions={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={() => setStartRunDialogOpen(true)}
              >
                <Play className="h-5 w-5" />
                Start for Employee
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2"
                onClick={handleDuplicateWorkflow}
                disabled={duplicating}
              >
                <Copy className="h-5 w-5" />
                Duplicate
              </Button>
              <NewStepDialog
                workflowId={id!}
                maxOrdinal={maxOrdinal}
                onStepCreated={handleStepCreated}
                trigger={
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    New Step
                  </Button>
                }
              />
            </div>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-4 font-semibold">Workflow Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <ListTodo className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-4 font-semibold mb-2">No steps yet</h3>
                <p className="text-2 text-muted-foreground mb-6 max-w-sm">
                  Add steps to define the onboarding workflow for this workflow.
                </p>
                <NewStepDialog
                  workflowId={id!}
                  maxOrdinal={maxOrdinal}
                  onStepCreated={handleStepCreated}
                  trigger={
                    <Button size="lg" className="gap-2">
                      <Plus className="h-5 w-5" />
                      Add First Step
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={step.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveStep(step.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveStep(step.id, 'down')}
                            disabled={index === steps.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm">{step.title}</h4>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingStep(step)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeletingStepId(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">{step.type}</Badge>
                            <Badge variant="outline">{step.owner_role}</Badge>
                            <span className="text-muted-foreground">
                              Due: {step.due_days_from_start} days
                            </span>
                            {step.auto_advance && (
                              <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                                Auto-advance
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingStep && (
        <EditStepDialog
          step={editingStep}
          open={!!editingStep}
          onOpenChange={(open) => !open && setEditingStep(null)}
          onStepUpdated={handleStepUpdated}
        />
      )}

      <AlertDialog open={!!deletingStepId} onOpenChange={(open) => !open && setDeletingStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow step? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStep} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StartRunDialog
        open={startRunDialogOpen}
        onOpenChange={setStartRunDialogOpen}
        workflowId={id}
      />
    </PageContent>
  );
}
