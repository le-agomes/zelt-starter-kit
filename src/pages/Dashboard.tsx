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
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Active Employees</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-0.5" />
                ) : (
                  <p className="text-xl font-semibold mt-0.5">{stats?.active || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10">
                <UserPlus className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Onboarding</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-0.5" />
                ) : (
                  <p className="text-xl font-semibold mt-0.5">{stats?.onboarding || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                <Calendar className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">New This Month</p>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12 mt-0.5" />
                ) : (
                  <p className="text-xl font-semibold mt-0.5">{stats?.newThisMonth || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Overview</CardTitle>
              <CardDescription className="text-xs">
                Your dashboard overview and quick stats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                This is your main dashboard area. Add widgets and content here.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Activity</CardTitle>
              <CardDescription className="text-xs">
                Recent activity and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Track your recent activities and notifications here.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Getting Started</CardTitle>
              <CardDescription className="text-xs">
                Tips to help you make the most of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">1. Explore Features</h3>
                <p className="text-xs text-muted-foreground">
                  Navigate through different sections using the sidebar on desktop or bottom navigation on mobile.
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium">2. Customize Your Experience</h3>
                <p className="text-xs text-muted-foreground">
                  Personalize your dashboard by adding widgets and adjusting settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </PageContent>
  );
}
