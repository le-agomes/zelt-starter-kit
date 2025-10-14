import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Save, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FieldConfig {
  visible: boolean;
  required: boolean;
  section: string;
  ordinal: number;
}

type EmployeeSystemFields = Record<string, FieldConfig>;

const SECTIONS = ['Identity', 'Contact', 'Employment', 'Emergency', 'Profile', 'Documents', 'Other'];

// Core fields that are always visible and not configurable
const CORE_FIELDS = [
  'job_title',
  'department',
  'location',
  'start_date',
  'status',
  'manager_profile_id',
  'work_email'
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'file', label: 'File' },
];

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[];
  section: string;
  required: boolean;
  is_sensitive: boolean;
  active: boolean;
  ordinal: number;
}

const DEFAULT_FIELDS: EmployeeSystemFields = {
  // Identity
  preferred_name: { visible: true, required: false, section: 'Identity', ordinal: 1 },
  birth_date: { visible: true, required: false, section: 'Identity', ordinal: 2 },
  gender: { visible: true, required: false, section: 'Identity', ordinal: 3 },
  pronouns: { visible: true, required: false, section: 'Identity', ordinal: 4 },
  nationality: { visible: true, required: false, section: 'Identity', ordinal: 5 },
  
  // Contact
  work_email: { visible: true, required: false, section: 'Contact', ordinal: 1 },
  personal_email: { visible: true, required: false, section: 'Contact', ordinal: 2 },
  phone_mobile: { visible: true, required: false, section: 'Contact', ordinal: 3 },
  address_line1: { visible: true, required: false, section: 'Contact', ordinal: 4 },
  address_line2: { visible: true, required: false, section: 'Contact', ordinal: 5 },
  city: { visible: true, required: false, section: 'Contact', ordinal: 6 },
  state: { visible: true, required: false, section: 'Contact', ordinal: 7 },
  postal_code: { visible: true, required: false, section: 'Contact', ordinal: 8 },
  country: { visible: true, required: false, section: 'Contact', ordinal: 9 },
  
  // Employment
  employment_type: { visible: true, required: false, section: 'Employment', ordinal: 1 },
  start_date: { visible: true, required: false, section: 'Employment', ordinal: 2 },
  end_date: { visible: true, required: false, section: 'Employment', ordinal: 3 },
  job_title: { visible: true, required: false, section: 'Employment', ordinal: 4 },
  department: { visible: true, required: false, section: 'Employment', ordinal: 5 },
  location: { visible: true, required: false, section: 'Employment', ordinal: 6 },
  status: { visible: true, required: false, section: 'Employment', ordinal: 7 },
  
  // Emergency
  emergency_name: { visible: true, required: false, section: 'Emergency', ordinal: 1 },
  emergency_relation: { visible: true, required: false, section: 'Emergency', ordinal: 2 },
  emergency_phone: { visible: true, required: false, section: 'Emergency', ordinal: 3 },
  emergency_email: { visible: true, required: false, section: 'Emergency', ordinal: 4 },
};

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function EmployeeFieldsSettings() {
  const [fields, setFields] = useState<EmployeeSystemFields>(DEFAULT_FIELDS);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    key: '',
    type: 'text',
    options: '',
    section: 'Profile',
    required: false,
    is_sensitive: false,
    active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadCustomFields();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-org-settings');
      
      if (error) throw error;
      
      const savedFields = data?.employee_system_fields || {};
      
      // Merge saved settings with defaults
      const mergedFields = { ...DEFAULT_FIELDS };
      Object.keys(savedFields).forEach(key => {
        if (mergedFields[key]) {
          mergedFields[key] = { ...mergedFields[key], ...savedFields[key] };
        }
      });
      
      setFields(mergedFields);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load field settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_fields' as any)
        .select('*')
        .order('section', { ascending: true })
        .order('ordinal', { ascending: true });
      
      if (error) throw error;
      
      setCustomFields((data as any) || []);
    } catch (error) {
      console.error('Error loading custom fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom fields',
        variant: 'destructive',
      });
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('save-org-settings', {
        body: { employee_system_fields: fields },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Field settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save field settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (fieldName: string, updates: Partial<FieldConfig>) => {
    setFields(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], ...updates },
    }));
  };

  const moveField = (fieldName: string, direction: 'up' | 'down') => {
    const field = fields[fieldName];
    const section = field.section;
    
    // Get all fields in the same section, sorted by ordinal
    const sectionFields = Object.entries(fields)
      .filter(([_, f]) => f.section === section)
      .sort((a, b) => a[1].ordinal - b[1].ordinal);
    
    const currentIndex = sectionFields.findIndex(([name]) => name === fieldName);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sectionFields.length - 1)
    ) {
      return;
    }
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const [currentField, swapField] = [sectionFields[currentIndex], sectionFields[swapIndex]];
    
    setFields(prev => ({
      ...prev,
      [currentField[0]]: { ...currentField[1], ordinal: swapField[1].ordinal },
      [swapField[0]]: { ...swapField[1], ordinal: currentField[1].ordinal },
    }));
  };

  const getFieldsBySection = (section: string) => {
    return Object.entries(fields)
      .filter(([key, field]) => field.section === section && !CORE_FIELDS.includes(key))
      .sort((a, b) => a[1].ordinal - b[1].ordinal);
  };

  const generateKeyFromLabel = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleLabelChange = (label: string) => {
    setFormData(prev => ({
      ...prev,
      label,
      key: prev.key || generateKeyFromLabel(label),
    }));
  };

  const openDialog = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        label: field.label,
        key: field.key,
        type: field.type,
        options: field.options.join(', '),
        section: field.section,
        required: field.required,
        is_sensitive: field.is_sensitive,
        active: field.active,
      });
    } else {
      setEditingField(null);
      setFormData({
        label: '',
        key: '',
        type: 'text',
        options: '',
        section: 'Profile',
        required: false,
        is_sensitive: false,
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const saveCustomField = async () => {
    try {
      const options = formData.options
        .split(',')
        .map(o => o.trim())
        .filter(o => o);

      const fieldData = {
        label: formData.label,
        key: formData.key,
        type: formData.type,
        options,
        section: formData.section,
        required: formData.required,
        is_sensitive: formData.is_sensitive,
        active: formData.active,
        ordinal: editingField?.ordinal || customFields.length + 1,
      };

      if (editingField) {
        const { error } = await supabase
          .from('employee_fields' as any)
          .update(fieldData)
          .eq('id', editingField.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_fields' as any)
          .insert([fieldData]);
        
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Custom field ${editingField ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      loadCustomFields();
    } catch (error) {
      console.error('Error saving custom field:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingField ? 'update' : 'create'} custom field`,
        variant: 'destructive',
      });
    }
  };

  const deleteCustomField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
      const { error } = await supabase
        .from('employee_fields' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom field deleted successfully',
      });

      loadCustomFields();
    } catch (error) {
      console.error('Error deleting custom field:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom field',
        variant: 'destructive',
      });
    }
  };

  const moveCustomField = async (field: CustomField, direction: 'up' | 'down') => {
    const sectionFields = customFields
      .filter(f => f.section === field.section)
      .sort((a, b) => a.ordinal - b.ordinal);
    
    const currentIndex = sectionFields.findIndex(f => f.id === field.id);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sectionFields.length - 1)
    ) {
      return;
    }
    
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const [currentField, swapField] = [sectionFields[currentIndex], sectionFields[swapIndex]];
    
    try {
      await supabase
        .from('employee_fields' as any)
        .update({ ordinal: swapField.ordinal })
        .eq('id', currentField.id);
      
      await supabase
        .from('employee_fields' as any)
        .update({ ordinal: currentField.ordinal })
        .eq('id', swapField.id);
      
      loadCustomFields();
    } catch (error) {
      console.error('Error reordering fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder fields',
        variant: 'destructive',
      });
    }
  };

  const getCustomFieldsBySection = (section: string) => {
    return customFields
      .filter(f => f.section === section)
      .sort((a, b) => a.ordinal - b.ordinal);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Employee Fields Settings" 
        description="Configure which employee fields are visible and required"
      />
      
      <PageContent>
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Core Fields Section */}
          <Card>
            <CardHeader>
              <CardTitle>Core Fields</CardTitle>
              <CardDescription>
                These fields are always visible on employee profiles and cannot be hidden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {CORE_FIELDS.map((fieldKey) => (
                  <Badge key={fieldKey} variant="secondary" className="text-sm py-1.5 px-3">
                    {formatFieldName(fieldKey)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configurable System Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Configurable System Fields</CardTitle>
              <CardDescription>
                Configure visibility and requirements for additional employee fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {SECTIONS.map(section => {
                  const sectionFields = getFieldsBySection(section);
                  
                  if (sectionFields.length === 0) return null;
                  
                  return (
                    <div key={section}>
                      <h3 className="text-sm font-medium mb-3">{section}</h3>
                      <div className="space-y-3">
                        {sectionFields.map(([fieldName, fieldConfig], index) => (
                          <div 
                            key={fieldName}
                            className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                          >
                            <div className="flex-1 min-w-0">
                              <Label className="font-medium">
                                {formatFieldName(fieldName)}
                              </Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${fieldName}-visible`} className="text-sm text-muted-foreground">
                                Visible
                              </Label>
                              <Switch
                                id={`${fieldName}-visible`}
                                checked={fieldConfig.visible}
                                onCheckedChange={(checked) => 
                                  updateField(fieldName, { visible: checked })
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Label htmlFor={`${fieldName}-required`} className="text-sm text-muted-foreground">
                                Required
                              </Label>
                              <Switch
                                id={`${fieldName}-required`}
                                checked={fieldConfig.required}
                                onCheckedChange={(checked) => 
                                  updateField(fieldName, { required: checked })
                                }
                              />
                            </div>

                            <Select
                              value={fieldConfig.section}
                              onValueChange={(value) => 
                                updateField(fieldName, { section: value })
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTIONS.map(sec => (
                                  <SelectItem key={sec} value={sec}>
                                    {sec}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveField(fieldName, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveField(fieldName, 'down')}
                                disabled={index === sectionFields.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Custom Fields</CardTitle>
                  <CardDescription>
                    Create and manage custom employee fields
                  </CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingField ? 'Edit' : 'Add'} Custom Field
                      </DialogTitle>
                      <DialogDescription>
                        Configure a custom field for employee data
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="label">Label</Label>
                        <Input
                          id="label"
                          value={formData.label}
                          onChange={(e) => handleLabelChange(e.target.value)}
                          placeholder="Field label"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="key">Key</Label>
                        <Input
                          id="key"
                          value={formData.key}
                          onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                          placeholder="field_key"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(formData.type === 'select' || formData.type === 'multiselect') && (
                        <div className="grid gap-2">
                          <Label htmlFor="options">Options (comma-separated)</Label>
                          <Input
                            id="options"
                            value={formData.options}
                            onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="section">Section</Label>
                        <Select
                          value={formData.section}
                          onValueChange={(value) => setFormData({ ...formData, section: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTIONS.map(sec => (
                              <SelectItem key={sec} value={sec}>
                                {sec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="required"
                            checked={formData.required}
                            onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                          />
                          <Label htmlFor="required">Required</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="sensitive"
                            checked={formData.is_sensitive}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_sensitive: checked })}
                          />
                          <Label htmlFor="sensitive">Sensitive</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                          />
                          <Label htmlFor="active">Active</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveCustomField}>
                        Save Field
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {SECTIONS.map(section => {
                const sectionFields = getCustomFieldsBySection(section);
                if (sectionFields.length === 0) return null;

                return (
                  <div key={section} className="mb-6 last:mb-0">
                    <h3 className="text-sm font-medium mb-3">{section}</h3>
                    <div className="space-y-2">
                      {sectionFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-4 p-4 border rounded-lg bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{field.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {field.key} • {FIELD_TYPES.find(t => t.value === field.type)?.label}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            {field.required && (
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded">Required</span>
                            )}
                            {field.is_sensitive && (
                              <span className="px-2 py-1 bg-destructive/10 text-destructive rounded">Sensitive</span>
                            )}
                            {!field.active && (
                              <span className="px-2 py-1 bg-muted text-muted-foreground rounded">Inactive</span>
                            )}
                          </div>

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveCustomField(field, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moveCustomField(field, 'down')}
                              disabled={index === sectionFields.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDialog(field)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCustomField(field.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {customFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No custom fields yet. Click "Add Field" to create one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
