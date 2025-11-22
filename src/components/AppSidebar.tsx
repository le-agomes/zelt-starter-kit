import { Home, Users, MessageSquare, FileText, ClipboardList, CheckSquare, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { to: '/app/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/app/employees', icon: Users, label: 'Employees' },
  { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/app/forms/templates', icon: FileText, label: 'Forms' },
  { to: '/app/my-requests', icon: ClipboardList, label: 'My Requests' },
  { to: '/app/my-tasks', icon: CheckSquare, label: 'My Tasks' },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { open } = useSidebar();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/app/settings')}>
                  <Link to="/app/settings/employee-fields">
                    <Settings />
                    <span>Employee Fields</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
