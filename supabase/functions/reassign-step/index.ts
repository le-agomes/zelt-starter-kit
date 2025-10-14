import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReassignStepRequest {
  step_instance_id: string;
  user_id: string;
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

    const { step_instance_id, user_id } = await req.json() as ReassignStepRequest;

    console.log('Reassigning step instance:', step_instance_id, 'to user:', user_id);

    // Verify step instance belongs to user's org
    const { data: stepInstance, error: stepError } = await supabase
      .from('run_step_instances')
      .select('id, org_id')
      .eq('id', step_instance_id)
      .eq('org_id', profile.org_id)
      .single();

    if (stepError || !stepInstance) {
      throw new Error('Step instance not found or access denied');
    }

    // Verify the target user belongs to the same org
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', user_id)
      .eq('org_id', profile.org_id)
      .single();

    if (targetUserError || !targetUser) {
      throw new Error('Target user not found or not in same organization');
    }

    // Update the assignment
    const { error: updateError } = await supabase
      .from('run_step_instances')
      .update({ assigned_to: user_id })
      .eq('id', step_instance_id);

    if (updateError) {
      console.error('Error updating step assignment:', updateError);
      throw new Error('Failed to update step assignment: ' + updateError.message);
    }

    console.log('Step reassigned successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in reassign-step function:', error);
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
