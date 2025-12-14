import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedEmployeeId?: string;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function NewChatDialog({ open, onOpenChange, preSelectedEmployeeId }: NewChatDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, org_id, role, full_name')
        .eq('id', user?.id || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees-for-chat', profile?.org_id, search],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('id, full_name, email, profile_id, job_title, department')
        .eq('org_id', profile?.org_id || '')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id && open,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!profile?.org_id) throw new Error('No organization found');

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('hr_user_id', user?.id || '')
        .eq('employee_id', employeeId)
        .eq('archived', false)
        .maybeSingle();

      if (existingConversation) {
        return existingConversation.id;
      }

      // Find employee's profile_id
      const employee = employees?.find(e => e.id === employeeId);

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          org_id: profile.org_id,
          hr_user_id: user?.id,
          employee_id: employeeId,
          employee_profile_id: employee?.profile_id || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return newConversation.id;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      navigate(`/app/chat/${conversationId}`);
      onOpenChange(false);
      toast.success('Chat started successfully');
    },
    onError: (error: any) => {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start chat: ' + error.message);
    },
  });

  // Auto-start chat if preSelectedEmployeeId is provided
  useState(() => {
    if (preSelectedEmployeeId && open && profile?.org_id) {
      createConversationMutation.mutate(preSelectedEmployeeId);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Start New Chat
          </DialogTitle>
          <DialogDescription>
            Select an employee to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Employee List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : employees && employees.length > 0 ? (
              <div className="space-y-2">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => createConversationMutation.mutate(employee.id)}
                    disabled={createConversationMutation.isPending}
                    className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {employee.full_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {employee.job_title && (
                            <span className="truncate">{employee.job_title}</span>
                          )}
                          {employee.department && employee.job_title && (
                            <span>•</span>
                          )}
                          {employee.department && (
                            <span className="truncate">{employee.department}</span>
                          )}
                        </div>
                      </div>
                      {createConversationMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No employees found' : 'No active employees available'}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
