import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRunRequest {
  workflow_id: string;
  employee_id: string;
  start_date?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const { workflow_id, employee_id, start_date } = await req.json() as CreateRunRequest;

    console.log('Creating run for workflow:', workflow_id, 'employee:', employee_id);

    // Verify workflow belongs to user's org
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflow_id)
      .eq('org_id', profile.org_id)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found or access denied');
    }

    // Verify employee belongs to user's org
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .eq('org_id', profile.org_id)
      .single();

    if (employeeError || !employee) {
      throw new Error('Employee not found or access denied');
    }

    // Create the run
    const { data: run, error: runError } = await supabase
      .from('runs')
      .insert({
        workflow_id,
        employee_id,
        org_id: profile.org_id,
        started_by: user.id,
        status: 'running',
        started_at: start_date ? new Date(start_date).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating run:', runError);
      throw new Error('Failed to create run: ' + runError.message);
    }

    console.log('Run created:', run.id);

    // Get all workflow steps
    const { data: steps, error: stepsError } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflow_id)
      .order('ordinal');

    if (stepsError) {
      console.error('Error fetching workflow steps:', stepsError);
      throw new Error('Failed to fetch workflow steps: ' + stepsError.message);
    }

    console.log('Creating', steps?.length || 0, 'step instances');

    // Create run_step_instances for each step
    const stepInstances = steps?.map(step => ({
      run_id: run.id,
      workflow_step_id: step.id,
      ordinal: step.ordinal,
      org_id: profile.org_id,
      status: 'pending',
      assigned_to: null,
      payload: step.config || {},
    })) || [];

    if (stepInstances.length > 0) {
      const { error: instancesError } = await supabase
        .from('run_step_instances')
        .insert(stepInstances);

      if (instancesError) {
        console.error('Error creating step instances:', instancesError);
        throw new Error('Failed to create step instances: ' + instancesError.message);
      }
    }

    console.log('Run created successfully with', stepInstances.length, 'step instances');

    return new Response(
      JSON.stringify({ run_id: run.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-run function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
