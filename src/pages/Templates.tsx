import { useState } from 'react';
import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { NewTemplateDialog } from '@/components/NewTemplateDialog';

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  org_id: string;
}

export default function Templates() {
  const [search, setSearch] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', search],
    queryFn: async () => {
      let query = (supabase as any)
        .from('onboarding_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Template[];
    },
  });

  const filteredTemplates = templates || [];

  return (
    <PageContent>
      <PageHeader
        title="Templates"
        description="Manage onboarding templates for your team"
        actions={<NewTemplateDialog />}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-12"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && !search && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-5 font-semibold mb-2">No templates yet</h3>
            <p className="text-3 text-muted-foreground mb-6 max-w-sm">
              Create your first onboarding template to streamline the employee onboarding process.
            </p>
            <NewTemplateDialog />
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && filteredTemplates.length === 0 && search && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <p className="text-muted-foreground">
              No templates found matching "{search}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="space-y-4">
          {filteredTemplates.map((template) => (
            <Link key={template.id} to={`/app/templates/${template.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-5 mb-2">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 text-3 text-muted-foreground">
                        <span>
                          Created {format(new Date(template.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContent>
  );
}
