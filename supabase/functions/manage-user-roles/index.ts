import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageRolesRequest {
  userId: string;
  action: 'add' | 'remove';
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get caller's profile
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !callerProfile) {
      throw new Error('Could not find user profile');
    }

    // Check permissions
    if (callerProfile.role !== 'admin' && callerProfile.role !== 'hr') {
      throw new Error('Only admins and HR can manage user roles');
    }

    const { userId, action, role }: ManageRolesRequest = await req.json();

    if (!userId || !action || !role) {
      throw new Error('userId, action, and role are required');
    }

    console.log('Managing roles for user:', userId, { action, role });

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

    // Verify target user is in same org
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError || !targetProfile || targetProfile.org_id !== callerProfile.org_id) {
      throw new Error('User not found or not in your organization');
    }

    if (action === 'add') {
      // Add role to user_roles
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          profile_id: userId,
        });

      if (insertError) {
        // Check if it's a duplicate
        if (insertError.code === '23505') {
          throw new Error('User already has this role');
        }
        console.error('Error adding role:', insertError);
        throw new Error('Failed to add role');
      }
    } else if (action === 'remove') {
      // Remove role from user_roles
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (deleteError) {
        console.error('Error removing role:', deleteError);
        throw new Error('Failed to remove role');
      }
    }

    console.log('Role management completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in manage-user-roles function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message === 'Unauthorized' ? 401 : 
               error.message.includes('Only admins') ? 403 : 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
