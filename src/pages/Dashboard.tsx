import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileCompleteness } from '@/components/dashboard/ProfileCompleteness';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  // Fetch employee statistics using efficient count queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      // Calculate start of current month for "new this month"
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Run three parallel count queries
      const [activeResult, onboardingResult, newThisMonthResult] = await Promise.all([
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'onboarding'),
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth),
      ]);

      if (activeResult.error) throw activeResult.error;
      if (onboardingResult.error) throw onboardingResult.error;
      if (newThisMonthResult.error) throw newThisMonthResult.error;

      return {
        active: activeResult.count || 0,
        onboarding: onboardingResult.count || 0,
        newThisMonth: newThisMonthResult.count || 0,
      };
    },
  });

  const handleFinalizeSetup = async () => {
    setIsLoading(true);
    setResponse(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('post-signin');
      
      if (error) {
        setResponse({ error: error.message });
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setResponse(data);
        toast({
          title: 'Success',
          description: 'Setup finalized successfully',
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setResponse({ error: errorMsg });
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContent className="max-w-4xl">
      <PageHeader 
        title="Dashboard" 
        description={`Welcome back, ${user?.email}`}
      />

      {/* Profile Completeness Widget */}
      <ProfileCompleteness />

      {/* Employee Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2 text-muted-foreground">Active Employees</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-6 font-semibold mt-1">{stats?.active || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <UserPlus className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-2 text-muted-foreground">Onboarding</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-6 font-semibold mt-1">{stats?.onboarding || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <Calendar className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-2 text-muted-foreground">New This Month</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-6 font-semibold mt-1">{stats?.newThisMonth || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Setup</CardTitle>
              <CardDescription>
                Finalize your account setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleFinalizeSetup} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Finalize setup'}
              </Button>
              
              {response && (
                <div className="rounded-md bg-muted p-4">
                  <p className="mb-2 text-sm font-medium">Response:</p>
                  <pre className="overflow-auto text-xs">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>
                Your dashboard overview and quick stats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is your main dashboard area. Add widgets and content here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                Recent activity and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track your recent activities and notifications here.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Tips to help you make the most of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">1. Explore Features</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate through different sections using the bottom navigation on mobile or top menu on desktop.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">2. Customize Your Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Personalize your dashboard by adding widgets and adjusting settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </PageContent>
  );
}
