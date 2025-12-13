-- Backfill employee_profile_id from employees.profile_id where missing
UPDATE chat_conversations cc
SET employee_profile_id = e.profile_id
FROM employees e
WHERE cc.employee_id = e.id
AND cc.employee_profile_id IS NULL
AND e.profile_id IS NOT NULL;

-- Create trigger function to sync employee_profile_id when employee.profile_id changes
CREATE OR REPLACE FUNCTION sync_conversation_employee_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_id IS DISTINCT FROM OLD.profile_id THEN
    UPDATE chat_conversations
    SET employee_profile_id = NEW.profile_id
    WHERE employee_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create trigger on employees table
CREATE TRIGGER sync_conversation_employee_profile_trigger
AFTER UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION sync_conversation_employee_profile();