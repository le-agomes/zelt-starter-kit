import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16 md:min-h-[calc(100vh-4rem)] md:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
          Welcome to Your App
        </h1>
        <p className="mb-10 text-lg text-muted-foreground md:text-xl">
          A clean, mobile-first experience designed for simplicity and ease of use.
          Get started by signing in or exploring the dashboard.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-12 gap-2 px-8">
            <Link to="/auth/sign-in">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-8">
            <Link to="/app/dashboard">View Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
