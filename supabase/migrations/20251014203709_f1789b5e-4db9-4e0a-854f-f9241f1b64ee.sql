-- Create org_settings table
create table if not exists public.org_settings (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  employee_system_fields jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.org_settings enable row level security;

-- Allow users to read their org's settings
create policy "org_settings_read"
on public.org_settings
for select
using (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.org_id = org_settings.org_id
  )
);

-- Allow admins and HR to insert/update their org's settings
create policy "org_settings_write"
on public.org_settings
for all
using (
  exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.org_id = org_settings.org_id
      and me.role in ('admin', 'hr')
  )
);

-- Add trigger for updated_at
create trigger update_org_settings_updated_at
  before update on public.org_settings
  for each row
  execute function public.update_updated_at_column();