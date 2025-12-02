import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type EmployeeFieldType = Database['public']['Enums']['field_type'];

interface SystemFieldConfig {
  visible: boolean;
  required: boolean;
}

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: EmployeeFieldType;
  required: boolean;
  options?: string[];
  section: string;
}

const SYSTEM_FIELDS = [
  { key: 'personal_email', label: 'Personal Email', type: 'email' },
  { key: 'phone_mobile', label: 'Mobile Phone', type: 'tel' },
  { key: 'address_line1', label: 'Address Line 1', type: 'text' },
  { key: 'address_line2', label: 'Address Line 2', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'state', label: 'State/Province', type: 'text' },
  { key: 'postal_code', label: 'Postal Code', type: 'text' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'emergency_name', label: 'Emergency Contact Name', type: 'text' },
  { key: 'emergency_phone', label: 'Emergency Contact Phone', type: 'tel' },
  { key: 'emergency_email', label: 'Emergency Contact Email', type: 'email' },
  { key: 'emergency_relation', label: 'Emergency Contact Relation', type: 'text' },
  { key: 'birth_date', label: 'Date of Birth', type: 'date' },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [systemFieldsConfig, setSystemFieldsConfig] = useState<Record<string, SystemFieldConfig>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Build dynamic schema based on settings
  const buildSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    // Add system fields
    SYSTEM_FIELDS.forEach(field => {
      const config = systemFieldsConfig[field.key];
      if (config?.visible) {
        if (config.required) {
          schemaFields[field.key] = z.string().min(1, `${field.label} is required`);
        } else {
          schemaFields[field.key] = z.string().optional();
        }
      }
    });

    // Add custom fields
    customFields.forEach(field => {
      if (field.required) {
        schemaFields[field.key] = z.string().min(1, `${field.label} is required`);
      } else {
        schemaFields[field.key] = z.string().optional();
      }
    });

    return z.object(schemaFields);
  };

  const form = useForm({
    resolver: zodResolver(buildSchema()),
    mode: 'onChange',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch employee record
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Fetch org settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('org_settings')
        .select('employee_system_fields')
        .eq('org_id', empData.org_id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      const systemFields = (settingsData?.employee_system_fields || {}) as unknown as Record<string, SystemFieldConfig>;
      setSystemFieldsConfig(systemFields);

      // Fetch custom fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('employee_fields')
        .select('*')
        .eq('org_id', empData.org_id)
        .eq('active', true)
        .order('ordinal');

      if (fieldsError) throw fieldsError;

      const customFieldsList: CustomField[] = (fieldsData || []).map(f => {
        let options: string[] = [];
        if (f.options && Array.isArray(f.options)) {
          options = f.options.filter((opt): opt is string => typeof opt === 'string');
        }
        
        return {
          id: f.id,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required || false,
          options,
          section: f.section || 'Profile',
        };
      });

      setCustomFields(customFieldsList);

      // Pre-fill form with existing data
      const defaultValues: Record<string, any> = {};
      SYSTEM_FIELDS.forEach(field => {
        if (empData[field.key]) {
          defaultValues[field.key] = empData[field.key];
        }
      });
      form.reset(defaultValues);

    } catch (error: any) {
      console.error('Error loading onboarding data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load onboarding data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const visibleSystemFields = SYSTEM_FIELDS.filter(
    field => systemFieldsConfig[field.key]?.visible
  );

  const hasPersonalDetailsStep = visibleSystemFields.length > 0;
  const hasCompanyInfoStep = customFields.length > 0;

  const totalSteps = 2 + (hasPersonalDetailsStep ? 1 : 0) + (hasCompanyInfoStep ? 1 : 0);

  const validateCurrentStep = async () => {
    let fieldsToValidate: string[] = [];

    if (currentStep === 2 && hasPersonalDetailsStep) {
      fieldsToValidate = visibleSystemFields.map(f => f.key);
    } else if (currentStep === (hasPersonalDetailsStep ? 3 : 2) && hasCompanyInfoStep) {
      fieldsToValidate = customFields.map(f => f.key);
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate);
      return isValid;
    }

    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: any) => {
    try {
      setSubmitting(true);

      // Prepare update data for employees table
      const updateData: Record<string, any> = {
        status: 'active',
      };

      // Add system fields
      SYSTEM_FIELDS.forEach(field => {
        if (data[field.key] !== undefined) {
          updateData[field.key] = data[field.key];
        }
      });

      // Update employee record
      const { data: updatedEmployee, error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employee.id)
        .select('status')
        .single();

      if (updateError) {
        console.error('Employee update failed:', updateError);
        toast({
          title: 'Error',
          description: updateError.message || 'Failed to update your profile. Please try again.',
          variant: 'destructive',
        });
        return; // Exit early, don't navigate
      }

      // Verify the status was actually updated
      if (updatedEmployee?.status !== 'active') {
        console.error('Status not updated correctly:', updatedEmployee);
        toast({
          title: 'Error',
          description: 'Profile update did not complete successfully. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Handle custom fields (store in employee_field_values)
      for (const field of customFields) {
        if (data[field.key] !== undefined && data[field.key] !== '') {
          const { error: valueError } = await supabase
            .from('employee_field_values')
            .upsert({
              employee_id: employee.id,
              field_id: field.id,
              value: data[field.key],
            });

          if (valueError) {
            console.error('Custom field update failed:', valueError);
            // Continue anyway - profile is active, custom fields are secondary
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Your profile has been completed!',
      });

      // Wait briefly for state to propagate before navigating
      // This ensures OnboardingGuard sees the updated status
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to dashboard
      navigate('/app/dashboard', { replace: true });

    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (fieldKey: string, label: string, type: string, required: boolean, options?: string[]) => {
    if (type === 'select' && options && options.length > 0) {
      return (
        <FormField
          key={fieldKey}
          label={label}
          required={required}
          error={form.formState.errors[fieldKey]?.message as string}
        >
          <Select
            value={form.watch(fieldKey) || ''}
            onValueChange={(value) => form.setValue(fieldKey, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      );
    }

    if (type === 'text' && fieldKey.includes('address')) {
      return (
        <FormField
          key={fieldKey}
          label={label}
          required={required}
          error={form.formState.errors[fieldKey]?.message as string}
        >
          <Textarea
            {...form.register(fieldKey)}
            placeholder={label}
          />
        </FormField>
      );
    }

    return (
      <FormField
        key={fieldKey}
        label={label}
        required={required}
        error={form.formState.errors[fieldKey]?.message as string}
      >
        <Input
          {...form.register(fieldKey)}
          type={type}
          placeholder={label}
        />
      </FormField>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${
                  i < currentStep ? 'bg-primary' : 'bg-muted'
                } ${i > 0 ? 'ml-2' : ''}`}
              />
            ))}
          </div>
          <CardTitle>
            {currentStep === 1 && 'Welcome to the Team!'}
            {currentStep === 2 && hasPersonalDetailsStep && 'Personal Details'}
            {currentStep === 2 && !hasPersonalDetailsStep && hasCompanyInfoStep && 'Company Information'}
            {currentStep === 3 && hasPersonalDetailsStep && hasCompanyInfoStep && 'Company Information'}
            {currentStep === totalSteps && 'Complete Your Setup'}
          </CardTitle>
          <CardDescription>
            Step {currentStep} of {totalSteps}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-6 font-semibold">Welcome to {employee?.full_name}!</h2>
                <p className="text-3 text-muted-foreground">
                  Let's get your profile set up so you can get started. This will only take a few minutes.
                </p>
              </div>
            )}

            {/* Step 2: Personal Details (if visible system fields exist) */}
            {currentStep === 2 && hasPersonalDetailsStep && (
              <div className="space-y-4">
                {visibleSystemFields.map(field =>
                  renderField(
                    field.key,
                    field.label,
                    field.type,
                    systemFieldsConfig[field.key]?.required || false
                  )
                )}
              </div>
            )}

            {/* Step 3: Company Info (or Step 2 if no personal details) */}
            {((currentStep === 3 && hasPersonalDetailsStep) ||
              (currentStep === 2 && !hasPersonalDetailsStep)) &&
              hasCompanyInfoStep && (
                <div className="space-y-4">
                  {customFields.map(field =>
                    renderField(
                      field.key,
                      field.label,
                      field.type,
                      field.required,
                      field.options
                    )
                  )}
                </div>
              )}

            {/* Final Step: Finish */}
            {currentStep === totalSteps && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-6 font-semibold">You're All Set!</h2>
                <p className="text-3 text-muted-foreground">
                  Click 'Complete Setup' below to finalize your profile and access your dashboard.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || submitting}
              >
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
