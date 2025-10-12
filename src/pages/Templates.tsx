import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';

export default function Templates() {
  return (
    <PageContent>
      <PageHeader
        title="Templates"
        description="Manage onboarding templates for your team"
        actions={
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Template
          </Button>
        }
      />

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-5 font-semibold mb-2">No templates yet</h3>
          <p className="text-3 text-muted-foreground mb-6 max-w-sm">
            Create your first onboarding template to streamline the employee onboarding process.
          </p>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Your First Template
          </Button>
        </CardContent>
      </Card>
    </PageContent>
  );
}
