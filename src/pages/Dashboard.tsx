import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

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
    <div className="min-h-[calc(100vh-4rem)] px-6 py-8 pb-24 md:px-8 md:pb-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
          </p>
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
      </div>
    </div>
  );
}
