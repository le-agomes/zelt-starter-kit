import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface FormFillDialogProps {
  request: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FormFillDialog({ request, open, onClose, onSuccess }: FormFillDialogProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields = request.form_template.fields as any[];

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = fields.filter(f => f.required && !responses[f.key]);
    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.map((f: any) => f.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert form response
      const { error: responseError } = await supabase
        .from('form_responses')
        .insert({
          form_request_id: request.id,
          employee_id: request.employee_id,
          org_id: request.org_id,
          responses,
        });

      if (responseError) throw responseError;

      // Update form request status
      const { error: updateError } = await supabase
        .from('form_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Form submitted successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to submit form: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = responses[field.key];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.key]: e.target.value })}
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.key]: e.target.value })}
            required={field.required}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => setResponses({ ...responses, [field.key]: e.target.value })}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => setResponses({ ...responses, [field.key]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <Checkbox
            checked={value || false}
            onCheckedChange={(checked) => setResponses({ ...responses, [field.key]: checked })}
          />
        );
      
      default:
        return <Input value={value || ''} onChange={(e) => setResponses({ ...responses, [field.key]: e.target.value })} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{request.form_template.name}</DialogTitle>
          {request.form_template.description && (
            <DialogDescription>{request.form_template.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Form'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
