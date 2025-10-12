import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DuplicateRequest {
  workflowId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { workflowId }: DuplicateRequest = await req.json();

    console.log(`Duplicating workflow ${workflowId}`);

    // Fetch the original workflow
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError) {
      throw workflowError;
    }

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Fetch all steps for this workflow
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('ordinal', { ascending: true });

    if (stepsError) {
      throw stepsError;
    }

    // Create new workflow with copied name
    const newWorkflowName = `${workflow.name} (Copy)`;
    const { data: newWorkflow, error: newWorkflowError } = await supabaseAdmin
      .from('workflows')
      .insert({
        name: newWorkflowName,
        description: workflow.description,
        org_id: workflow.org_id,
        is_active: workflow.is_active,
      })
      .select()
      .single();

    if (newWorkflowError) {
      throw newWorkflowError;
    }

    console.log(`Created new workflow ${newWorkflow.id}`);

    // Copy all steps if there are any
    if (steps && steps.length > 0) {
      const newSteps = steps.map((step) => ({
        workflow_id: newWorkflow.id,
        ordinal: step.ordinal,
        title: step.title,
        type: step.type,
        owner_role: step.owner_role,
        due_days_from_start: step.due_days_from_start,
        auto_advance: step.auto_advance,
        config: step.config,
      }));

      const { error: insertStepsError } = await supabaseAdmin
        .from('workflow_steps')
        .insert(newSteps);

      if (insertStepsError) {
        throw insertStepsError;
      }

      console.log(`Copied ${newSteps.length} steps`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflowId: newWorkflow.id,
        stepsCount: steps?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in duplicate-workflow:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
