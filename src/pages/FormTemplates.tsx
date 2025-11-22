import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Copy, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function FormTemplates() {
  const navigate = useNavigate();

  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ['form-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form template?')) return;

    const { error } = await supabase
      .from('form_templates')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted');
      refetch();
    }
  };

  const handleDuplicate = async (template: any) => {
    const { data: session } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.session?.user?.id)
      .single();

    const { error } = await supabase
      .from('form_templates')
      .insert([{
        name: `${template.name} (Copy)`,
        description: template.description,
        fields: template.fields as any,
        updates_profile: template.updates_profile,
        profile_field_mapping: template.profile_field_mapping as any,
        org_id: profile?.org_id,
      }]);

    if (error) {
      toast.error('Failed to duplicate template');
    } else {
      toast.success('Template duplicated');
      refetch();
    }
  };

  return (
    <>
      <PageHeader
        title="Form Templates"
        description="Create and manage forms to collect information from employees"
        actions={
          <Button onClick={() => navigate('/app/forms/templates/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        }
      />

      <PageContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : templates?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No form templates yet</p>
              <Button onClick={() => navigate('/app/forms/templates/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates?.filter(t => t.active).map((template) => {
              const fields = template.fields as any[];
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                      {template.updates_profile && (
                        <Badge variant="secondary" className="ml-2">Updates Profile</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {fields.length} field{fields.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/app/forms/templates/${template.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}
