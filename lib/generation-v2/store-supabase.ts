/**
 * Supabase-backed generation_jobs store (service role).
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emptyArtifacts, type GenerationJobRecord } from "./types";
import type {
  GenerationJobsStore,
  InsertGenerationJobInput,
  InsertGenerationJobResult,
  UpdateGenerationJobPatch,
} from "./store";
import { isTerminalStatus } from "./state-machine";
import { createAdminClient } from "../supabase/admin";

type JobRow = {
  id: string;
  ownership_scope: string;
  idempotency_key: string;
  status: GenerationJobRecord["status"];
  attempt_image: number;
  attempt_video: number;
  attempt_persist: number;
  request: GenerationJobRecord["request"];
  artifacts: GenerationJobRecord["artifacts"];
  error: GenerationJobRecord["error"];
  workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  failed_at: string | null;
};

function rowToJob(row: JobRow): GenerationJobRecord {
  return {
    id: row.id,
    ownershipScope: row.ownership_scope,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    attemptImage: row.attempt_image,
    attemptVideo: row.attempt_video,
    attemptPersist: row.attempt_persist,
    request: row.request,
    artifacts: { ...emptyArtifacts(), ...row.artifacts },
    error: row.error,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readyAt: row.ready_at,
    failedAt: row.failed_at,
  };
}

export function createSupabaseGenerationJobsStore(
  client: SupabaseClient = createAdminClient(),
): GenerationJobsStore {
  return {
    async insert(input: InsertGenerationJobInput): Promise<InsertGenerationJobResult> {
      const existing = await this.getByIdempotency(
        input.ownershipScope,
        input.idempotencyKey,
      );
      if (existing) {
        return { kind: "existing", job: existing };
      }

      const now = input.createdAt ?? new Date().toISOString();
      const { data, error } = await client
        .from("generation_jobs")
        .insert({
          id: input.id,
          ownership_scope: input.ownershipScope,
          idempotency_key: input.idempotencyKey,
          status: "created",
          request: input.request,
          artifacts: emptyArtifacts(),
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        // Unique race → return existing
        if (error.code === "23505") {
          const raced = await this.getByIdempotency(
            input.ownershipScope,
            input.idempotencyKey,
          );
          if (raced) return { kind: "existing", job: raced };
        }
        throw new Error(`generation_jobs insert failed: ${error.message}`);
      }

      return { kind: "created", job: rowToJob(data as JobRow) };
    },

    async getById(id: string) {
      const { data, error } = await client
        .from("generation_jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw new Error(`generation_jobs get failed: ${error.message}`);
      }
      return data ? rowToJob(data as JobRow) : null;
    },

    async getByIdempotency(ownershipScope: string, idempotencyKey: string) {
      const { data, error } = await client
        .from("generation_jobs")
        .select("*")
        .eq("ownership_scope", ownershipScope)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (error) {
        throw new Error(`generation_jobs idempotency get failed: ${error.message}`);
      }
      return data ? rowToJob(data as JobRow) : null;
    },

    async update(id: string, patch: UpdateGenerationJobPatch) {
      const current = await this.getById(id);
      if (!current) throw new Error(`generation_jobs not found: ${id}`);

      const nextArtifacts = patch.artifacts
        ? { ...current.artifacts, ...patch.artifacts }
        : current.artifacts;

      const { data, error } = await client
        .from("generation_jobs")
        .update({
          status: patch.status ?? current.status,
          attempt_image: patch.attemptImage ?? current.attemptImage,
          attempt_video: patch.attemptVideo ?? current.attemptVideo,
          attempt_persist: patch.attemptPersist ?? current.attemptPersist,
          artifacts: nextArtifacts,
          error: patch.error !== undefined ? patch.error : current.error,
          workflow_run_id:
            patch.workflowRunId !== undefined
              ? patch.workflowRunId
              : current.workflowRunId,
          ready_at: patch.readyAt !== undefined ? patch.readyAt : current.readyAt,
          failed_at:
            patch.failedAt !== undefined ? patch.failedAt : current.failedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(`generation_jobs update failed: ${error.message}`);
      }
      return rowToJob(data as JobRow);
    },

    async listNonTerminal() {
      const { data, error } = await client.from("generation_jobs").select("*");
      if (error) {
        throw new Error(`generation_jobs list failed: ${error.message}`);
      }
      return ((data ?? []) as JobRow[])
        .map(rowToJob)
        .filter((j) => !isTerminalStatus(j.status));
    },

    async count() {
      const { count, error } = await client
        .from("generation_jobs")
        .select("*", { count: "exact", head: true });
      if (error) {
        throw new Error(`generation_jobs count failed: ${error.message}`);
      }
      return count ?? 0;
    },
  };
}
