-- PennyPal — CRM foundation: activity log + tasks/reminders
-- Run in the Supabase SQL editor after schema.sql (needs public.is_owner()).
-- Safe to re-run.
--
-- Two tables:
--   ACTIVITIES — a timestamped log of calls/visits/notes against a hotel,
--                mama mboga, contact, or B2C customer. Replaces the single
--                overwritable "notes" field on CUSTOMER_CONTACTS with a
--                real history nobody can accidentally erase.
--   TASKS      — "call Hotel X on Thursday" style reminders, assignable to
--                a rep, with a due date. This is the piece that turns an
--                alert (Silent Hotels, B2C customer list, QC due-items)
--                into something with an owner and a deadline.
--
-- entity_id is text rather than uuid because it has to point at four
-- different kinds of thing: a HOTELS.id, a MAMA_MBOGAS.id, a
-- CUSTOMER_CONTACTS.id — all uuids — OR a B2C customer key like
-- "p:0712345678" (see lib/customers.ts), which isn't a table row at all.
-- entity_label is a snapshot of the name at logging time, so the activity
-- feed and task list render without a join back to four different tables.

create table if not exists public."ACTIVITIES" (
  id              uuid primary key default gen_random_uuid(),
  entity_type     text not null check (entity_type in ('hotel', 'mama', 'contact', 'b2c')),
  entity_id       text not null,
  entity_label    text not null,
  activity_type   text not null check (activity_type in ('call', 'visit', 'sms', 'whatsapp', 'email', 'note')),
  notes           text,
  follow_up_date  date,
  logged_by       uuid default auth.uid() references auth.users(id) on delete set null,
  logged_by_name  text,
  created_at      timestamptz not null default now()
);

create index if not exists activities_entity_idx on public."ACTIVITIES" (entity_type, entity_id, created_at desc);
create index if not exists activities_followup_idx on public."ACTIVITIES" (follow_up_date) where follow_up_date is not null;

-- Same reasoning as Hotels/Mama Mbogas (see schema.sql §5): this is
-- day-to-day fieldwork any rep does, not sensitive financial data, so any
-- authenticated user can log and read activities rather than gating it
-- behind is_owner().
alter table public."ACTIVITIES" enable row level security;
drop policy if exists "authenticated read activities" on public."ACTIVITIES";
create policy "authenticated read activities" on public."ACTIVITIES" for select
  using (auth.role() = 'authenticated');
drop policy if exists "authenticated write activities" on public."ACTIVITIES";
create policy "authenticated write activities" on public."ACTIVITIES" for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update own activities" on public."ACTIVITIES";
create policy "authenticated update own activities" on public."ACTIVITIES" for update
  using (public.is_owner() or logged_by = auth.uid());
drop policy if exists "authenticated delete own activities" on public."ACTIVITIES";
create policy "authenticated delete own activities" on public."ACTIVITIES" for delete
  using (public.is_owner() or logged_by = auth.uid());

create table if not exists public."TASKS" (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  notes             text,
  due_date          date,
  status            text not null default 'open' check (status in ('open', 'done')),
  priority          text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  entity_type       text check (entity_type in ('hotel', 'mama', 'contact', 'b2c', 'other')),
  entity_id         text,
  entity_label      text,
  assigned_to       uuid references auth.users(id) on delete set null,
  assigned_to_name  text,
  created_by        uuid default auth.uid() references auth.users(id) on delete set null,
  created_by_name   text,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tasks_assigned_idx on public."TASKS" (assigned_to, status, due_date);
create index if not exists tasks_due_idx on public."TASKS" (due_date) where status = 'open';

create or replace function public.tasks_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'done' and old.status = 'open' then
    new.completed_at = now();
  elsif new.status = 'open' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_touch on public."TASKS";
create trigger tasks_touch
  before update on public."TASKS"
  for each row execute function public.tasks_touch_updated_at();

-- Owners manage every task. A rep sees and can act on a task if they
-- created it or it's assigned to them — same "own records" shape as
-- SALES/DISTRIBUTION/SALES_COMMISSIONS elsewhere in schema.sql.
alter table public."TASKS" enable row level security;
drop policy if exists "owners manage all tasks" on public."TASKS";
create policy "owners manage all tasks" on public."TASKS" for all
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists "reps read own tasks" on public."TASKS";
create policy "reps read own tasks" on public."TASKS" for select
  using (assigned_to = auth.uid() or created_by = auth.uid());
drop policy if exists "reps create tasks" on public."TASKS";
create policy "reps create tasks" on public."TASKS" for insert
  with check (created_by = auth.uid());
drop policy if exists "reps update own tasks" on public."TASKS";
create policy "reps update own tasks" on public."TASKS" for update
  using (assigned_to = auth.uid() or created_by = auth.uid());
drop policy if exists "reps delete own created tasks" on public."TASKS";
create policy "reps delete own created tasks" on public."TASKS" for delete
  using (created_by = auth.uid());
