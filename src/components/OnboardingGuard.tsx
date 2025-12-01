import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [employeeStatus, setEmployeeStatus] = useState<string | null>(null);

  useEffect(() => {
    checkEmployeeStatus();
  }, [user, location.pathname]);

  const checkEmployeeStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch the employee record for this user
      const { data: employee, error } = await supabase
        .from('employees')
        .select('status')
        .eq('profile_id', user.id)
        .single();

      if (error) {
        // If no employee record exists, user is probably admin/HR, let them through
        console.error('Error fetching employee status:', error);
        setEmployeeStatus(null);
        setLoading(false);
        return;
      }

      setEmployeeStatus(employee.status);

      // Redirect logic
      const isOnboardingPage = location.pathname === '/app/onboarding';

      // Rule 1: If status is 'onboarding' and NOT on onboarding page, redirect to wizard
      if (employee.status === 'onboarding' && !isOnboardingPage) {
        navigate('/app/onboarding', { replace: true });
        return;
      }

      // Rule 2: If status is NOT 'onboarding' and IS on onboarding page, redirect to dashboard
      if (employee.status !== 'onboarding' && isOnboardingPage) {
        navigate('/app/dashboard', { replace: true });
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in onboarding guard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
