-- Create form templates table
create table form_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  name text not null,
  description text,
  fields jsonb not null default '[]',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  active boolean default true,
  updates_profile boolean default false,
  profile_field_mapping jsonb default '{}'
);

-- Enable RLS on form_templates
alter table form_templates enable row level security;

-- RLS policies for form_templates
create policy "ft_read" on form_templates
  for select
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = form_templates.org_id
    )
  );

create policy "ft_write" on form_templates
  for all
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = form_templates.org_id
        and me.role in ('admin', 'hr')
    )
  );

-- Create form requests table
create table form_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  form_template_id uuid references form_templates(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  requested_by uuid references profiles(id),
  requested_at timestamptz default now(),
  due_date timestamptz,
  status text not null default 'pending',
  completed_at timestamptz,
  chat_message_id uuid,
  reminder_sent boolean default false,
  reminder_sent_at timestamptz
);

-- Enable RLS on form_requests
alter table form_requests enable row level security;

-- RLS policies for form_requests
create policy "fr_read" on form_requests
  for select
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = form_requests.org_id
    )
    or
    exists (
      select 1 from employees e
      where e.id = form_requests.employee_id
        and e.profile_id = auth.uid()
    )
  );

create policy "fr_write" on form_requests
  for all
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = form_requests.org_id
        and me.role in ('admin', 'hr')
    )
  );

-- Create form responses table
create table form_responses (
  id uuid primary key default gen_random_uuid(),
  form_request_id uuid references form_requests(id) on delete cascade,
  employee_id uuid references employees(id),
  org_id uuid references organizations(id) not null,
  responses jsonb not null default '{}',
  submitted_at timestamptz default now(),
  ip_address text,
  user_agent text
);

-- Enable RLS on form_responses
alter table form_responses enable row level security;

-- RLS policies for form_responses
create policy "fresp_read" on form_responses
  for select
  using (
    exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = form_responses.org_id
        and me.role in ('admin', 'hr')
    )
    or
    employee_id in (
      select id from employees where profile_id = auth.uid()
    )
  );

create policy "fresp_write" on form_responses
  for insert
  with check (
    employee_id in (
      select id from employees where profile_id = auth.uid()
    )
  );

-- Create chat conversations table
create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) not null,
  hr_user_id uuid references profiles(id),
  employee_id uuid references employees(id),
  employee_profile_id uuid references profiles(id),
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  archived boolean default false
);

-- Enable RLS on chat_conversations
alter table chat_conversations enable row level security;

-- RLS policies for chat_conversations
create policy "chat_conv_read" on chat_conversations
  for select
  using (
    hr_user_id = auth.uid()
    or employee_profile_id = auth.uid()
    or exists (
      select 1 from employees e
      where e.id = chat_conversations.employee_id
        and e.profile_id = auth.uid()
    )
  );

create policy "chat_conv_write" on chat_conversations
  for all
  using (
    hr_user_id = auth.uid()
    or employee_profile_id = auth.uid()
    or exists (
      select 1 from profiles me
      where me.id = auth.uid()
        and me.org_id = chat_conversations.org_id
        and me.role in ('admin', 'hr')
    )
  );

-- Create chat messages table
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references chat_conversations(id) on delete cascade,
  org_id uuid references organizations(id) not null,
  sender_id uuid references profiles(id) not null,
  sender_type text not null,
  message_text text,
  message_type text not null default 'text',
  form_request_id uuid references form_requests(id),
  sent_at timestamptz default now(),
  read boolean default false,
  read_at timestamptz
);

-- Enable RLS on chat_messages
alter table chat_messages enable row level security;

-- RLS policies for chat_messages
create policy "chat_msg_read" on chat_messages
  for select
  using (
    exists (
      select 1 from chat_conversations cc
      where cc.id = chat_messages.conversation_id
        and (
          cc.hr_user_id = auth.uid()
          or cc.employee_profile_id = auth.uid()
          or exists (
            select 1 from employees e
            where e.id = cc.employee_id
              and e.profile_id = auth.uid()
          )
        )
    )
  );

create policy "chat_msg_write" on chat_messages
  for insert
  with check (
    exists (
      select 1 from chat_conversations cc
      where cc.id = chat_messages.conversation_id
        and (
          cc.hr_user_id = auth.uid()
          or cc.employee_profile_id = auth.uid()
          or exists (
            select 1 from employees e
            where e.id = cc.employee_id
              and e.profile_id = auth.uid()
          )
        )
    )
  );

-- Add trigger to update last_message_at
create or replace function update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update chat_conversations
  set last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger update_conversation_last_message
  after insert on chat_messages
  for each row
  execute function update_conversation_timestamp();

-- Add foreign key constraint after chat_messages is created
alter table form_requests
  add constraint form_requests_chat_message_id_fkey
  foreign key (chat_message_id)
  references chat_messages(id)
  on delete set null;