import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  full_name?: string | null;
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client for auth user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Invite request from user:', user.id);

    // Get caller's org_id from profiles
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !callerProfile?.org_id) {
      throw new Error('Could not find user organization');
    }

    // Check if caller has permission (admin or hr)
    if (callerProfile.role !== 'admin' && callerProfile.role !== 'hr') {
      throw new Error('Only admins and HR can invite users');
    }

    console.log('Caller org_id:', callerProfile.org_id);

    // Parse request body
    const { email, full_name, role }: InviteUserRequest = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('Inviting user:', email, 'with role:', role);

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

    // Create user with email only (no password) and generate magic link
    const redirectUrl = `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/auth/callback`;
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        full_name: full_name || null,
        invited_by: user.id,
        org_id: callerProfile.org_id,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(createError.message);
    }

    if (!newUser.user) {
      throw new Error('Failed to create user');
    }

    console.log('User created:', newUser.user.id);

    // Generate and send magic link
    const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (magicLinkError) {
      console.error('Error generating magic link:', magicLinkError);
      // Don't fail the whole operation if just the email fails
    }

    // Upsert into profiles
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        org_id: callerProfile.org_id,
        full_name: full_name || null,
        email,
        role,
        active: true,
      }, {
        onConflict: 'id',
      });

    if (profileUpsertError) {
      console.error('Error upserting profile:', profileUpsertError);
      throw new Error('Failed to create user profile');
    }

    console.log('Profile created for user:', newUser.user.id);

    // Insert into user_roles
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role,
        profile_id: newUser.user.id,
      });

    if (roleInsertError) {
      console.error('Error inserting user role:', roleInsertError);
      // Don't fail if role insert fails, as profile already has role
    }

    console.log('User invitation completed successfully');

    return new Response(
      JSON.stringify({ 
        userId: newUser.user.id,
        message: 'User invited successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in invite-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
