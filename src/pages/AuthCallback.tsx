import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleRedirect = async (userId: string) => {
      if (isRedirecting) return;
      setIsRedirecting(true);
      
      clearTimeout(timeoutRef.current);
      
      // Poll for profile existence
      const maxAttempts = 6;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        
        if (profile) {
          navigate('/app/dashboard', { replace: true });
          return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If profile not found after polling, try dashboard anyway
      navigate('/app/dashboard', { replace: true });
    };

    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleRedirect(session.user.id);
      }
    });

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      if (!isRedirecting) {
        setError(true);
      }
    }, 15000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => {
            handleRedirect(session.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          clearTimeout(timeoutRef.current);
          setError(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutRef.current);
    };
  }, [navigate, isRedirecting]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Account Setup Failed</CardTitle>
            <CardDescription>
              Account setup failed. Please contact support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth/sign-in')} 
              className="w-full h-12"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <CardTitle>Signing you in...</CardTitle>
          <CardDescription>
            Please wait while we complete your authentication
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
