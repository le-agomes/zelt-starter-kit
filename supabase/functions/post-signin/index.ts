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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'not_authenticated' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

    // If profile exists, check if it needs to be linked to an org
    if (existingProfile) {
      console.log('Profile exists:', existingProfile.id);
      
      // If profile has no org_id, try to link to employee
      if (!existingProfile.org_id) {
        console.log('Profile missing org_id, checking for employee record');
        
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Check for employee by email (properly escaped for special chars)
        const { data: employeeByEmail, error: employeeCheckError } = await supabaseAdmin
          .from('employees')
          .select('id, org_id, email, work_email, personal_email')
          .eq('email', user.email)
          .maybeSingle();

        let existingEmployee = employeeByEmail;

        // If not found by primary email, try work_email
        if (!existingEmployee && !employeeCheckError) {
          const { data: employeeByWorkEmail } = await supabaseAdmin
            .from('employees')
            .select('id, org_id, email, work_email, personal_email')
            .eq('work_email', user.email)
            .maybeSingle();
          existingEmployee = employeeByWorkEmail;
        }

        // If still not found, try personal_email
        if (!existingEmployee && !employeeCheckError) {
          const { data: employeeByPersonalEmail } = await supabaseAdmin
            .from('employees')
            .select('id, org_id, email, work_email, personal_email')
            .eq('personal_email', user.email)
            .maybeSingle();
          existingEmployee = employeeByPersonalEmail;
        }

        if (employeeCheckError) {
          console.error('Error checking employee:', employeeCheckError);
        }

        if (existingEmployee) {
          console.log('Found employee, linking to org:', existingEmployee.org_id);
          
          // Update profile with org_id and role
          const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              org_id: existingEmployee.org_id, 
              role: 'employee',
              email: user.email 
            })
            .eq('id', existingProfile.id)
            .select('*, organizations(*)')
            .single();

          if (updateError || !updatedProfile) {
            console.error('Error updating profile:', updateError);
            throw new Error('Failed to update profile');
          }

          console.log('Updated profile with org:', updatedProfile.id);

          // Link employee to profile
          const { error: linkError } = await supabaseAdmin
            .from('employees')
            .update({ profile_id: user.id })
            .eq('id', existingEmployee.id);

          if (linkError) {
            console.error('Error linking profile to employee:', linkError);
          }

          return new Response(
            JSON.stringify({ 
              org: updatedProfile.organizations,
              profile: {
                id: updatedProfile.id,
                full_name: updatedProfile.full_name,
                org_id: updatedProfile.org_id,
                role: updatedProfile.role,
                created_at: updatedProfile.created_at
              }
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } else {
          // No employee match - create new org for self-signup
          console.log('No employee match found, creating new organization for self-signup');
          
          const { data: newOrg, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
              name: `${(user.email || 'user').split('@')[0]}'s Organization`,
            })
            .select()
            .single();
          
          if (orgError || !newOrg) {
            console.error('Error creating organization:', orgError);
            throw new Error('Failed to create organization');
          }
          
          console.log('Created new organization:', newOrg.id);
          
          // Update profile with org_id and set as admin
          const { data: updatedProfile, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              org_id: newOrg.id,
              role: 'admin',
            })
            .eq('id', existingProfile.id)
            .select()
            .single();
          
          if (updateError || !updatedProfile) {
            console.error('Error updating profile:', updateError);
            throw new Error('Failed to update profile');
          }
          
          console.log('Profile updated with new org, returning org data');
          return new Response(
            JSON.stringify({
              org: newOrg,
              profile: updatedProfile,
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      // Profile has org_id, return as is
      console.log('Profile exists with org, returning:', existingProfile.id);
      return new Response(
        JSON.stringify({ 
          org: existingProfile.organizations,
          profile: {
            id: existingProfile.id,
            full_name: existingProfile.full_name,
            org_id: existingProfile.org_id,
            role: existingProfile.role,
            created_at: existingProfile.created_at
          }
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Profile doesn't exist - check if this is an invited employee first
    console.log('No profile found, checking for employee record:', user.id);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if an employee record exists with this email (properly escaped)
    const { data: employeeByEmail, error: employeeCheckError } = await supabaseAdmin
      .from('employees')
      .select('id, org_id, email, work_email, personal_email')
      .eq('email', user.email)
      .maybeSingle();

    let existingEmployee = employeeByEmail;

    // If not found by primary email, try work_email
    if (!existingEmployee && !employeeCheckError) {
      const { data: employeeByWorkEmail } = await supabaseAdmin
        .from('employees')
        .select('id, org_id, email, work_email, personal_email')
        .eq('work_email', user.email)
        .maybeSingle();
      existingEmployee = employeeByWorkEmail;
    }

    // If still not found, try personal_email
    if (!existingEmployee && !employeeCheckError) {
      const { data: employeeByPersonalEmail } = await supabaseAdmin
        .from('employees')
        .select('id, org_id, email, work_email, personal_email')
        .eq('personal_email', user.email)
        .maybeSingle();
      existingEmployee = employeeByPersonalEmail;
    }

    if (employeeCheckError) {
      console.error('Error checking employee:', employeeCheckError);
    }

    if (existingEmployee) {
      // Employee exists! Create profile in their organization
      console.log('Found existing employee, creating profile in org:', existingEmployee.org_id);

      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          org_id: existingEmployee.org_id,
          role: 'employee',
          full_name: user.email || 'User',
          email: user.email,
        })
        .select()
        .single();

      if (profileError || !newProfile) {
        console.error('Error creating employee profile:', profileError);
        throw new Error('Failed to create profile');
      }

      console.log('Created employee profile:', newProfile.id);

      // Link the profile to the employee record
      const { error: linkError } = await supabaseAdmin
        .from('employees')
        .update({ profile_id: user.id })
        .eq('id', existingEmployee.id);

      if (linkError) {
        console.error('Error linking profile to employee:', linkError);
      }

      // Fetch the organization
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', existingEmployee.org_id)
        .single();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
      }

      return new Response(
        JSON.stringify({ 
          org: org,
          profile: newProfile
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // No employee record found - create new organization for admin user
    console.log('No employee found, creating new org and admin profile for user:', user.id);

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
        email: user.email,
      })
      .select()
      .single();

    if (profileError || !newProfile) {
      console.error('Error creating profile:', profileError);
      throw new Error('Failed to create profile');
    }

    console.log('Created profile:', newProfile.id);

    return new Response(
      JSON.stringify({ 
        org: newOrg,
        profile: newProfile
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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
