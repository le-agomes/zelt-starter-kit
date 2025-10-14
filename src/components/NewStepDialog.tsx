import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/FormField';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';

const stepSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['form', 'task', 'email', 'signature', 'wait']),
  owner_role: z.enum(['admin', 'hr', 'manager', 'it', 'employee']),
  due_days_from_start: z.number().min(0),
  auto_advance: z.boolean(),
});

type StepFormData = z.infer<typeof stepSchema>;

interface NewStepDialogProps {
  workflowId: string;
  maxOrdinal: number;
  onStepCreated: () => void;
  trigger?: React.ReactNode;
}

export function NewStepDialog({ workflowId, maxOrdinal, onStepCreated, trigger }: NewStepDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StepFormData>({
    title: '',
    type: 'task',
    owner_role: 'hr',
    due_days_from_start: 0,
    auto_advance: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Type-specific config
  const [config, setConfig] = useState<any>({});
  const [checklist, setChecklist] = useState<Array<{ text: string; done: boolean }>>([]);
  const [signers, setSigners] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = stepSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Build config based on type
      let finalConfig = {};
      if (formData.type === 'email') {
        finalConfig = {
          subject: config.subject || '',
          body: config.body || '',
          to: config.to || { mode: 'role', role: 'employee' }
        };
      } else if (formData.type === 'task') {
        finalConfig = {
          description: config.description || '',
          checklist: checklist
        };
      } else if (formData.type === 'signature') {
        finalConfig = {
          document_id: config.document_id || '',
          signers: signers
        };
      } else if (formData.type === 'wait') {
        finalConfig = {
          hours: config.hours || 0
        };
      }

      const { error } = await (supabase as any).from('workflow_steps').insert({
        workflow_id: workflowId,
        ordinal: maxOrdinal + 1,
        ...formData,
        config: finalConfig
      });

      if (error) throw error;

      toast({
        title: 'Step created',
        description: 'The workflow step has been created successfully.',
      });

      setOpen(false);
      setFormData({
        title: '',
        type: 'task',
        owner_role: 'hr',
        due_days_from_start: 0,
        auto_advance: false,
      });
      setConfig({});
      setChecklist([]);
      setSigners([]);
      onStepCreated();
    } catch (error) {
      console.error('Error creating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workflow step.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>New Step</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Workflow Step</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title" required error={errors.title}>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter step title"
            />
          </FormField>

          <FormField label="Type" required error={errors.type}>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
                <SelectItem value="wait">Wait</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Owner Role" required error={errors.owner_role}>
            <Select
              value={formData.owner_role}
              onValueChange={(value) => setFormData({ ...formData, owner_role: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Due Days from Start" error={errors.due_days_from_start}>
            <Input
              type="number"
              min="0"
              value={formData.due_days_from_start}
              onChange={(e) => setFormData({ ...formData, due_days_from_start: parseInt(e.target.value) || 0 })}
            />
          </FormField>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto_advance"
              checked={formData.auto_advance}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_advance: checked as boolean })}
            />
            <label
              htmlFor="auto_advance"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Auto-advance
            </label>
          </div>

          {/* Email type fields */}
          {formData.type === 'email' && (
            <>
              <FormField label="Subject" required>
                <Input
                  value={config.subject || ''}
                  onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </FormField>
              <FormField label="Body" required>
                <Textarea
                  value={config.body || ''}
                  onChange={(e) => setConfig({ ...config, body: e.target.value })}
                  placeholder="Email body (use {{employee.full_name}} for variables)"
                  rows={5}
                />
              </FormField>
              <FormField label="To Mode" required>
                <Select
                  value={config.to?.mode || 'role'}
                  onValueChange={(value) => setConfig({ ...config, to: { ...config.to, mode: value } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="user">Specific User</SelectItem>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {config.to?.mode === 'role' && (
                <FormField label="Role">
                  <Select
                    value={config.to?.role || 'employee'}
                    onValueChange={(value) => setConfig({ ...config, to: { ...config.to, role: value } })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </>
          )}

          {/* Task type fields */}
          {formData.type === 'task' && (
            <>
              <FormField label="Description">
                <Textarea
                  value={config.description || ''}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </FormField>
              <FormField label="Checklist">
                <div className="space-y-2">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={item.text}
                        onChange={(e) => {
                          const newList = [...checklist];
                          newList[idx].text = e.target.value;
                          setChecklist(newList);
                        }}
                        placeholder="Checklist item"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setChecklist([...checklist, { text: '', done: false }])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
              </FormField>
            </>
          )}

          {/* Signature type fields */}
          {formData.type === 'signature' && (
            <>
              <FormField label="Document ID">
                <Input
                  value={config.document_id || ''}
                  onChange={(e) => setConfig({ ...config, document_id: e.target.value })}
                  placeholder="Document identifier"
                />
              </FormField>
              <FormField label="Signers" required>
                <div className="space-y-2">
                  {signers.map((signer, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select
                        value={signer}
                        onValueChange={(value) => {
                          const newSigners = [...signers];
                          newSigners[idx] = value;
                          setSigners(newSigners);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="it">IT</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSigners(signers.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSigners([...signers, 'employee'])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Signer
                  </Button>
                </div>
              </FormField>
            </>
          )}

          {/* Wait type fields */}
          {formData.type === 'wait' && (
            <FormField label="Wait Duration (hours)">
              <Input
                type="number"
                min="0"
                value={config.hours || 0}
                onChange={(e) => setConfig({ ...config, hours: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Step'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
