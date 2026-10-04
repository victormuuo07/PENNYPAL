-- PennyPal — invoice numbering fix + VAT/invoice reporting support
-- Run in the Supabase SQL editor after schema.sql. Safe to re-run.
--
-- Two problems this fixes:
--
-- 1. Invoice numbers were generated in the browser
--    (`INV-${Date.now()}-${counter}`), where `counter` resets to 0 every
--    time the page reloads. Two reps selling at the same minute, or one rep
--    with two tabs open, could easily produce the same invoice number —
--    not acceptable once invoices are being downloaded and handed to
--    customers. This replaces it with a Postgres sequence, which issues
--    each number exactly once even under concurrent inserts.
--
-- 2. INVOICES only recorded which sale it came from inside the `items`
--    jsonb blob (items[0].sale_id), which is unreliable to query or join
--    on. This adds a real, indexed `sale_id` column and backfills it from
--    existing rows.

alter table public."INVOICES" add column if not exists sale_id uuid references public."SALES"(id) on delete set null;

-- Backfill by JOINING to SALES, so only invoices whose sale still exists get
-- linked. An invoice whose sale was deleted earlier (e.g. directly in the
-- table editor) simply stays sale_id = NULL instead of violating the FK.
update public."INVOICES" i
set sale_id = s.id
from public."SALES" s
where i.sale_id is null
  and (i.items -> 0 ->> 'sale_id') = s.id::text;

create index if not exists invoices_sale_id_idx on public."INVOICES" (sale_id);
create index if not exists invoices_date_idx on public."INVOICES" (invoice_date);
create unique index if not exists invoices_number_idx on public."INVOICES" (invoice_number);

-- Monthly-reset, human-readable sequence: INV-202610-00001, INV-202610-00002, ...
-- One sequence total (not per-month) — the month prefix is just formatting,
-- nextval() itself always keeps counting up, so numbers never collide even
-- across a month boundary.
create sequence if not exists public.invoice_number_seq;
grant usage on sequence public.invoice_number_seq to authenticated;

create or replace function public.next_invoice_number()
returns text
language sql
as $$
  select 'INV-' || to_char(now() at time zone 'Africa/Nairobi', 'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text, 5, '0');
$$;

grant execute on function public.next_invoice_number() to authenticated;
