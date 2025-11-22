import { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <TopNav />
        <div className="flex flex-1 w-full">
          <AppSidebar />
          <main className="flex-1 pb-20 md:pb-0">
            <div className="hidden md:block p-2 border-b border-border">
              <SidebarTrigger />
            </div>
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}

