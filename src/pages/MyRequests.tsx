import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { PageContent } from '@/components/PageContent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { FormFillDialog } from '@/components/FormFillDialog';

export default function MyRequests() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: employee } = useQuery({
    queryKey: ['my-employee', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', session?.user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['my-form-requests', employee?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_requests')
        .select('*, form_template:form_templates(*)')
        .eq('employee_id', employee?.id)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.id,
  });

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const completedRequests = requests?.filter(r => r.status === 'completed') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'completed': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <>
      <PageHeader
        title="My Requests"
        description="Forms and information requests from HR"
      />

      <PageContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-8">
            {pendingRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pending Requests</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="hover:shadow-md transition-shadow border-2 border-primary/20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{request.form_template.name}</CardTitle>
                            {request.form_template.description && (
                              <CardDescription className="mt-1">
                                {request.form_template.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant={getStatusColor(request.status)} className="ml-2">
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Requested:</span>
                            <span>{format(new Date(request.requested_at), 'MMM d, yyyy')}</span>
                          </div>
                          {request.due_date && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Due:</span>
                              <span className="font-medium">{format(new Date(request.due_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          <Button 
                            className="w-full"
                            onClick={() => setSelectedRequest(request)}
                          >
                            Fill Form
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {completedRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Completed Requests</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {completedRequests.map((request) => (
                    <Card key={request.id} className="opacity-75">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{request.form_template.name}</CardTitle>
                          </div>
                          <Badge variant={getStatusColor(request.status)} className="ml-2">
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Completed:</span>
                            <span>{format(new Date(request.completed_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {requests?.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No form requests yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageContent>

      {selectedRequest && (
        <FormFillDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            refetch();
          }}
        />
      )}
    </>
  );
}
