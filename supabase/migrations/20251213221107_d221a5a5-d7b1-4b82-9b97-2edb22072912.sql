-- Add indexes for chat performance optimization

-- Index for conversation filtering by hr_user_id
CREATE INDEX IF NOT EXISTS idx_chat_conversations_hr_user 
  ON chat_conversations(hr_user_id);

-- Index for conversation filtering by employee_profile_id
CREATE INDEX IF NOT EXISTS idx_chat_conversations_employee_profile 
  ON chat_conversations(employee_profile_id);

-- Composite index for archived + last_message_at ordering
CREATE INDEX IF NOT EXISTS idx_chat_conversations_archived_lastmsg 
  ON chat_conversations(archived, last_message_at DESC);

-- Index for message queries by conversation_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
  ON chat_messages(conversation_id);

-- Composite index for unread message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
  ON chat_messages(conversation_id, read, sender_id);