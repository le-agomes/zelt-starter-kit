import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteUserRequest {
  email: string;
  full_name: string;
  role: 'admin' | 'hr' | 'manager' | 'it' | 'employee';
  create_employee?: boolean;
  employee_id?: string; // ID of existing employee to link
  employee_data?: {
    job_title?: string | null;
    department?: string | null;
    location?: string | null;
    start_date?: string | null;
    status?: 'active' | 'inactive' | 'pending';
    manager_profile_id?: string | null;
  };
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
    const { email, full_name, role, create_employee, employee_id, employee_data }: InviteUserRequest = await req.json();

    // SECURITY: Prevent HR from creating Admins
    if (role === 'admin' && callerProfile.role !== 'admin') {
      throw new Error('Only admins can invite other admins');
    }

    if (!email || !full_name) {
      throw new Error('Email and full name are required');
    }

    console.log('Inviting user:', email, 'with role:', role, 'create_employee:', create_employee, 'employee_id:', employee_id);

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

    // Invite user via email with metadata for database trigger
    const redirectUrl = `${req.headers.get('origin') || Deno.env.get('SUPABASE_URL')}/auth/callback`;
    
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: {
        full_name: full_name,
        org_id: callerProfile.org_id,
        role: role,
        invited_by: user.id,
      },
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      throw new Error(inviteError.message);
    }

    if (!newUser.user) {
      throw new Error('Failed to invite user');
    }

    console.log('User invited:', newUser.user.id, '- Database trigger will handle profile and role creation');

    // Link to existing employee if employee_id provided
    if (employee_id) {
      console.log('Linking profile to existing employee:', employee_id);
      
      const { error: linkError } = await supabaseAdmin
        .from('employees')
        .update({ profile_id: newUser.user.id })
        .eq('id', employee_id)
        .eq('org_id', callerProfile.org_id);

      if (linkError) {
        console.error('Error linking profile to employee:', linkError);
        // Don't fail the whole operation if linking fails
      } else {
        console.log('Profile linked to employee successfully');
      }
    }
    // Create employee record if requested
    else if (create_employee && employee_data) {
      console.log('Creating employee record for user:', newUser.user.id);
      
      const { error: employeeError } = await supabaseAdmin
        .from('employees')
        .upsert({
          org_id: callerProfile.org_id,
          profile_id: newUser.user.id,
          full_name: full_name,
          email: email,
          work_email: email,
          job_title: employee_data.job_title || null,
          department: employee_data.department || null,
          location: employee_data.location || null,
          start_date: employee_data.start_date || null,
          status: employee_data.status || 'active',
          manager_profile_id: employee_data.manager_profile_id || null,
        });

      if (employeeError) {
        console.error('Error creating employee record:', employeeError);
        // Don't fail the whole operation if employee creation fails
      } else {
        console.log('Employee record created for user:', newUser.user.id);
      }
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
    
    // Return 403 for authorization errors
    const isAuthError = error.message?.includes('Only admins') || error.message?.includes('Only admins and HR');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
      {
        status: isAuthError ? 403 : (error.message === 'Unauthorized' ? 401 : 500),
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
