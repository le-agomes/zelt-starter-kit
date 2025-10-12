import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/FormField';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const stepSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['form', 'task', 'email', 'signature', 'wait']),
  owner_role: z.enum(['admin', 'hr', 'manager', 'it', 'employee']),
  due_days_from_start: z.number().min(0),
  auto_advance: z.boolean(),
});

type StepFormData = z.infer<typeof stepSchema>;

interface EditStepDialogProps {
  step: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStepUpdated: () => void;
}

export function EditStepDialog({ step, open, onOpenChange, onStepUpdated }: EditStepDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StepFormData>({
    title: step.title,
    type: step.type,
    owner_role: step.owner_role,
    due_days_from_start: step.due_days_from_start || 0,
    auto_advance: step.auto_advance || false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        type: step.type,
        owner_role: step.owner_role,
        due_days_from_start: step.due_days_from_start || 0,
        auto_advance: step.auto_advance || false,
      });
    }
  }, [step]);

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
      const { error } = await (supabase as any)
        .from('workflow_steps')
        .update(formData)
        .eq('id', step.id);

      if (error) throw error;

      toast({
        title: 'Step updated',
        description: 'The workflow step has been updated successfully.',
      });

      onOpenChange(false);
      onStepUpdated();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workflow step.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Workflow Step</DialogTitle>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Step'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
