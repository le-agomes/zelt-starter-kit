import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FormFillDialog } from '@/components/FormFillDialog';

interface MessageBubbleProps {
  message: any;
  isSender: boolean;
}

export function MessageBubble({ message, isSender }: MessageBubbleProps) {
  const [showFormDialog, setShowFormDialog] = useState(false);

  // System message (centered)
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-muted-foreground italic">
          {message.message_text}
        </p>
      </div>
    );
  }

  // Form request message
  if (message.message_type === 'form_request' && message.form_request) {
    const formRequest = message.form_request;
    const template = formRequest.form_template;
    const status = formRequest.status;
    const dueDate = formRequest.due_date;
    const completedAt = formRequest.completed_at;

    return (
      <>
        <div className={cn('flex', isSender ? 'justify-end' : 'justify-start')}>
          <div className={cn('max-w-md', isSender && 'order-2')}>
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium">{template?.name}</h4>
                    <Badge variant={status === 'completed' ? 'default' : 'outline'}>
                      {status}
                    </Badge>
                  </div>
                  
                  {template?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  
                  {message.message_text && message.message_text !== `Please fill out: ${template?.name}` && (
                    <p className="text-sm mt-2">{message.message_text}</p>
                  )}
                  
                  {dueDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {format(new Date(dueDate), 'PPP')}
                    </p>
                  )}
                  
                  {status === 'pending' && !isSender && (
                    <Button 
                      size="sm" 
                      className="mt-3" 
                      onClick={() => setShowFormDialog(true)}
                    >
                      Fill Form
                    </Button>
                  )}
                  
                  {status === 'completed' && completedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Completed {format(new Date(completedAt), 'PPP')}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1 px-1">
              {format(new Date(message.sent_at), 'p')}
            </p>
          </div>
        </div>

        {showFormDialog && (
          <FormFillDialog
            request={formRequest}
            open={showFormDialog}
            onClose={() => setShowFormDialog(false)}
            onSuccess={() => {
              setShowFormDialog(false);
            }}
          />
        )}
      </>
    );
  }

  // Regular text message
  return (
    <div className={cn('flex', isSender ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-md', isSender && 'order-2')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isSender
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message_text}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 px-1">
          {format(new Date(message.sent_at), 'p')}
        </p>
      </div>
    </div>
  );
}
