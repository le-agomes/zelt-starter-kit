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
      .select('id, manager_profile_id')
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

    // Helper function to resolve assignment
    const resolveAssignment = async (step: any): Promise<string | null> => {
      const assignment = step.config?.assignment;
      
      if (!assignment || !assignment.mode) {
        console.log('No assignment config for step', step.id);
        return null;
      }

      if (assignment.mode === 'user' && assignment.user_id) {
        console.log('Assigning to user:', assignment.user_id);
        return assignment.user_id;
      }

      if (assignment.mode === 'role' && assignment.role) {
        console.log('Assigning by role:', assignment.role);
        const { data: roleProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('org_id', profile.org_id)
          .eq('role', assignment.role)
          .limit(1)
          .maybeSingle();
        
        if (roleProfile) {
          console.log('Found profile with role:', roleProfile.id);
          return roleProfile.id;
        }
        console.log('No profile found with role:', assignment.role);
        return null;
      }

      if (assignment.mode === 'dynamic' && assignment.strategy === 'employee_manager') {
        console.log('Assigning to employee manager');
        if (employee.manager_profile_id) {
          console.log('Manager found:', employee.manager_profile_id);
          return employee.manager_profile_id;
        }
        console.log('No manager assigned to employee');
        return null;
      }

      console.log('Unknown assignment config:', assignment);
      return null;
    };

    // Create run_step_instances for each step with resolved assignments
    const stepInstancesPromises = steps?.map(async (step) => {
      const assigned_to = await resolveAssignment(step);
      return {
        run_id: run.id,
        workflow_step_id: step.id,
        ordinal: step.ordinal,
        org_id: profile.org_id,
        status: 'pending',
        assigned_to,
        payload: step.config || {},
      };
    }) || [];

    const stepInstances = await Promise.all(stepInstancesPromises);

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
