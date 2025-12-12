-- Fix search_path security vulnerability for SECURITY DEFINER functions

-- Fix prevent_sensitive_updates
CREATE OR REPLACE FUNCTION public.prevent_sensitive_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = OLD.profile_id THEN
     IF (NEW.job_title IS DISTINCT FROM OLD.job_title) OR
        (NEW.department IS DISTINCT FROM OLD.department) OR
        (NEW.manager_profile_id IS DISTINCT FROM OLD.manager_profile_id) OR
        (NEW.status IS DISTINCT FROM OLD.status) OR
        (NEW.start_date IS DISTINCT FROM OLD.start_date) THEN
          RAISE EXCEPTION 'Access Denied: You cannot update sensitive employment details (Title, Dept, Manager, etc). Please contact HR.';
     END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix process_form_response
CREATE OR REPLACE FUNCTION public.process_form_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template_id uuid;
  v_updates_profile boolean;
  v_field_key text;
  v_field_value jsonb;
BEGIN
  SELECT form_template_id INTO v_template_id FROM form_requests WHERE id = new.form_request_id;
  SELECT updates_profile INTO v_updates_profile FROM form_templates WHERE id = v_template_id;

  IF v_updates_profile THEN
    FOR v_field_key, v_field_value IN SELECT * FROM jsonb_each(new.responses)
    LOOP
      IF v_field_key IN ('phone_mobile', 'personal_email', 'address_line1', 'city', 'state', 'zip', 'emergency_name', 'emergency_phone') THEN
        EXECUTE format('UPDATE employees SET %I = $1 WHERE id = $2', v_field_key)
        USING v_field_value#>>'{}', new.employee_id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN new;
END;
$function$;

-- Fix start_workflow_run
CREATE OR REPLACE FUNCTION public.start_workflow_run(p_workflow_id uuid, p_employee_id uuid, p_starter_id uuid, p_org_id uuid, p_start_date timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_run_id uuid;
  v_step record;
  v_assigned_to uuid;
  v_employee_manager_id uuid;
BEGIN
  SELECT manager_profile_id INTO v_employee_manager_id
  FROM employees WHERE id = p_employee_id;

  INSERT INTO runs (workflow_id, employee_id, org_id, started_by, status, started_at)
  VALUES (p_workflow_id, p_employee_id, p_org_id, p_starter_id, 'running', p_start_date)
  RETURNING id INTO v_run_id;

  FOR v_step IN SELECT * FROM workflow_steps WHERE workflow_id = p_workflow_id ORDER BY ordinal ASC
  LOOP
    v_assigned_to := NULL;
    
    IF v_step.config->'assignment'->>'mode' = 'user' THEN
       v_assigned_to := (v_step.config->'assignment'->>'user_id')::uuid;
    ELSIF v_step.config->'assignment'->>'mode' = 'dynamic' AND v_step.config->'assignment'->>'strategy' = 'employee_manager' THEN
       v_assigned_to := v_employee_manager_id;
    ELSIF v_step.config->'assignment'->>'mode' = 'role' THEN
       SELECT id INTO v_assigned_to FROM profiles 
       WHERE org_id = p_org_id AND role = (v_step.config->'assignment'->>'role')::user_role 
       AND active = true LIMIT 1;
    END IF;

    INSERT INTO run_step_instances (run_id, workflow_step_id, org_id, ordinal, status, assigned_to, payload)
    VALUES (v_run_id, v_step.id, p_org_id, v_step.ordinal, 'pending', v_assigned_to, v_step.config);
  END LOOP;

  RETURN v_run_id;
END;
$function$;