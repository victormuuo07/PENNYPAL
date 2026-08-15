# PennyPal — SpiseUp Operations App

Next.js + Supabase rebuild of the old Streamlit app, with role-based auth
(owner vs sales rep) built in from the start.

## What's working now

- Login (Supabase Auth, email/password)
- Role-aware sidebar (reps see fewer sections than owners)
- Dashboard: total balance, sales, expenses, 6-month trend chart
- Sales: list + add (reps see/add only their own, via `sales_person_id`)
- Expenses: list + add
- Distribution & Hotels: add hotels, log refills, performance/territory
  scoring ported directly from the old `get_hotel_territory_analysis()`
  Python logic (same revenue/frequency/recency scoring, same tier
  thresholds) — open to any authenticated user, matching how the old app
  worked (no rep-scoping on hotels/refills); hotels and Mama Mbogas are
  both editable in-place (✏️ Edit on each row), not just add-only
- Mama Mboga & shops: same pattern as Hotels — add shop, record purchase,
  performance table with Star/Steady/At Risk/Dormant tiers
- Sales ↔ Distribution linking: selling to a tracked Hotel/Restaurant or
  Shop/Mama Mboga lets you pick the actual tracked record from a dropdown,
  and one sale entry automatically logs the matching `HOTEL_REFILLS` or
  `MAMA_MBOGAS_PURCHASES` row too — no need to enter the same transaction
  twice
- Inventory & Production: raw materials + restock, production batches with
  live material-sufficiency checks, batch history, finished goods stock —
  restock and batch creation are atomic Postgres functions
  (`record_material_restock`, `create_production_batch`) rather than
  several separate client calls, so a failure partway through can't leave
  stock numbers inconsistent
- Commissions: rates, per-sale commission tracking, mark-paid (owner);
  reps see their own commission history
- Assets & Funding: asset register + funding sources, owner-only
- Customer Messaging: contacts, automated message rules, message history,
  and a working send route (`/api/messaging/send`) — needs your Africa's
  Talking key set server-side in Vercel to actually deliver (see below)
- RLS policies covering every table above
- Team page (owner-only): create accounts directly in-app — no public
  signup, and role (Owner vs Sales Rep) is explicitly chosen when creating
  each account via `/api/admin/create-user`
- Analytics page (owner-only): Business Health Score (weighted gauge from
  profit margin, sales growth, cash runway, cash balance), sales trend with
  day/week/month/quarter toggle, Sales Deep-Dive (cumulative chart,
  best/worst day of week, week-over-week, auto-insights), Sales Rep and
  Hotel/Shop leaderboards, Product Profitability calculator (editable cost
  config saved to `COST_SETTINGS`, per-product margin using the same
  ingredient+packaging cost formula as the old Streamlit Profit
  Calculator), expense category breakdown + monthly trend + auto-generated
  spending insights, hotel/Mama Mboga refill frequency and top performers,
  batch production frequency and finished-goods mix
- Branded loading screen shown while the app checks who's logged in

## Still on the roadmap

- **Real eTIMS submission** — sales now generate a structured `INVOICES`
  record (subtotal/VAT/total, matches KRA's shape) but nothing is actually
  submitted to eTIMS yet. That needs your real KRA/eTIMS device credentials
  before any submission code can be written and tested.
- **Generic Distribution-table entries** — `DISTRIBUTION` (with
  `distributor_type`, `quantity_distributed`, etc.) has RLS but no form yet;
  only Hotel Refills are wired up so far
- Actually scheduling automated messages (needs Vercel Cron)
- Connecting Credit Tracker overdue balances to automatic SMS reminders —
  the Credit Tracker and Messaging both exist now, just not wired together
- Deeper expense category breakdown/trend charts
- AI/ML: spending predictions, forecasting

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project URL, **anon** key, and **service_role** key (all three from
   Supabase → Project Settings → API). The service role key powers the
   Team page's account creation and must stay server-side only — never
   prefix it with `NEXT_PUBLIC_`.
3. Run `supabase/schema.sql` against your Supabase project (SQL Editor, or
   `supabase db push` if you use the CLI). This adds the `profiles` table,
   role logic, and turns on RLS for every table listed above. Safe to
   re-run after any future update — every policy is dropped and recreated
   rather than erroring on "already exists".
4. Create your own owner account **once**, manually, since the Team page
   itself needs an owner logged in to use it: create a user in Supabase
   Auth, then run
   ```sql
   insert into public.profiles (id, full_name, role)
   values ('<your-auth-user-uuid>', 'Victor', 'owner');
   ```
5. `npm run dev`, log in with that account, and go to the **Team** page in
   the sidebar (owner-only) — from here on, create every other account
   (yourself as a second owner, Victoria, sales reps) through that form
   instead of touching SQL. Picking "Owner" or "Sales Rep" there is what
   actually differentiates the two — nothing about it is automatic.

Deploy to Vercel: connect the GitHub repo, add all five env vars (the two
`NEXT_PUBLIC_` Supabase ones, `SUPABASE_SERVICE_ROLE_KEY`, and the two
Africa's Talking ones) in Vercel's project settings, deploy.

Every module from the roadmap is now built (Dashboard, Sales, Expenses,
Distribution, Inventory & Production, Commissions, Assets & Funding,
Customer Messaging). What's left is listed in "Still on the roadmap" above.

Each module follows the same pattern already established: a server component
page that queries Supabase, a client "Add" form component, and a table
component. Bring me back to build the next one whenever you're ready.
