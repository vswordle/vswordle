-- Incremental migration for projects where 001 was already recorded.
-- The secure schema migration must also exist remotely before these RPCs can run.
alter table public.lobbies add column if not exists match_id uuid references public.matches(id);
alter publication supabase_realtime add table public.lobbies;
