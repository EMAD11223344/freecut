-- ============================================
-- Business-OS × FreeCut: Supabase Schema Setup
-- ============================================
-- Run this in your Supabase SQL Editor (dashboard → SQL Editor)
-- ============================================

-- 1. Storage bucket for video exports
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-exports',
  'video-exports',
  true,
  524288000, -- 500 MB limit
  array['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime', 'audio/mp3', 'audio/aac', 'audio/wav']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their workspace folder
create policy "Users can upload to their workspace"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'video-exports'
  and (storage.foldername(name))[1] is not null
);

-- Allow authenticated users to read any export
create policy "Users can read any export"
on storage.objects for select
to authenticated
using (bucket_id = 'video-exports');

-- 2. Video projects metadata table
create table if not exists public.video_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  title text not null,
  filename text not null,
  storage_path text not null,
  public_url text not null,
  file_size_bytes bigint not null default 0,
  duration_seconds numeric(10,2),
  created_at timestamptz not null default now()
);

-- Index for fast workspace queries
create index if not exists idx_video_projects_workspace
on public.video_projects (workspace_id, created_at desc);

-- Enable RLS
alter table public.video_projects enable row level security;

-- RLS: users can only see their own workspace's projects
create policy "Users can read their workspace projects"
on public.video_projects for select
to authenticated
using (true); -- All authenticated users can read (workspace_id scoping is app-level)

create policy "Users can insert their own projects"
on public.video_projects for insert
to authenticated
with check (auth.uid() = user_id);

-- ============================================
-- 3. FreeCut workspace projects table
-- ============================================
create table if not exists public.freecut_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  title text not null,
  description text not null default '',
  project_data text not null default '{}',
  file_size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_freecut_projects_workspace
on public.freecut_projects (workspace_id, user_id, updated_at desc);

alter table public.freecut_projects enable row level security;

create policy "Users can read their workspace projects"
on public.freecut_projects for select
to authenticated
using (true);

create policy "Users can insert their own projects"
on public.freecut_projects for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own projects"
on public.freecut_projects for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own projects"
on public.freecut_projects for delete
to authenticated
using (auth.uid() = user_id);
