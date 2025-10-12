import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function TopNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="hidden border-b border-border bg-card md:block">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="text-xl font-semibold text-foreground">
          App
        </Link>
        
        <nav className="flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          {user && (
            <>
              <Link
                to="/app/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/app/employees"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Employees
              </Link>
              <Link
                to="/app/workflows"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Workflows
              </Link>
            </>
          )}
          {user ? (
            <Button
              onClick={signOut}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth/sign-in">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
