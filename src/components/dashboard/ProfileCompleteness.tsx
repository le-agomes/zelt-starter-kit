import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, ChevronRight } from 'lucide-react';

interface FieldConfig {
  visible: boolean;
  required: boolean;
  section: string;
  ordinal: number;
}

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  active: boolean;
}

// System fields that can be tracked for completeness
const TRACKABLE_SYSTEM_FIELDS = [
  'personal_email',
  'phone_mobile',
  'address_line1',
  'city',
  'state',
  'postal_code',
  'country',
  'birth_date',
  'emergency_name',
  'emergency_phone',
  'emergency_email',
  'emergency_relation',
  'pronouns',
  'nationality',
  'preferred_name',
];

export function ProfileCompleteness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const calculateCompleteness = async () => {
      try {
        // Get the employee record for the current user
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (empError || !employee) {
          setIsLoading(false);
          return;
        }

        setEmployeeId(employee.id);

        // Fetch org settings to get visible fields
        const { data: settingsData, error: settingsError } = await supabase.functions.invoke('get-org-settings');
        
        const systemFields: Record<string, FieldConfig> = settingsError ? {} : (settingsData?.employee_system_fields || {});

        // Fetch custom fields for this org
        const { data: customFields, error: customError } = await supabase
          .from('employee_fields')
          .select('id, key, label, type, active')
          .eq('org_id', employee.org_id)
          .eq('active', true);

        // Fetch custom field values
        let customFieldValues: Record<string, any> = {};
        if (customFields && customFields.length > 0) {
          const fieldIds = customFields.map(f => f.id);
          const { data: values } = await supabase
            .from('employee_field_values')
            .select('field_id, value')
            .eq('employee_id', employee.id)
            .in('field_id', fieldIds);

          if (values) {
            values.forEach(v => {
              customFieldValues[v.field_id] = v.value;
            });
          }
        }

        // Calculate completeness
        let totalFields = 0;
        let filledFields = 0;

        // Check system fields
        for (const fieldKey of TRACKABLE_SYSTEM_FIELDS) {
          const config = systemFields[fieldKey];
          // Only count visible fields
          if (config?.visible) {
            totalFields++;
            const value = employee[fieldKey as keyof typeof employee];
            if (value !== null && value !== undefined && value !== '') {
              filledFields++;
            }
          }
        }

        // Check custom fields
        if (customFields && !customError) {
          for (const field of customFields) {
            totalFields++;
            const value = customFieldValues[field.id];
            if (value !== null && value !== undefined && value !== '') {
              filledFields++;
            }
          }
        }

        // Calculate percentage
        const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;
        setScore(completeness);
      } catch (error) {
        console.error('Error calculating profile completeness:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateCompleteness();
  }, [user]);

  // Don't render if loading, no score, or 100% complete
  if (isLoading || score === null || score === 100 || !employeeId) {
    return null;
  }

  const getProgressColor = () => {
    if (score < 30) return 'bg-destructive';
    if (score < 60) return 'bg-amber-500';
    if (score < 90) return 'bg-primary';
    return 'bg-green-500';
  };

  const getMessage = () => {
    if (score < 30) return 'Your profile needs attention';
    if (score < 60) return 'Good start! Keep going';
    if (score < 90) return 'Almost there!';
    return 'Just a few more details';
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          Profile Completeness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">{score}%</span>
            <span className="text-sm text-muted-foreground">{getMessage()}</span>
          </div>
          <div className="relative">
            <Progress value={score} className="h-2" />
            <div 
              className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        
        <Button 
          variant="outline" 
          className="w-full justify-between group"
          onClick={() => navigate(`/app/employees/${employeeId}`)}
        >
          Complete Your Profile
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
