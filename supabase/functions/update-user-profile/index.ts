import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the caller's user from the JWT
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !caller) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, role, active } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's profile
    const { data: callerProfile, error: callerError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', caller.id)
      .single();

    if (callerError || !callerProfile) {
      console.error('Error fetching caller profile:', callerError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has admin or hr role
    if (callerProfile.role !== 'admin' && callerProfile.role !== 'hr') {
      return new Response(
        JSON.stringify({ error: "You don't have permission to modify users" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user's profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      console.error('Error fetching target profile:', targetError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify same organization
    if (callerProfile.org_id !== targetProfile.org_id) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to modify users" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updates: any = {};
    if (role !== undefined) {
      updates.role = role;
    }
    if (active !== undefined) {
      updates.active = active;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No updates provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If role was updated, sync to user_roles table
    if (role !== undefined) {
      // Delete existing role
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // Insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (roleError) {
        console.error('Error syncing role:', roleError);
      }
    }

    console.log(`User ${userId} profile updated by ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
