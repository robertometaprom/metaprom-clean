/**
 * Generation Pipeline V2 — job status poll.
 *
 * Polling observes generation_jobs only; it does not drive execution.
 */

import { NextResponse } from "next/server";

import {
  createMemoryGenerationJobsStore,
  toPublicView,
} from "@/lib/generation-v2";
import { isPhase1bEnabled, readPhase1bControls } from "@/lib/generation-v2/phase1b";

export const runtime = "nodejs";

function isEnabled(): boolean {
  const v = process.env.GENERATION_V2_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const globalStore = globalThis as typeof globalThis & {
  __generationV2MemoryStore?: ReturnType<typeof createMemoryGenerationJobsStore>;
};

function memoryStore() {
  if (!globalStore.__generationV2MemoryStore) {
    globalStore.__generationV2MemoryStore = createMemoryGenerationJobsStore();
  }
  return globalStore.__generationV2MemoryStore;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: "Generation Pipeline V2 is not enabled" },
      { status: 404 },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const store =
    process.env.GENERATION_V2_STORE?.trim().toLowerCase() === "supabase"
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@/lib/generation-v2/store-supabase").createSupabaseGenerationJobsStore()
      : memoryStore();

  const job = await store.getById(id.trim());
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const view = toPublicView(job);

  if (!isPhase1bEnabled()) {
    return NextResponse.json(view);
  }

  // Preview observability — reconstruct diagnosis without browser state.
  return NextResponse.json({
    ...view,
    observability: {
      generationId: job.id,
      workflowRunId: job.workflowRunId,
      status: job.status,
      rollup: view.rollup,
      attempts: {
        image: job.attemptImage,
        video: job.attemptVideo,
        persist: job.attemptPersist,
      },
      timestamps: {
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        readyAt: job.readyAt,
        failedAt: job.failedAt,
      },
      artifacts: job.artifacts,
      error: job.error,
      phase1b: readPhase1bControls(job.request),
      ownershipScope: job.ownershipScope,
      idempotencyKey: job.idempotencyKey,
    },
  });
}
