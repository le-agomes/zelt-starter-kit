import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function TopNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card shadow-xs">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <Link to="/" className="text-base font-semibold text-foreground">
          HR Platform
        </Link>
        
        {user && (
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}

