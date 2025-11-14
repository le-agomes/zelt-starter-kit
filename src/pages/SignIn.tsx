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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16 pb-24 md:pb-16">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
          <CardDescription>
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'magic-link' | 'password')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="magic-link">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-magic">Email</Label>
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send magic link'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="password">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-password">Email</Label>
                  <Input
                    id="email-password"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Development Only
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            onClick={handleQuickDevLogin}
            disabled={isLoading}
          >
            <Badge variant="secondary" className="mr-2">DEV</Badge>
            Quick Dev Login (Testing)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
