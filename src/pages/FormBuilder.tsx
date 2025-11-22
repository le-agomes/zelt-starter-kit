import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'file';

interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  prefill_from_profile?: string;
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [updatesProfile, setUpdatesProfile] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['form-template', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setFields((template.fields as any) || []);
      setUpdatesProfile(template.updates_profile);
    }
  }, [template]);

  const addField = () => {
    setFields([
      ...fields,
      {
        key: `field_${Date.now()}`,
        label: 'New Field',
        type: 'text',
        required: false,
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.session?.user?.id)
      .single();

    const templateData = {
      name,
      description,
      fields: fields as any,
      updates_profile: updatesProfile,
      active: true,
      org_id: profile?.org_id,
    };

    if (isEdit) {
      const { error } = await supabase
        .from('form_templates')
        .update(templateData as any)
        .eq('id', id);

      if (error) {
        toast.error('Failed to update template');
      } else {
        toast.success('Template updated');
        navigate('/app/forms/templates');
      }
    } else {
      const { error } = await supabase
        .from('form_templates')
        .insert(templateData as any);

      if (error) {
        toast.error('Failed to create template');
      } else {
        toast.success('Template created');
        navigate('/app/forms/templates');
      }
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit Form Template' : 'New Form Template'}
        description="Design a form to collect information from employees"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/app/forms/templates')}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEdit ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Tax Information Form"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this form for?"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Updates Employee Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically update employee profile with form responses
                  </p>
                </div>
                <Switch
                  checked={updatesProfile}
                  onCheckedChange={setUpdatesProfile}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Form Fields</CardTitle>
                <Button onClick={addField} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fields yet. Click "Add Field" to get started.
                </div>
              ) : (
                fields.map((field, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="cursor-move pt-2">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Field Label *</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Field Type *</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value: FieldType) => updateField(index, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="textarea">Textarea</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                  <SelectItem value="multiselect">Multi-select</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="file">File Upload</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {(field.type === 'select' || field.type === 'multiselect') && (
                            <div className="space-y-2">
                              <Label>Options (one per line)</Label>
                              <Textarea
                                value={(field.options || []).join('\n')}
                                onChange={(e) =>
                                  updateField(index, { options: e.target.value.split('\n').filter(Boolean) })
                                }
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                              Required field
                            </Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
