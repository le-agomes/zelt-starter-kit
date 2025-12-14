import { Home, LayoutDashboard, Users, FileText, PlayCircle, CheckSquare, ClipboardList, MessageSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/app/dashboard', icon: Home, label: 'Home' },
  { to: '/app/employees', icon: Users, label: 'Employees' },
  // { to: '/app/chat', icon: MessageSquare, label: 'Chat' }, // Temporarily hidden due to performance issues
  { to: '/app/my-requests', icon: ClipboardList, label: 'Requests' },
  { to: '/app/my-tasks', icon: CheckSquare, label: 'Tasks' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-md md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
