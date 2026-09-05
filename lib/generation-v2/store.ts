/**
 * Durable generation_jobs store contract.
 */

import type {
  GenerationJobArtifacts,
  GenerationJobError,
  GenerationJobRecord,
  GenerationJobStatus,
  GenerationRequestV2,
} from "./types";

export type InsertGenerationJobInput = {
  id: string;
  ownershipScope: string;
  idempotencyKey: string;
  request: GenerationRequestV2;
  createdAt?: string;
};

export type UpdateGenerationJobPatch = {
  status?: GenerationJobStatus;
  attemptImage?: number;
  attemptVideo?: number;
  attemptPersist?: number;
  artifacts?: Partial<GenerationJobArtifacts>;
  error?: GenerationJobError | null;
  workflowRunId?: string | null;
  readyAt?: string | null;
  failedAt?: string | null;
};

export type InsertGenerationJobResult =
  | { kind: "created"; job: GenerationJobRecord }
  | { kind: "existing"; job: GenerationJobRecord };

export interface GenerationJobsStore {
  insert(input: InsertGenerationJobInput): Promise<InsertGenerationJobResult>;
  getById(id: string): Promise<GenerationJobRecord | null>;
  getByIdempotency(
    ownershipScope: string,
    idempotencyKey: string,
  ): Promise<GenerationJobRecord | null>;
  update(
    id: string,
    patch: UpdateGenerationJobPatch,
  ): Promise<GenerationJobRecord>;
  listNonTerminal(): Promise<GenerationJobRecord[]>;
  count(): Promise<number>;
}
