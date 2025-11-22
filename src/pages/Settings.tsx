import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { EmployeeFieldsTab } from '@/components/settings/EmployeeFieldsTab';
import { FormTemplatesTab } from '@/components/settings/FormTemplatesTab';
import { MyProfileTab } from '@/components/settings/MyProfileTab';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(data?.role || '');
      }
      setLoading(false);
    };
    fetchRole();
  }, []);

  const isAdminOrHR = userRole === 'admin' || userRole === 'hr';
  const defaultTab = isAdminOrHR ? 'employee-fields' : 'profile';
  const activeTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Settings" 
        description="Manage your profile and organization settings"
      />
      
      <PageContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            {isAdminOrHR && (
              <TabsTrigger value="employee-fields">Employee Fields</TabsTrigger>
            )}
            {isAdminOrHR && (
              <TabsTrigger value="form-templates">Form Templates</TabsTrigger>
            )}
            <TabsTrigger value="profile">My Profile</TabsTrigger>
          </TabsList>
          
          {isAdminOrHR && (
            <TabsContent value="employee-fields">
              <EmployeeFieldsTab />
            </TabsContent>
          )}
          
          {isAdminOrHR && (
            <TabsContent value="form-templates">
              <FormTemplatesTab />
            </TabsContent>
          )}
          
          <TabsContent value="profile">
            <MyProfileTab />
          </TabsContent>
        </Tabs>
      </PageContent>
    </div>
  );
}
