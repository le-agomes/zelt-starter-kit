import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'magic-link' | 'password'>('magic-link');
  const { signInWithMagicLink, signInWithPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already signed in
  if (user) {
    navigate('/app/dashboard');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    if (authMethod === 'password' && !password) {
      toast({
        title: 'Error',
        description: 'Please enter your password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = authMethod === 'magic-link' 
        ? await signInWithMagicLink(email)
        : await signInWithPassword(email, password);
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message || `Failed to ${authMethod === 'magic-link' ? 'send magic link' : 'sign in'}`,
          variant: 'destructive',
        });
      } else {
        if (authMethod === 'magic-link') {
          toast({
            title: 'Check your email!',
            description: 'We sent you a magic link to sign in.',
          });
          setEmail('');
        } else {
          // Password login redirects automatically via AuthContext
          navigate('/app/dashboard');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDevLogin = async () => {
    setIsLoading(true);
    setEmail('antoniogomesantos@gmail.com');
    
    try {
      // Note: This requires the user to have set a password in Supabase
      const { error } = await signInWithPassword('antoniogomesantos@gmail.com', 'test123');
      
      if (error) {
        toast({
          title: 'Quick Login Failed',
          description: 'Make sure the test account has a password set in Supabase',
          variant: 'destructive',
        });
      } else {
        navigate('/app/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Quick login failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-muted/30">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            HR
          </div>
          <CardTitle className="text-lg">Sign In</CardTitle>
          <CardDescription className="text-xs">
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'magic-link' | 'password')}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="magic-link" className="text-xs">Magic Link</TabsTrigger>
              <TabsTrigger value="password" className="text-xs">Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="magic-link" className="mt-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-magic" className="text-xs">Email</Label>
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send magic link'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="password" className="mt-3">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email-password" className="text-xs">Email</Label>
                  <Input
                    id="email-password"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
