import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteStepRequest {
  step_instance_id: string;
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
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { step_instance_id } = await req.json() as CompleteStepRequest;

    // Verify the step instance belongs to the user's org
    const { data: stepInstance, error: stepError } = await supabase
      .from('run_step_instances')
      .select('id, run_id, org_id, ordinal, status')
      .eq('id', step_instance_id)
      .eq('org_id', profile.org_id)
      .single();

    if (stepError || !stepInstance) {
      console.error('Step instance error:', stepError);
      return new Response(JSON.stringify({ error: 'Step instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark the step as completed
    const { error: updateError } = await supabase
      .from('run_step_instances')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
      })
      .eq('id', step_instance_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to complete step' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the next pending step in the same run
    const { data: nextStep } = await supabase
      .from('run_step_instances')
      .select('id')
      .eq('run_id', stepInstance.run_id)
      .eq('status', 'pending')
      .gt('ordinal', stepInstance.ordinal)
      .order('ordinal', { ascending: true })
      .limit(1)
      .maybeSingle();

    // If no next pending step, mark the run as completed
    if (!nextStep) {
      const { error: runError } = await supabase
        .from('runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepInstance.run_id);

      if (runError) {
        console.error('Run update error:', runError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
