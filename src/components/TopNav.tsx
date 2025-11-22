import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function TopNav() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="text-xl font-semibold text-foreground">
          App
        </Link>
        
        {user && (
          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}

