-- PennyPal schema additions: roles + RLS
-- Run this against your existing Supabase project. It does NOT touch your
-- existing SALES / EXPENSES / DISTRIBUTION / SALES_PEOPLE / etc tables' data,
-- it only adds a profiles/roles layer and turns RLS on for scoped access.
-- Every "create policy" is preceded by "drop policy if exists" for the same
-- name, so the whole script is safe to run again after any future update —
-- re-running it won't error on "policy already exists" like it used to.

-- 1. Profile table linked to Supabase Auth users, carrying role + optional
--    link to a SALES_PEOPLE row (so a logged-in rep maps to their own sales)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'rep' check (role in ('owner', 'rep')),
  sales_person_id uuid references public."SALES_PEOPLE"(id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone logged in can read their own profile (needed to check their role)
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 2. Helper function: is the current user an owner?
-- NOTE: this must be defined BEFORE the policy below uses it. It's
-- SECURITY DEFINER + STABLE specifically so that policies on `profiles`
-- can call it without querying `profiles` again through RLS — a policy on
-- a table that re-queries that same table via a plain subquery (rather
-- than through a security-definer function) causes Postgres to re-apply
-- RLS recursively while evaluating itself.
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- Only owners can see/manage all profiles (for the "add sales rep" flow).
-- Uses is_owner() rather than a subquery on profiles directly, to avoid
-- the recursion problem described above.
drop policy if exists "owners manage all profiles" on public.profiles;
create policy "owners manage all profiles"
  on public.profiles for all
  using (public.is_owner());

-- 3. Helper function: current user's linked sales_person_id (if a rep)
create or replace function public.current_sales_person_id()
returns uuid
language sql
security definer
stable
as $$
  select sales_person_id from public.profiles where id = auth.uid();
$$;

-- 4. Turn on RLS for the core financial tables and scope reps to their own
--    records. Owners (you + Victoria) see everything. Adjust table/column
--    names here if your actual Supabase schema differs from the Streamlit
--    client's naming.

-- Link sales to the rep who made them. Nullable so existing rows (and
-- owner-entered sales with no rep) are unaffected.
alter table public."SALES" add column if not exists sales_person_id uuid
  references public."SALES_PEOPLE"(id);

-- Credit tracking: when Payment_Status = 'Credit', amount_paid tracks
-- partial payments against Total, due_date is when it's expected settled.
-- Both null/0 by default so cash sales are unaffected.
alter table public."SALES" add column if not exists amount_paid numeric default 0;
alter table public."SALES" add column if not exists due_date date;

alter table public."SALES" enable row level security;
drop policy if exists "owners see all sales" on public."SALES";
create policy "owners see all sales" on public."SALES" for select using (public.is_owner());
drop policy if exists "owners write sales" on public."SALES";
create policy "owners write sales" on public."SALES" for insert with check (public.is_owner());
drop policy if exists "owners update sales" on public."SALES";
create policy "owners update sales" on public."SALES" for update using (public.is_owner());

-- Reps: this is the actual point of giving them a login. Without these,
-- a rep can sign in but has no way to record a sale in the field.
drop policy if exists "reps see own sales" on public."SALES";
create policy "reps see own sales" on public."SALES" for select
  using (sales_person_id = public.current_sales_person_id());
drop policy if exists "reps write own sales" on public."SALES";
create policy "reps write own sales" on public."SALES" for insert
  with check (sales_person_id = public.current_sales_person_id());

alter table public."EXPENSES" enable row level security;
drop policy if exists "owners see all expenses" on public."EXPENSES";
create policy "owners see all expenses" on public."EXPENSES" for select using (public.is_owner());
drop policy if exists "owners write expenses" on public."EXPENSES";
create policy "owners write expenses" on public."EXPENSES" for insert with check (public.is_owner());

alter table public."DISTRIBUTION" enable row level security;
drop policy if exists "owners see all distribution" on public."DISTRIBUTION";
create policy "owners see all distribution" on public."DISTRIBUTION" for select using (public.is_owner());
drop policy if exists "reps see own distribution" on public."DISTRIBUTION";
create policy "reps see own distribution" on public."DISTRIBUTION" for select
  using (sales_person_id = public.current_sales_person_id());
drop policy if exists "reps write own distribution" on public."DISTRIBUTION";
create policy "reps write own distribution" on public."DISTRIBUTION" for insert
  with check (sales_person_id = public.current_sales_person_id());

-- NOTE: Inventory (raw materials, batches, finished goods), assets, funding,
-- and commissions tables should stay owner-only (no rep policy) since reps
-- shouldn't see company-wide stock, funding, or asset data. We'll enable RLS
-- on those as we build those modules, using the same public.is_owner() check.

-- 4a. SALES_PEOPLE: per the live schema audit this table currently has RLS
-- enabled with zero policies (so it's fully locked, even to owners, until
-- this runs). This is your rep roster (names, phones, commission rates) —
-- owners manage it, a rep can read only their own row.
alter table public."SALES_PEOPLE" enable row level security;
drop policy if exists "owners manage sales people" on public."SALES_PEOPLE";
create policy "owners manage sales people" on public."SALES_PEOPLE" for all using (public.is_owner());
drop policy if exists "reps read own record" on public."SALES_PEOPLE";
create policy "reps read own record" on public."SALES_PEOPLE" for select
  using (id = public.current_sales_person_id());

-- 5. Hotels & refills: in the original Streamlit app any logged-in user
-- could add a hotel or log a refill for any hotel (no rep-scoping existed).
-- Keeping that behavior: any authenticated user (owner or rep) can read and
-- write here, rather than inventing a restriction that wasn't there before.
alter table public."HOTELS" enable row level security;
drop policy if exists "authenticated read hotels" on public."HOTELS";
create policy "authenticated read hotels" on public."HOTELS" for select
  using (auth.role() = 'authenticated');
drop policy if exists "authenticated write hotels" on public."HOTELS";
create policy "authenticated write hotels" on public."HOTELS" for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update hotels" on public."HOTELS";
create policy "authenticated update hotels" on public."HOTELS" for update
  using (auth.role() = 'authenticated');

alter table public."HOTEL_REFILLS" enable row level security;
drop policy if exists "authenticated read refills" on public."HOTEL_REFILLS";
create policy "authenticated read refills" on public."HOTEL_REFILLS" for select
  using (auth.role() = 'authenticated');
drop policy if exists "authenticated write refills" on public."HOTEL_REFILLS";
create policy "authenticated write refills" on public."HOTEL_REFILLS" for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update refills" on public."HOTEL_REFILLS";
create policy "authenticated update refills" on public."HOTEL_REFILLS" for update
  using (auth.role() = 'authenticated');

-- 5a. Mama Mbogas & purchases — same open-to-any-authenticated-user
-- pattern as Hotels/Refills.
alter table public."MAMA_MBOGAS" enable row level security;
drop policy if exists "authenticated read mamas" on public."MAMA_MBOGAS";
create policy "authenticated read mamas" on public."MAMA_MBOGAS" for select
  using (auth.role() = 'authenticated');
drop policy if exists "authenticated write mamas" on public."MAMA_MBOGAS";
create policy "authenticated write mamas" on public."MAMA_MBOGAS" for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update mamas" on public."MAMA_MBOGAS";
create policy "authenticated update mamas" on public."MAMA_MBOGAS" for update
  using (auth.role() = 'authenticated');

alter table public."MAMA_MBOGAS_PURCHASES" enable row level security;
drop policy if exists "authenticated read mama purchases" on public."MAMA_MBOGAS_PURCHASES";
create policy "authenticated read mama purchases" on public."MAMA_MBOGAS_PURCHASES" for select
  using (auth.role() = 'authenticated');
drop policy if exists "authenticated write mama purchases" on public."MAMA_MBOGAS_PURCHASES";
create policy "authenticated write mama purchases" on public."MAMA_MBOGAS_PURCHASES" for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update mama purchases" on public."MAMA_MBOGAS_PURCHASES";
create policy "authenticated update mama purchases" on public."MAMA_MBOGAS_PURCHASES" for update
  using (auth.role() = 'authenticated');

-- 6. Inventory & Production — owner-only (reps don't see company stock levels)
alter table public."RAW_MATERIALS_INVENTORY" enable row level security;
drop policy if exists "owners manage raw materials" on public."RAW_MATERIALS_INVENTORY";
create policy "owners manage raw materials" on public."RAW_MATERIALS_INVENTORY" for all using (public.is_owner());

alter table public."STOCK_RESTOCK" enable row level security;
drop policy if exists "owners manage stock restock" on public."STOCK_RESTOCK";
create policy "owners manage stock restock" on public."STOCK_RESTOCK" for all using (public.is_owner());

alter table public."INVENTORY_BALANCE" enable row level security;
drop policy if exists "owners manage inventory balance" on public."INVENTORY_BALANCE";
create policy "owners manage inventory balance" on public."INVENTORY_BALANCE" for all using (public.is_owner());

alter table public."BATCHES" enable row level security;
drop policy if exists "owners manage batches" on public."BATCHES";
create policy "owners manage batches" on public."BATCHES" for all using (public.is_owner());

alter table public."MATERIAL_USAGE" enable row level security;
drop policy if exists "owners manage material usage" on public."MATERIAL_USAGE";
create policy "owners manage material usage" on public."MATERIAL_USAGE" for all using (public.is_owner());

alter table public."PRODUCTION_OUTPUT" enable row level security;
drop policy if exists "owners manage production output" on public."PRODUCTION_OUTPUT";
create policy "owners manage production output" on public."PRODUCTION_OUTPUT" for all using (public.is_owner());

alter table public."FINISHED_GOODS_INVENTORY" enable row level security;
drop policy if exists "owners manage finished goods" on public."FINISHED_GOODS_INVENTORY";
create policy "owners manage finished goods" on public."FINISHED_GOODS_INVENTORY" for all using (public.is_owner());

-- 7. Commissions — owners manage rates and mark-paid; a rep can read their
-- own commission records (not everyone else's) so they can see what
-- they're owed.
alter table public."COMMISSION_RATES" enable row level security;
drop policy if exists "owners manage commission rates" on public."COMMISSION_RATES";
create policy "owners manage commission rates" on public."COMMISSION_RATES" for all using (public.is_owner());
drop policy if exists "authenticated read commission rates" on public."COMMISSION_RATES";
create policy "authenticated read commission rates" on public."COMMISSION_RATES" for select
  using (auth.role() = 'authenticated');

alter table public."SALES_COMMISSIONS" enable row level security;
drop policy if exists "owners manage all commissions" on public."SALES_COMMISSIONS";
create policy "owners manage all commissions" on public."SALES_COMMISSIONS" for all using (public.is_owner());
drop policy if exists "reps read own commissions" on public."SALES_COMMISSIONS";
create policy "reps read own commissions" on public."SALES_COMMISSIONS" for select
  using (sales_person_id = public.current_sales_person_id());

-- 8. Assets & Funding — owner-only, financial records reps shouldn't see
alter table public."ASSETS" enable row level security;
drop policy if exists "owners manage assets" on public."ASSETS";
create policy "owners manage assets" on public."ASSETS" for all using (public.is_owner());

alter table public."FUNDING" enable row level security;
drop policy if exists "owners manage funding" on public."FUNDING";
create policy "owners manage funding" on public."FUNDING" for all using (public.is_owner());

-- 8a. Cost settings (raw material/packaging costs) — feeds the Product
-- Profitability calculator. Owner-only, single-row-ish config table.
alter table public."COST_SETTINGS" enable row level security;
drop policy if exists "owners manage cost settings" on public."COST_SETTINGS";
create policy "owners manage cost settings" on public."COST_SETTINGS" for all using (public.is_owner());

-- 9. Customer messaging — owner-only (this is company-wide customer/comms
-- data, not something reps need direct access to for now)
alter table public."CUSTOMER_CONTACTS" enable row level security;
drop policy if exists "owners manage customer contacts" on public."CUSTOMER_CONTACTS";
create policy "owners manage customer contacts" on public."CUSTOMER_CONTACTS" for all using (public.is_owner());

alter table public."AUTOMATED_MESSAGES" enable row level security;
drop policy if exists "owners manage automated messages" on public."AUTOMATED_MESSAGES";
create policy "owners manage automated messages" on public."AUTOMATED_MESSAGES" for all using (public.is_owner());

alter table public."MESSAGE_HISTORY" enable row level security;
drop policy if exists "owners manage message history" on public."MESSAGE_HISTORY";
create policy "owners manage message history" on public."MESSAGE_HISTORY" for all using (public.is_owner());

-- 10. Invoices: generated alongside every sale (invoice-style entry).
-- Owners can read/manage everything. Reps can create an invoice (needed
-- when they record a sale) but there's no rep-facing invoice list yet, so
-- we don't need row-level read-scoping here — keep it simple rather than
-- matching on notes text, which would be fragile.
alter table public."INVOICES" enable row level security;
drop policy if exists "owners manage all invoices" on public."INVOICES";
create policy "owners manage all invoices" on public."INVOICES" for all using (public.is_owner());
drop policy if exists "authenticated create invoices" on public."INVOICES";
create policy "authenticated create invoices" on public."INVOICES" for insert
  with check (auth.role() = 'authenticated');

-- 6a. Atomic restock: replaces record_restock_with_balance() from the
-- Python client. Does STOCK_RESTOCK insert + RAW_MATERIALS_INVENTORY
-- upsert + INVENTORY_BALANCE insert in one transaction instead of three
-- separate round-trips, so a failure partway through can't leave stock
-- numbers inconsistent with the restock log.
create or replace function public.record_material_restock(
  p_material_name text,
  p_quantity_kg numeric,
  p_cost_per_kg numeric,
  p_supplier text,
  p_restock_date date,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_restock_id uuid := gen_random_uuid();
  v_current_balance numeric;
begin
  if not public.is_owner() then
    raise exception 'Only owners can record restocks';
  end if;

  insert into public."STOCK_RESTOCK" (id, material_name, quantity_kg, cost_per_kg, total_cost, supplier, restock_date, remaining_kg, notes)
  values (v_restock_id, p_material_name, p_quantity_kg, p_cost_per_kg, p_quantity_kg * p_cost_per_kg, p_supplier, p_restock_date, p_quantity_kg, p_notes);

  if exists (select 1 from public."RAW_MATERIALS_INVENTORY" where material_name = p_material_name) then
    update public."RAW_MATERIALS_INVENTORY"
      set total_purchased_kg = coalesce(total_purchased_kg, 0) + p_quantity_kg,
          current_stock_kg = coalesce(current_stock_kg, 0) + p_quantity_kg,
          last_restock_date = p_restock_date
      where material_name = p_material_name;
  else
    insert into public."RAW_MATERIALS_INVENTORY" (material_name, total_purchased_kg, current_stock_kg, unit_cost, reorder_level, last_restock_date)
    values (p_material_name, p_quantity_kg, p_quantity_kg, p_cost_per_kg, 10, p_restock_date);
  end if;

  select coalesce(current_stock_kg, 0) into v_current_balance
    from public."RAW_MATERIALS_INVENTORY" where material_name = p_material_name;

  insert into public."INVENTORY_BALANCE" (id, material_name, transaction_date, transaction_type, quantity_kg, running_balance_kg, reference_id)
  values (gen_random_uuid(), p_material_name, p_restock_date, 'RESTOCK', p_quantity_kg, v_current_balance, v_restock_id::text);

  return v_restock_id;
end;
$$;

-- 6b. Atomic production batch: replaces the save_batch() + 6x
-- record_material_usage_with_balance() + 4x save_production_output() +
-- update_finished_goods_production() sequence from Streamlit. Same recipe
-- ratios (Salt 50%, African Birds Eye 30%, Cayenne 15%, Onion 2%,
-- Garlic 2%, Paprika 1%), same FIFO deduction from STOCK_RESTOCK, but as
-- one transaction: either the whole batch is recorded correctly, or
-- nothing is (the Python version could partially fail — e.g. usage
-- recorded for some materials but not others — and leave stock numbers
-- wrong with no rollback).
create or replace function public.create_production_batch(
  p_batch_number text,
  p_production_date date,
  p_total_kg numeric,
  p_sachet_5_qty int default 0,
  p_sachet_30_qty int default 0,
  p_bottle_100g_qty int default 0,
  p_refill_100g_qty int default 0,
  p_notes text default ''
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_batch_id uuid := gen_random_uuid();
  v_materials text[] := array['Salt','African Birds Eye','Cayenne Pepper','Onion Powder','Garlic Powder','Paprika'];
  v_ratios numeric[] := array[0.50, 0.30, 0.15, 0.02, 0.02, 0.01];
  v_needed numeric;
  v_available numeric;
  v_remaining_to_use numeric;
  v_restock record;
  v_use_from_this numeric;
  i int;
  v_total_units int := p_sachet_5_qty + p_sachet_30_qty + p_bottle_100g_qty + p_refill_100g_qty;
begin
  if not public.is_owner() then
    raise exception 'Only owners can record production batches';
  end if;

  if v_total_units = 0 then
    raise exception 'Batch must produce at least one finished good';
  end if;

  -- 1. Check sufficiency for every material BEFORE deducting anything
  for i in 1..array_length(v_materials, 1) loop
    v_needed := p_total_kg * v_ratios[i];
    select coalesce(current_stock_kg, 0) into v_available
      from public."RAW_MATERIALS_INVENTORY" where material_name = v_materials[i];
    if coalesce(v_available, 0) < v_needed then
      raise exception 'Insufficient %: need %kg, have %kg', v_materials[i], round(v_needed, 2), round(coalesce(v_available, 0), 2);
    end if;
  end loop;

  -- 2. Insert the batch record
  insert into public."BATCHES" (
    id, batch_number, production_date, total_kg_produced,
    salt_kg, african_birds_eye_kg, cayenne_kg, onion_powder_kg, garlic_powder_kg, paprika_kg,
    status, notes
  ) values (
    v_batch_id, p_batch_number, p_production_date, p_total_kg,
    p_total_kg * 0.50, p_total_kg * 0.30, p_total_kg * 0.15, p_total_kg * 0.02, p_total_kg * 0.02, p_total_kg * 0.01,
    'Completed', p_notes
  );

  -- 3. FIFO-deduct each material from STOCK_RESTOCK, log MATERIAL_USAGE + INVENTORY_BALANCE
  for i in 1..array_length(v_materials, 1) loop
    v_needed := p_total_kg * v_ratios[i];
    v_remaining_to_use := v_needed;

    for v_restock in
      select id, remaining_kg from public."STOCK_RESTOCK"
        where material_name = v_materials[i] and remaining_kg > 0
        order by restock_date asc
    loop
      exit when v_remaining_to_use <= 0;
      v_use_from_this := least(v_remaining_to_use, v_restock.remaining_kg);
      update public."STOCK_RESTOCK" set remaining_kg = remaining_kg - v_use_from_this where id = v_restock.id;
      v_remaining_to_use := v_remaining_to_use - v_use_from_this;
    end loop;

    update public."RAW_MATERIALS_INVENTORY"
      set current_stock_kg = coalesce(current_stock_kg, 0) - v_needed,
          total_used_kg = coalesce(total_used_kg, 0) + v_needed
      where material_name = v_materials[i];

    insert into public."MATERIAL_USAGE" (id, batch_id, material_name, quantity_used_kg, cost_per_kg, total_cost, usage_date)
    values (gen_random_uuid(), v_batch_id, v_materials[i], v_needed,
      coalesce((select unit_cost from public."RAW_MATERIALS_INVENTORY" where material_name = v_materials[i]), 0),
      v_needed * coalesce((select unit_cost from public."RAW_MATERIALS_INVENTORY" where material_name = v_materials[i]), 0),
      p_production_date);

    insert into public."INVENTORY_BALANCE" (id, material_name, transaction_date, transaction_type, quantity_kg, running_balance_kg, reference_id)
    values (gen_random_uuid(), v_materials[i], p_production_date, 'USAGE', -v_needed,
      (select coalesce(current_stock_kg, 0) from public."RAW_MATERIALS_INVENTORY" where material_name = v_materials[i]),
      v_batch_id::text);
  end loop;

  -- 4. Record finished goods output + update FINISHED_GOODS_INVENTORY
  if p_sachet_5_qty > 0 then
    insert into public."PRODUCTION_OUTPUT" (id, batch_id, product_type, quantity_produced, unit_price)
      values (gen_random_uuid(), v_batch_id, 'Sachet 5', p_sachet_5_qty, 5);
    perform public.upsert_finished_goods('Sachet 5', p_sachet_5_qty, 5, 500);
  end if;
  if p_sachet_30_qty > 0 then
    insert into public."PRODUCTION_OUTPUT" (id, batch_id, product_type, quantity_produced, unit_price)
      values (gen_random_uuid(), v_batch_id, 'Sachet 30', p_sachet_30_qty, 30);
    perform public.upsert_finished_goods('Sachet 30', p_sachet_30_qty, 30, 200);
  end if;
  if p_bottle_100g_qty > 0 then
    insert into public."PRODUCTION_OUTPUT" (id, batch_id, product_type, quantity_produced, unit_price)
      values (gen_random_uuid(), v_batch_id, 'Bottle 100g', p_bottle_100g_qty, 150);
    perform public.upsert_finished_goods('Bottle 100g', p_bottle_100g_qty, 150, 100);
  end if;
  if p_refill_100g_qty > 0 then
    insert into public."PRODUCTION_OUTPUT" (id, batch_id, product_type, quantity_produced, unit_price)
      values (gen_random_uuid(), v_batch_id, 'Refill 100g', p_refill_100g_qty, 120);
    perform public.upsert_finished_goods('Refill 100g', p_refill_100g_qty, 120, 50);
  end if;

  return v_batch_id;
end;
$$;

-- Small helper used by create_production_batch above
create or replace function public.upsert_finished_goods(
  p_product_type text, p_qty int, p_unit_price numeric, p_reorder_level int
)
returns void
language plpgsql
security definer
as $$
begin
  if exists (select 1 from public."FINISHED_GOODS_INVENTORY" where product_type = p_product_type) then
    update public."FINISHED_GOODS_INVENTORY"
      set current_stock = coalesce(current_stock, 0) + p_qty,
          total_produced = coalesce(total_produced, 0) + p_qty,
          last_updated = now()
      where product_type = p_product_type;
  else
    insert into public."FINISHED_GOODS_INVENTORY" (product_type, current_stock, total_produced, total_sold, unit_price, reorder_level)
    values (p_product_type, p_qty, p_qty, 0, p_unit_price, p_reorder_level);
  end if;
end;
$$;
