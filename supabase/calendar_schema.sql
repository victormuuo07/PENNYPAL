-- PennyPal — calendar feed tokens
-- Run in the Supabase SQL editor after crm_schema.sql. Safe to re-run.
--
-- One row per user holding an unguessable token. The token, not a login
-- session, is what protects the feed: Google/Apple/Outlook Calendar poll a
-- plain URL on a schedule with no way to send a password or session
-- cookie, so "possession of this exact link" has to be the credential —
-- the same model Todoist, Asana and most "subscribe by URL" calendar
-- exports use. Treat the URL itself as a secret; anyone with it can read
-- that person's task titles and due dates (nothing else). "Regenerate
-- link" invalidates the old URL immediately if it ever leaks.

create table if not exists public."CALENDAR_FEEDS" (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public."CALENDAR_FEEDS" enable row level security;
drop policy if exists "owners manage all calendar feeds" on public."CALENDAR_FEEDS";
create policy "owners manage all calendar feeds" on public."CALENDAR_FEEDS" for all
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists "user manages own calendar feed" on public."CALENDAR_FEEDS";
create policy "user manages own calendar feed" on public."CALENDAR_FEEDS" for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
