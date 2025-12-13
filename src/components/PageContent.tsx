import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn('container mx-auto px-4 py-4 space-y-4', className)}>
      {children}
    </div>
  );
}
