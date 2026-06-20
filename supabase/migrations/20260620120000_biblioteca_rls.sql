-- =============================================================================
-- Biblioteca Row Level Security (RLS) Migration
-- =============================================================================
--
-- Purpose:
--   Enforce user ownership at the database layer for Biblioteca tables.
--
-- Ownership model:
--   auth.users.id  →  public.projects.user_id
--   public.projects.id  →  public.assets.project_id
--
-- Prerequisites:
--   * Google OAuth validated and working
--   * Application layer populates projects.user_id with auth.users.id
--   * Backup of public.projects and public.assets taken before execution
--
-- DO NOT RUN until reviewed and approved.
-- This file is idempotent: safe to re-run after partial failure (policies are
-- dropped and recreated; RLS enable is harmless if already on).
--
-- =============================================================================
-- SECTION 0: POLICY AUDIT (run manually before migration)
-- =============================================================================
--
-- List existing policies on Biblioteca tables:
--
--   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('projects', 'assets')
--   order by tablename, policyname;
--
-- Confirm RLS status:
--
--   select relname, relrowsecurity, relforcerowsecurity
--   from pg_class
--   join pg_namespace n on n.oid = pg_class.relnamespace
--   where n.nspname = 'public'
--     and relname in ('projects', 'assets');
--
-- Count orphan projects (invisible to users after RLS):
--
--   select count(*) from public.projects where user_id is null;
--
-- =============================================================================
-- SECTION 1: LEGACY POLICY CLEANUP
-- =============================================================================
-- Remove permissive anon policies from pre-ownership Biblioteca setup.
-- Extend this list if audit (Section 0) reveals additional legacy policies.

drop policy if exists "Allow anon insert on assets" on public.assets;
drop policy if exists "Allow anon insert on projects" on public.projects;
drop policy if exists "Allow public insert on assets" on public.assets;
drop policy if exists "Allow public insert on projects" on public.projects;

-- Drop previously applied policies from this migration (idempotent re-run).
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

drop policy if exists "assets_select_own_project" on public.assets;
drop policy if exists "assets_insert_own_project" on public.assets;
drop policy if exists "assets_update_own_project" on public.assets;
drop policy if exists "assets_delete_own_project" on public.assets;

-- =============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================

alter table if exists public.projects enable row level security;
alter table if exists public.assets enable row level security;

-- =============================================================================
-- SECTION 3: public.projects POLICIES (authenticated role)
-- =============================================================================
-- Direct ownership: projects.user_id must equal the signed-in user's id.
-- No anon policies: unauthenticated clients cannot access projects.

-- SELECT: Users may read only projects they own.
create policy "projects_select_own"
  on public.projects
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT: Users may create projects only for themselves.
-- Application must set user_id = auth.uid() on insert.
create policy "projects_insert_own"
  on public.projects
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: Users may modify only their own projects.
-- WITH CHECK prevents transferring ownership to another user.
create policy "projects_update_own"
  on public.projects
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: Users may delete only their own projects (future Biblioteca feature).
create policy "projects_delete_own"
  on public.projects
  for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- SECTION 4: public.assets POLICIES (authenticated role, via project ownership)
-- =============================================================================
-- Assets have no user_id column. Access is derived from the parent project.
-- All operations require a matching project owned by auth.uid().

-- SELECT: Users may read assets belonging to their projects.
create policy "assets_select_own_project"
  on public.assets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

-- INSERT: Users may add assets only to projects they own.
create policy "assets_insert_own_project"
  on public.assets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

-- UPDATE: Users may modify assets only within projects they own.
-- WITH CHECK prevents moving an asset to another user's project.
create policy "assets_update_own_project"
  on public.assets
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

-- DELETE: Users may delete assets only from projects they own (future feature).
create policy "assets_delete_own_project"
  on public.assets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SECTION 5: POST-MIGRATION VERIFICATION (run manually after migration)
-- =============================================================================
--
-- 1. Authenticated user can create a project (user_id populated).
-- 2. Same user can list only their projects.
-- 3. Same user can save and reload assets on their project.
-- 4. Second authenticated user cannot see the first user's data.
-- 5. Anon key select on projects/assets returns empty or permission denied.
--
--   select count(*) from public.projects;  -- as anon: should fail or return 0 rows
--
-- =============================================================================
-- SECTION 6: ROLLBACK (emergency use only — run manually if migration must be reverted)
-- =============================================================================
-- WARNING: Rollback removes database-level isolation. Application-layer
-- filtering in lib/biblioteca.ts remains but anon access may be restored
-- if legacy policies are re-added separately.
--
-- Step 1: Drop Biblioteca RLS policies
--
--   drop policy if exists "projects_select_own" on public.projects;
--   drop policy if exists "projects_insert_own" on public.projects;
--   drop policy if exists "projects_update_own" on public.projects;
--   drop policy if exists "projects_delete_own" on public.projects;
--
--   drop policy if exists "assets_select_own_project" on public.assets;
--   drop policy if exists "assets_insert_own_project" on public.assets;
--   drop policy if exists "assets_update_own_project" on public.assets;
--   drop policy if exists "assets_delete_own_project" on public.assets;
--
-- Step 2: Disable RLS on Biblioteca tables
--
--   alter table if exists public.projects disable row level security;
--   alter table if exists public.assets disable row level security;
--
-- Step 3 (optional): Restore legacy anon policy if pre-migration behavior required
--
--   create policy "Allow anon insert on assets"
--     on public.assets
--     for insert
--     to anon
--     with check (true);
--
-- Step 4: Verify rollback
--
--   select relname, relrowsecurity from pg_class
--   join pg_namespace n on n.oid = pg_class.relnamespace
--   where n.nspname = 'public' and relname in ('projects', 'assets');
--
-- =============================================================================
