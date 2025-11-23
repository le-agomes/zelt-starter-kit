import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatHeader } from '@/components/ChatHeader';
import { MessageBubble } from '@/components/MessageBubble';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface MessageThreadProps {
  conversationId: string;
  onBack?: () => void;
}

export function MessageThread({ conversationId, onBack }: MessageThreadProps) {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversation } = useQuery({
    queryKey: ['chat-conversation', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          employee:employees(id, full_name, email),
          hr_user:profiles!chat_conversations_hr_user_id_fkey(id, full_name),
          employee_profile:profiles!chat_conversations_employee_profile_id_fkey(id, full_name)
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading, isFetching } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name),
          form_request:form_requests(
            id, 
            status, 
            due_date,
            completed_at,
            employee_id,
            org_id,
            form_template:form_templates(id, name, description, fields)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId && messages && user?.id) {
      const unreadIds = messages
        .filter(m => !m.read && m.sender_id !== user.id)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        supabase
          .from('chat_messages')
          .update({ read: true, read_at: new Date().toISOString() })
          .in('id', unreadIds)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['chat-unread-counts'] });
          });
      }
    }
  }, [conversationId, messages, user?.id, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          org_id: profile?.org_id,
          sender_id: user?.id,
          sender_type: ['admin', 'hr'].includes(profile?.role) ? 'hr' : 'employee',
          message_text: messageText.trim(),
          message_type: 'text',
        });

      if (error) throw error;

      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    } catch (error: any) {
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading && !messages) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <ChatHeader conversation={conversation} />
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollRef}>
        <div className="space-y-4 px-4">
          {messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isSender={message.sender_id === user?.id}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
