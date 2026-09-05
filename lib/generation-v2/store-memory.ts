/**
 * In-memory generation_jobs store — Phase 1 stress harness + unit tests.
 */

import { emptyArtifacts, type GenerationJobRecord } from "./types";
import type {
  GenerationJobsStore,
  InsertGenerationJobInput,
  InsertGenerationJobResult,
  UpdateGenerationJobPatch,
} from "./store";
import { isTerminalStatus } from "./state-machine";

function cloneJob(job: GenerationJobRecord): GenerationJobRecord {
  return {
    ...job,
    request: structuredClone(job.request),
    artifacts: structuredClone(job.artifacts),
    error: job.error ? structuredClone(job.error) : null,
  };
}

export function createMemoryGenerationJobsStore(): GenerationJobsStore {
  const byId = new Map<string, GenerationJobRecord>();
  const byIdempotency = new Map<string, string>();

  function idemKey(scope: string, key: string): string {
    return `${scope}::${key}`;
  }

  return {
    async insert(input: InsertGenerationJobInput): Promise<InsertGenerationJobResult> {
      const key = idemKey(input.ownershipScope, input.idempotencyKey);
      const existingId = byIdempotency.get(key);
      if (existingId) {
        const existing = byId.get(existingId);
        if (!existing) {
          throw new Error("Idempotency index corrupted");
        }
        return { kind: "existing", job: cloneJob(existing) };
      }

      const now = input.createdAt ?? new Date().toISOString();
      const job: GenerationJobRecord = {
        id: input.id,
        ownershipScope: input.ownershipScope,
        idempotencyKey: input.idempotencyKey,
        status: "created",
        attemptImage: 0,
        attemptVideo: 0,
        attemptPersist: 0,
        request: structuredClone(input.request),
        artifacts: emptyArtifacts(),
        error: null,
        workflowRunId: null,
        createdAt: now,
        updatedAt: now,
        readyAt: null,
        failedAt: null,
      };

      byId.set(job.id, job);
      byIdempotency.set(key, job.id);
      return { kind: "created", job: cloneJob(job) };
    },

    async getById(id: string) {
      const job = byId.get(id);
      return job ? cloneJob(job) : null;
    },

    async getByIdempotency(ownershipScope: string, idempotencyKey: string) {
      const id = byIdempotency.get(idemKey(ownershipScope, idempotencyKey));
      if (!id) return null;
      return this.getById(id);
    },

    async update(id: string, patch: UpdateGenerationJobPatch) {
      const job = byId.get(id);
      if (!job) {
        throw new Error(`generation_jobs not found: ${id}`);
      }

      const now = new Date().toISOString();
      if (patch.status !== undefined) job.status = patch.status;
      if (patch.attemptImage !== undefined) job.attemptImage = patch.attemptImage;
      if (patch.attemptVideo !== undefined) job.attemptVideo = patch.attemptVideo;
      if (patch.attemptPersist !== undefined) {
        job.attemptPersist = patch.attemptPersist;
      }
      if (patch.artifacts) {
        job.artifacts = { ...job.artifacts, ...patch.artifacts };
      }
      if (patch.error !== undefined) job.error = patch.error;
      if (patch.workflowRunId !== undefined) {
        job.workflowRunId = patch.workflowRunId;
      }
      if (patch.readyAt !== undefined) job.readyAt = patch.readyAt;
      if (patch.failedAt !== undefined) job.failedAt = patch.failedAt;
      job.updatedAt = now;

      return cloneJob(job);
    },

    async listNonTerminal() {
      return [...byId.values()]
        .filter((j) => !isTerminalStatus(j.status))
        .map(cloneJob);
    },

    async count() {
      return byId.size;
    },
  };
}
