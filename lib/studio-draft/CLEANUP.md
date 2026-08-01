# Studio Draft Cleanup Strategy

Anonymous Studio drafts bridge the gap between preview and account creation. Rows live in `public.studio_drafts` with a 7-day `expires_at` default; assets live in the private `studio-drafts` Supabase Storage bucket.

This document defines how expired drafts and orphaned storage objects are reclaimed without affecting the authenticated Biblioteca flow or in-progress anonymous sessions.

## Lifecycle

| State | DB row | Storage objects | User experience |
| --- | --- | --- | --- |
| Active anonymous draft | Unclaimed, `expires_at > now()` | Present | Resume via `?resume=<uuid>` |
| Claimed draft | `claimed_at` set | Deleted on successful claim | Project in Biblioteca |
| Expired draft | Unclaimed, `expires_at <= now()` | May still exist | GET/claim return 404; local Studio state unaffected |
| Orphaned storage | No matching row | Present | No user impact; storage cost only |

## Cleanup responsibilities

### 1. Expired draft rows + attached storage (daily)

**Function:** `cleanupExpiredStudioDrafts()` in `lib/studio-draft/cleanup.ts`

**Schedule:** Once per day (recommended: off-peak UTC).

**Behavior:**

1. Select up to 100 unclaimed rows where `expires_at < now()`.
2. Delete associated storage objects (`original`, `enhanced`, `teaser`).
3. Delete the DB row only after storage deletion succeeds for that draft.
4. Log errors per draft; failed rows remain for the next run.

**Why batch:** Avoid long-running cron jobs and storage API bursts.

### 2. Orphaned storage sweep (weekly)

**Function:** `cleanupOrphanedDraftStorage()` in `lib/studio-draft/cleanup.ts`

**Schedule:** Weekly.

**Behavior:**

1. List top-level prefixes in `studio-drafts` (each prefix is a `resume_token`).
2. If no `studio_drafts` row exists for the prefix, delete all objects under that prefix.
3. Paginate listing to stay within storage API limits.

**When orphans appear:**

- Storage upload succeeded but DB insert/update failed.
- Manual storage operations during development.
- Partial failures before hardening (post-hardening claim is atomic and reverts on persist failure).

### 3. Successful claim (real-time)

**Function:** `deleteDraftObjects()` in `lib/studio-draft/server.ts`

On successful claim + persist, storage objects are removed immediately. No scheduled cleanup needed for claimed drafts.

## Operational wiring (not deployed yet)

Recommended future cron route (service-role protected, not public):

```
POST /api/internal/cron/cleanup-studio-drafts
Authorization: Bearer <CRON_SECRET>
```

Suggested sequence per invocation:

1. `cleanupExpiredStudioDrafts({ batchSize: 100 })`
2. On Sundays only: `cleanupOrphanedDraftStorage({ pageSize: 200 })`

## Monitoring

Track:

- `expiredRowsDeleted` and `orphanedStorageObjectsDeleted` per run
- Non-empty `errors` arrays (alert if repeated failures for same token)
- Storage bucket total size trend

## Safety constraints

- Never delete rows where `claimed_at IS NOT NULL`.
- Never delete storage for a token that still has an unexpired unclaimed row.
- Cleanup uses the Supabase service role; no client-facing route exposes delete capability.
- Migration `20260731120000_studio_drafts.sql` must be applied before cleanup functions run in production.

## Retention summary

| Artifact | Retention |
| --- | --- |
| Unclaimed draft row | 7 days from creation (`expires_at`) |
| Draft storage objects | Until claim succeeds or expired-draft cleanup runs |
| Claimed project/assets | Biblioteca retention (unchanged) |
