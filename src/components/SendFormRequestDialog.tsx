import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface SendFormRequestDialogProps {
  employeeId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendFormRequestDialog({ employeeId, open, onClose, onSuccess }: SendFormRequestDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ['form-templates-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a form template');
      return;
    }

    setIsSending(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', session.session?.user?.id)
        .single();

      // Create form request
      const { data: request, error: requestError } = await supabase
        .from('form_requests')
        .insert({
          form_template_id: selectedTemplateId,
          employee_id: employeeId,
          org_id: profile?.org_id,
          requested_by: session.session?.user?.id,
          due_date: dueDate || null,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Get or create conversation
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('hr_user_id', session.session?.user?.id)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: employee } = await supabase
          .from('employees')
          .select('profile_id')
          .eq('id', employeeId)
          .single();

        const { data: newConv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            org_id: profile?.org_id,
            hr_user_id: session.session?.user?.id,
            employee_id: employeeId,
            employee_profile_id: employee?.profile_id,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create chat message
      const { data: chatMessage, error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          org_id: profile?.org_id,
          sender_id: session.session?.user?.id,
          sender_type: 'hr',
          message_text: message || `Please fill out: ${templates?.find(t => t.id === selectedTemplateId)?.name}`,
          message_type: 'form_request',
          form_request_id: request.id,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update form request with chat message id
      await supabase
        .from('form_requests')
        .update({ chat_message_id: chatMessage.id })
        .eq('id', request.id);

      toast.success('Form request sent successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send form request: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Form Request</DialogTitle>
          <DialogDescription>
            Select a form template to send to this employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Form Template *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a form" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message to the employee..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
