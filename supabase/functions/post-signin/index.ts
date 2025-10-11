import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated client from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('User not authenticated');
    }

    console.log('Processing post-signin for user:', user.id);

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabaseClient
      .from('profiles')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking profile:', profileCheckError);
      throw profileCheckError;
    }

    // If profile exists, return it
    if (existingProfile) {
      console.log('Profile exists, returning:', existingProfile.id);
      return new Response(
        JSON.stringify({ profile: existingProfile }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Profile doesn't exist - create org and profile using service role to bypass RLS
    console.log('Creating new org and profile for user:', user.id);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: 'My Company' })
      .select()
      .single();

    if (orgError || !newOrg) {
      console.error('Error creating organization:', orgError);
      throw new Error('Failed to create organization');
    }

    console.log('Created organization:', newOrg.id);

    // Create profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        org_id: newOrg.id,
        role: 'admin',
        full_name: user.email || 'User',
      })
      .select('*, organizations(*)')
      .single();

    if (profileError || !newProfile) {
      console.error('Error creating profile:', profileError);
      throw new Error('Failed to create profile');
    }

    console.log('Created profile:', newProfile.id);

    return new Response(
      JSON.stringify({ profile: newProfile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Post-signin error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
