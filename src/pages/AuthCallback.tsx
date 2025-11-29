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
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    console.log('Auth callback: Waiting for auth state change');

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      console.log('Auth callback: Timeout - no session found');
      setError(true);
    }, 15000);

    // Listen for auth state changes - this properly handles token exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth callback: Event -', event, 'Session:', !!session);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('Auth callback: User signed in, invoking post-signin');
          clearTimeout(timeoutRef.current);
          
          // Invoke post-signin edge function
          try {
            const { error: postSigninError } = await supabase.functions.invoke('post-signin');
            if (postSigninError) {
              console.error('Post-signin error:', postSigninError);
            } else {
              console.log('Post-signin completed successfully');
            }
          } catch (error) {
            console.error('Post-signin exception:', error);
          }
          
          navigate('/app/dashboard', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth callback: User signed out');
          clearTimeout(timeoutRef.current);
          setError(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
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
