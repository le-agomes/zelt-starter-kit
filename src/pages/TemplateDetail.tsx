import { PageContent } from '@/components/PageContent';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowLeft, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TemplateDetail() {
  return (
    <PageContent>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link to="/app/templates">
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Link>
        </Button>

        <PageHeader
          title="Template Name"
          description="Configure the steps for this onboarding template"
          actions={
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Step
            </Button>
          }
        />

        {/* Steps List Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-4 font-semibold">Template Steps</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-4 font-semibold mb-2">No steps yet</h3>
            <p className="text-2 text-muted-foreground mb-6 max-w-sm">
              Add steps to define the onboarding workflow for this template.
            </p>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
