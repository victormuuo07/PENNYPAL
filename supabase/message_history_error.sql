-- Run once in the Supabase SQL editor (safe to re-run). Run BEFORE deploying the code.
alter table public."MESSAGE_HISTORY" add column if not exists error_message text;
