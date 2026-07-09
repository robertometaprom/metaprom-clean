-- Align live public.projects with application Biblioteca metadata schema.
-- Idempotent: safe to run when columns were partially applied elsewhere.

alter table if exists public.projects
  add column if not exists description text,
  add column if not exists workflow_id text,
  add column if not exists industry text,
  add column if not exists intended_destination text;
