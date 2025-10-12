import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const hasCheckedSession = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const checkSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      console.log('Auth callback: Starting session check');

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        console.log('Auth callback: Timeout - no session found');
        setError(true);
      }, 10000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Auth callback: Error -', sessionError);
          clearTimeout(timeoutRef.current);
          setError(true);
          return;
        }

        if (session) {
          console.log('Auth callback: Session found, redirecting to dashboard');
          clearTimeout(timeoutRef.current);
          
          // Invoke post-signin edge function
          try {
            await supabase.functions.invoke('post-signin');
          } catch (error) {
            console.error('Post-signin error:', error);
          }
          
          navigate('/app/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback: Error -', error);
        clearTimeout(timeoutRef.current);
        setError(true);
      }
    };

    checkSession();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Sign-in Failed</CardTitle>
            <CardDescription>
              We couldn't sign you in. This might happen if the link expired or was already used.
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
