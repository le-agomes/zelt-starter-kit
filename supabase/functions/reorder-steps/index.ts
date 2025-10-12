import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReorderRequest {
  workflowId: string;
  fromOrdinal: number;
  toOrdinal: number;
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

    const { workflowId, fromOrdinal, toOrdinal }: ReorderRequest = await req.json();

    console.log(`Reordering steps for workflow ${workflowId}: ${fromOrdinal} -> ${toOrdinal}`);

    // Fetch all steps for this workflow
    const { data: steps, error: fetchError } = await supabaseAdmin
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('ordinal', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!steps || steps.length === 0) {
      throw new Error('No steps found for this workflow');
    }

    // Find the step being moved
    const movingStep = steps.find((s) => s.ordinal === fromOrdinal);
    if (!movingStep) {
      throw new Error(`Step with ordinal ${fromOrdinal} not found`);
    }

    // Calculate new ordinals
    const updates: Array<{ id: string; ordinal: number }> = [];

    if (fromOrdinal < toOrdinal) {
      // Moving down: shift steps between from and to up by 1
      steps.forEach((step) => {
        if (step.id === movingStep.id) {
          updates.push({ id: step.id, ordinal: toOrdinal });
        } else if (step.ordinal > fromOrdinal && step.ordinal <= toOrdinal) {
          updates.push({ id: step.id, ordinal: step.ordinal - 1 });
        }
      });
    } else if (fromOrdinal > toOrdinal) {
      // Moving up: shift steps between to and from down by 1
      steps.forEach((step) => {
        if (step.id === movingStep.id) {
          updates.push({ id: step.id, ordinal: toOrdinal });
        } else if (step.ordinal >= toOrdinal && step.ordinal < fromOrdinal) {
          updates.push({ id: step.id, ordinal: step.ordinal + 1 });
        }
      });
    }

    // Apply updates atomically
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from('workflow_steps')
        .update({ ordinal: update.ordinal })
        .eq('id', update.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
    }

    console.log(`Successfully reordered ${updates.length} steps`);

    return new Response(
      JSON.stringify({ success: true, updated: updates.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reorder-steps:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
