import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { user } = useAuth();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async () => {
      // RLS policy handles access control - it checks hr_user_id, employee_profile_id, 
      // AND employees.profile_id, so we don't need to filter here
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          employee:employees(id, full_name, email, profile_id),
          hr_user:profiles!chat_conversations_hr_user_id_fkey(id, full_name),
          employee_profile:profiles!chat_conversations_employee_profile_id_fkey(id, full_name)
        `)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  // Get unread counts with single query (fix N+1 problem)
  const { data: unreadCounts } = useQuery({
    queryKey: ['chat-unread-counts', user?.id, conversations?.map(c => c.id)],
    queryFn: async () => {
      if (!conversations?.length) return {};
      
      const conversationIds = conversations.map(c => c.id);
      
      // Single query to get all unread messages
      const { data: unreadMessages, error } = await supabase
        .from('chat_messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .neq('sender_id', user?.id || '');
      
      if (error) return {};
      
      // Aggregate counts in JavaScript
      const counts: Record<string, number> = {};
      unreadMessages?.forEach(msg => {
        counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: !!user?.id && !!conversations?.length,
    staleTime: 30000,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No conversations yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Conversations will appear here when you send or receive messages
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => {
          // Determine the other party's name
          const isHR = conversation.hr_user_id === user?.id;
          const otherPartyName = isHR 
            ? (conversation.employee?.full_name || conversation.employee_profile?.full_name || 'Unknown')
            : (conversation.hr_user?.full_name || 'HR');
          
          const unreadCount = unreadCounts?.[conversation.id] || 0;
          const isSelected = selectedId === conversation.id;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                'w-full p-3 rounded-lg text-left transition-colors',
                'hover:bg-accent',
                isSelected && 'bg-accent'
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {getInitials(otherPartyName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{otherPartyName}</p>
                    {conversation.last_message_at && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      Click to view conversation
                    </p>
                    {unreadCount > 0 && (
                      <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center px-1.5">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
