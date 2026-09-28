-- PennyPal — Quality Control & HACCP module
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql (it relies on
-- public.is_owner()). Safe to re-run: every policy/trigger is dropped first.
--
-- Design: one table for every HACCP record type (cleaning, raw material QC,
-- in-process QC, final QC, complaints, hygiene, pest control ...). Each
-- record type has different columns, so the type-specific fields live in
-- `data` (jsonb) while everything the app filters/reports on (type, date,
-- batch, flagged, open) is a real indexed column. Adding a new QC check
-- later needs NO migration — only a new entry in lib/qc/config.ts.

create table if not exists public."QC_RECORDS" (
  id              uuid primary key default gen_random_uuid(),
  record_type     text not null check (record_type ~ '^[a-z_]+$'),
  record_date     date not null,
  batch_number    text,
  data            jsonb not null default '{}'::jsonb,
  -- NIL entry = "nothing happened this period" (no complaints, no pests...).
  -- Auditors (KEBS) want proof the log is active, so these are real rows.
  is_nil          boolean not null default false,
  -- Set by the app when a check breaches a limit / fails / finds an issue.
  is_flagged      boolean not null default false,
  flag_reason     text,
  -- Closable records (complaints, non-conformances): true until closed.
  is_open         boolean not null default false,
  entered_by      uuid default auth.uid() references auth.users(id) on delete set null,
  entered_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists qc_records_type_date_idx on public."QC_RECORDS" (record_type, record_date desc);
create index if not exists qc_records_date_idx      on public."QC_RECORDS" (record_date);
create index if not exists qc_records_batch_idx     on public."QC_RECORDS" (batch_number) where batch_number is not null;
create index if not exists qc_records_open_idx      on public."QC_RECORDS" (record_type) where is_open;

create or replace function public.qc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists qc_records_touch on public."QC_RECORDS";
create trigger qc_records_touch
  before update on public."QC_RECORDS"
  for each row execute function public.qc_touch_updated_at();

alter table public."QC_RECORDS" enable row level security;
drop policy if exists "owners manage qc records" on public."QC_RECORDS";
create policy "owners manage qc records" on public."QC_RECORDS"
  for all using (public.is_owner()) with check (public.is_owner());

-- Supervisor month-end review. HACCP verification means a supervisor
-- reviews each log; this records who signed off which log for which month
-- and prints on the monthly report.
create table if not exists public."QC_REVIEWS" (
  id             uuid primary key default gen_random_uuid(),
  review_month   date not null check (extract(day from review_month) = 1),
  record_type    text not null check (record_type ~ '^[a-z_]+$'),
  reviewed_by    text not null,
  reviewed_by_id uuid default auth.uid() references auth.users(id) on delete set null,
  reviewed_at    timestamptz not null default now(),
  notes          text,
  unique (review_month, record_type)
);

alter table public."QC_REVIEWS" enable row level security;
drop policy if exists "owners manage qc reviews" on public."QC_REVIEWS";
create policy "owners manage qc reviews" on public."QC_REVIEWS"
  for all using (public.is_owner()) with check (public.is_owner());
