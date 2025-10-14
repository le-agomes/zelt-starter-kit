import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card">
                  <DropdownMenuItem asChild>
                    <Link to="/app/settings/employee-fields" className="cursor-pointer">
                      Employee Fields
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
