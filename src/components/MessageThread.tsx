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
  const sendingRef = useRef(false); // Mutex to prevent double-sends
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
    staleTime: 60000,
    gcTime: 300000,
    enabled: !!user?.id,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      console.log('[Chat] Fetching messages for conversation:', conversationId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          sender_type,
          message_text,
          message_type,
          sent_at,
          read,
          form_request_id,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('[Chat] Error fetching messages:', error);
        throw error;
      }
      console.log('[Chat] Fetched', data?.length, 'messages');
      return data;
    },
    staleTime: 60000, // Cache data for 1 minute - instant return on tab switch
    gcTime: 300000, // Keep in memory for 5 minutes - survives unmounts
    refetchOnMount: false, // Don't refetch on mount - rely on cache and realtime
    refetchOnWindowFocus: false, // Don't refetch when focusing window (realtime handles updates)
    enabled: !!user?.id && !!conversationId,
  });

  // Realtime subscription for instant message updates
  useEffect(() => {
    if (!conversationId) return;

    console.log('[Chat] Setting up realtime subscription for:', conversationId);
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('[Chat] Realtime event received:', payload.eventType);
          // Don't await - let it happen in background
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Realtime subscription status:', status);
      });

    return () => {
      console.log('[Chat] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

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

  const handleSendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Double-check using ref to prevent race conditions
    if (sendingRef.current || !messageText.trim() || isSending) {
      console.log('[Chat] Blocked duplicate send attempt');
      return;
    }
    
    sendingRef.current = true;
    const textToSend = messageText.trim();
    setMessageText(''); // Clear immediately for better UX
    setIsSending(true);
    
    console.log('[Chat] Sending message:', textToSend.substring(0, 50));
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id, role, full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Chat] Profile fetch error:', profileError);
        throw new Error('Could not fetch user profile');
      }

      if (!profile?.org_id) {
        throw new Error('Could not determine organization');
      }

      // Add optimistic message to cache immediately
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        org_id: profile.org_id,
        sender_id: user.id,
        sender_type: ['admin', 'hr'].includes(profile?.role) ? 'hr' : 'employee',
        message_text: textToSend,
        message_type: 'text',
        sent_at: new Date().toISOString(),
        read: false,
        read_at: null,
        form_request_id: null,
        sender: { id: user.id, full_name: profile?.full_name || 'You' },
        form_request: null,
      };

      queryClient.setQueryData(['chat-messages', conversationId], (old: any[] | undefined) => 
        [...(old || []), optimisticMessage]
      );

      console.log('[Chat] Inserting message with org_id:', profile.org_id);

      const { data: insertedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          org_id: profile.org_id,
          sender_id: user.id,
          sender_type: ['admin', 'hr'].includes(profile?.role) ? 'hr' : 'employee',
          message_text: textToSend,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) {
        console.error('[Chat] Insert error:', error);
        // Remove optimistic message on error
        queryClient.setQueryData(['chat-messages', conversationId], (old: any[] | undefined) => 
          (old || []).filter(m => m.id !== optimisticMessage.id)
        );
        setMessageText(textToSend); // Restore text on error
        throw error;
      }

      console.log('[Chat] Message sent successfully:', insertedMessage?.id);

      // Invalidate queries to trigger refetch in background
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      
    } catch (error: any) {
      console.error('[Chat] Send message error:', error);
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user?.id || (isLoading && !messages)) {
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
        <form onSubmit={handleSendMessage}>
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
              type="button"
              disabled={!messageText.trim() || isSending}
              size="icon"
              className="h-[60px] w-[60px]"
              onClick={handleSendMessage}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
