import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SendFormRequestDialog } from '@/components/SendFormRequestDialog';
import { Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ChatHeaderProps {
  conversation: any;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSendFormDialog, setShowSendFormDialog] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (!conversation) return null;

  const isHR = conversation.hr_user_id === user?.id;
  const otherPartyName = isHR 
    ? (conversation.employee?.full_name || conversation.employee_profile?.full_name || 'Unknown')
    : (conversation.hr_user?.full_name || 'HR');

  const canSendForm = ['admin', 'hr'].includes(profile?.role) && conversation.employee_id;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{otherPartyName}</h2>
          {isHR && conversation.employee?.email && (
            <p className="text-sm text-muted-foreground">{conversation.employee.email}</p>
          )}
        </div>

        {canSendForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSendFormDialog(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Form
          </Button>
        )}
      </div>

      {showSendFormDialog && conversation.employee_id && (
        <SendFormRequestDialog
          employeeId={conversation.employee_id}
          open={showSendFormDialog}
          onClose={() => setShowSendFormDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
            setShowSendFormDialog(false);
          }}
        />
      )}
    </>
  );
}
