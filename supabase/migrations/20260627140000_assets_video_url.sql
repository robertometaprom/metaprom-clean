-- Add optional video URL to assets for Studio auto-save
alter table assets
  add column if not exists video_url text;
