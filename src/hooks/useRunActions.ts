import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useRunActions() {
  const queryClient = useQueryClient();

  const togglePause = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await supabase.functions.invoke('toggle-run-pause', {
        body: { run_id: runId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      const action = data.new_status === 'paused' ? 'paused' : 'resumed';
      toast({
        title: 'Success',
        description: `Run ${action} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update run status',
        variant: 'destructive',
      });
    },
  });

  const cancelRun = useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-run', {
        body: { run_id: runId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast({
        title: 'Success',
        description: 'Run cancelled successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel run',
        variant: 'destructive',
      });
    },
  });

  return {
    pauseRun: (runId: string) => togglePause.mutate(runId),
    resumeRun: (runId: string) => togglePause.mutate(runId),
    cancelRun: (runId: string) => cancelRun.mutate(runId),
    isPausing: togglePause.isPending,
    isCancelling: cancelRun.isPending,
  };
}
