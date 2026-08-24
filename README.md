# PennyPal — Sales Operations & Distribution Management Platform

A full-stack operations platform built for **Betarlux Hub**, a food manufacturing company producing SpiseUp (a chili-based spicy salt seasoning) in Kenya. PennyPal replaced manual, paper-based tracking with a real-time system for sales, inventory, distribution, and customer communication — currently in production use.

## The Problem

Betarlux Hub sells through two channels — hotels (B2B) and Mama Mbogas/informal retailers (B2C-adjacent) — across multiple territories. Tracking refill frequency, inventory, commissions, and customer follow-up manually didn't scale. The business needed a single system that could:

- Track sales across channels with rep-level attribution
- Flag hotels/retailers going "silent" before they churned
- Automate restocking reminders via SMS (many customers don't use apps or email)
- Give ownership a real-time view of business health, not a monthly spreadsheet reconciliation

## What It Does

**Core modules:**
- **Dashboard** — Business Health Score gauge, sales trends, bottleneck detection
- **Sales & Distribution** — Invoice-style entry linking a single sale to both hotel refills and Mama Mboga purchases, with salesperson attribution
- **Inventory & Production** — Batch tracking with product-level breakdown
- **Commissions** — Automated calculation tied to sales attribution
- **Customer Messaging** — SMS-based restocking automation via Africa's Talking, including credit tracking and "gone silent" alerts
- **Analytics** — Deep-dive charts across every table: B2C vs B2B split, sales rep and hotel leaderboards, product profitability calculator, expense insights
- **Territory Analysis** — Hotel performance scoring (0–100 composite across revenue, refill frequency, and recency) with tier labels (Star, Growing, Steady, At Risk, Dormant, New)

**Access control:** Owner/rep role model with Supabase Row-Level Security. No public signup — accounts are provisioned by the owner through an admin API route with explicit role assignment.

## Tech Stack

- **Frontend:** Next.js, Tailwind CSS, Recharts
- **Backend:** Supabase (Postgres, Auth, RLS)
- **Messaging:** Africa's Talking SMS API
- **Deployment:** Netlify (originally prototyped in Streamlit before a full rebuild)

## Engineering Notes (Problems Solved)

A few real production issues worth mentioning because they weren't obvious from local development:

- **Stale dashboard data after deploy:** Next.js caches `fetch()` calls by default, including through the Supabase client — and that cache survived redeploys, so the dashboard kept showing only the latest month. Fixed by forcing `cache: "no-store"` on every server-side Supabase query and adding `export const dynamic = "force-dynamic"` to each dashboard page.
- **Silent account-creation failures:** The Team page's account creation route hung and failed silently on Netlify because the `SUPABASE_SERVICE_ROLE_KEY` environment variable was missing (only the public keys were set). Rewrote the route to fail fast with a clear error instead of hanging indefinitely.
- **Type-checking gaps between local and CI builds:** Local dev mode didn't surface several real type errors (an invalid named export, Supabase join array-typing mismatches, implicit-`any` cookie options) that only appeared during Netlify's production build. Resolved all of them and now verify a clean `next build` before every deploy.
- **SMS integration debugging:** Diagnosed and fixed missing API keys in Streamlit Cloud secrets, incorrect query parameters, and a race condition between auto-refresh timers and button click state.

## Status

Live in production. Core modules complete; in progress: automated message scheduling via Vercel Cron and AI/ML-based demand forecasting.

---

*Built and maintained by Victor Muuo — [github.com/victormuuo07](https://github.com/victormuuo07) · [linkedin.com/in/victor-muuo](https://linkedin.com/in/victor-muuo)*
