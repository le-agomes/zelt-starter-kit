import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FieldConfig {
  visible: boolean;
  required: boolean;
  section: string;
  ordinal: number;
}

type EmployeeSystemFields = Record<string, FieldConfig>;

const SECTIONS = ['Identity', 'Contact', 'Employment', 'Emergency'];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
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
      .filter(([_, field]) => field.section === section)
      .sort((a, b) => a[1].ordinal - b[1].ordinal);
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

          {SECTIONS.map(section => {
            const sectionFields = getFieldsBySection(section);
            
            if (sectionFields.length === 0) return null;
            
            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle>{section}</CardTitle>
                  <CardDescription>
                    Configure {section.toLowerCase()} fields for employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PageContent>
    </div>
  );
}
