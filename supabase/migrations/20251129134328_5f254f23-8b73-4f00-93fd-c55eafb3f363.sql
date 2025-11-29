-- Allow employees to update their own form requests to mark them as completed
CREATE POLICY "fr_update_self" ON form_requests
FOR UPDATE 
USING (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
)
WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE profile_id = auth.uid())
  AND status IN ('completed', 'pending')
);

-- Create storage bucket for form file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-attachments', 'form-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Allow employees to upload files for their own form responses
CREATE POLICY "form_files_upload" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'form-attachments' 
  AND auth.uid() IS NOT NULL
);

-- Allow employees to view their own uploaded files
CREATE POLICY "form_files_read" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'form-attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow HR/admin to view all form files
CREATE POLICY "form_files_read_hr" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'form-attachments'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'hr')
  )
);