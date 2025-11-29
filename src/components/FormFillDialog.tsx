import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface FormFillDialogProps {
  request: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FormFillDialog({ request, open, onClose, onSuccess }: FormFillDialogProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  const fields = request.form_template.fields as any[];

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setResponses({});
      setUploadingFiles({});
    }
  }, [open, request.id]);

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

  const handleFileUpload = async (field: any, file: File) => {
    setUploadingFiles({ ...uploadingFiles, [field.key]: true });
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${request.id}/${field.key}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('form-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('form-attachments')
        .getPublicUrl(fileName);

      setResponses({ 
        ...responses, 
        [field.key]: { 
          fileName: file.name, 
          filePath: fileName,
          fileUrl: publicUrl 
        } 
      });
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploadingFiles({ ...uploadingFiles, [field.key]: false });
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
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.key}-${option}`}
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || [];
                    const newValues = checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option);
                    setResponses({ ...responses, [field.key]: newValues });
                  }}
                />
                <Label htmlFor={`${field.key}-${option}`} className="text-sm font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <Checkbox
            checked={value || false}
            onCheckedChange={(checked) => setResponses({ ...responses, [field.key]: checked })}
          />
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            {value ? (
              <div className="flex items-center gap-2 p-2 border rounded-md">
                <span className="text-sm flex-1">{value.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setResponses({ ...responses, [field.key]: null })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(field, file);
                  }}
                  disabled={uploadingFiles[field.key]}
                  className="cursor-pointer"
                />
                {uploadingFiles[field.key] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
              </div>
            )}
          </div>
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
