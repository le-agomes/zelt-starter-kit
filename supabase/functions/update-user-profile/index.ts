import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateProfileRequest {
  userId: string;
  role?: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
  active?: boolean;
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

    // Check permissions (only admin/hr can update)
    if (callerProfile.role !== 'admin' && callerProfile.role !== 'hr') {
      throw new Error('Only admins and HR can update user profiles');
    }

    const { userId, role, active }: UpdateProfileRequest = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Updating profile for user:', userId, { role, active });

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

    // Build update object
    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update user profile');
    }

    console.log('Profile updated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in update-user-profile function:', error);
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
