/**
 * Generation Pipeline V2 — create job (flagged off from Studio).
 *
 * Enable with GENERATION_V2_ENABLED=1.
 * Canonical executor is Workflow (`start` + durable steps).
 * Opt into sync only with GENERATION_V2_EXECUTOR=sync (unit-test helper).
 *
 * Phase 1B Preview: GENERATION_V2_PHASE1B=1 + GENERATION_V2_STORE=supabase.
 * Fake providers only — never OpenAI/Veo.
 */

import { NextResponse } from "next/server";

import {
  createGenerationJob,
  createFakeProviders,
  createMemoryGenerationJobsStore,
  startGenerationExecution,
  toPublicView,
  validateGenerationRequestV2,
  GenerationProviderError,
} from "@/lib/generation-v2";
import {
  assertFakeOnlyProviders,
  attachPhase1bControls,
  isPhase1bEnabled,
  parsePhase1bControls,
} from "@/lib/generation-v2/phase1b";
import {
  registerGenerationJobStore,
  registerGenerationProviders,
} from "@/workflows/commercial-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

function isEnabled(): boolean {
  const v = process.env.GENERATION_V2_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function resolveStore() {
  const mode = process.env.GENERATION_V2_STORE?.trim().toLowerCase();
  if (mode === "supabase") {
    // Lazy require keeps memory-only local paths free of admin env.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createSupabaseGenerationJobsStore } = require("@/lib/generation-v2/store-supabase");
    return createSupabaseGenerationJobsStore();
  }
  return createMemoryGenerationJobsStore();
}

// Process-scoped memory store so GET can observe POST jobs in local mode.
const globalStore = globalThis as typeof globalThis & {
  __generationV2MemoryStore?: ReturnType<typeof createMemoryGenerationJobsStore>;
};

function memoryStore() {
  if (!globalStore.__generationV2MemoryStore) {
    globalStore.__generationV2MemoryStore = createMemoryGenerationJobsStore();
  }
  return globalStore.__generationV2MemoryStore;
}

export async function POST(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json(
      { error: "Generation Pipeline V2 is not enabled" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    assertFakeOnlyProviders();

    let validated = validateGenerationRequestV2(body);
    const rawBody = body as Record<string, unknown>;

    if (isPhase1bEnabled() && rawBody.phase1b != null) {
      const controls = parsePhase1bControls(rawBody.phase1b);
      if (!controls) {
        return NextResponse.json(
          { error: "Invalid phase1b controls" },
          { status: 400 },
        );
      }
      validated = attachPhase1bControls(validated, controls);
    }

    const store =
      process.env.GENERATION_V2_STORE?.trim().toLowerCase() === "supabase"
        ? resolveStore()
        : memoryStore();

    const { job, created } = await createGenerationJob({
      store,
      request: validated,
    });

    registerGenerationJobStore(job.id, store);

    if (created) {
      const providers = createFakeProviders();
      registerGenerationProviders(job.id, providers);

      // Workflow returns after enqueue (202). Sync helper awaits terminal.
      const started = await startGenerationExecution({
        generationId: job.id,
        deps: { store, providers },
      });

      if (started.mode === "sync") {
        return NextResponse.json(
          {
            ...toPublicView(started.job),
            created,
            executor: "sync",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          ...toPublicView({
            ...(await store.getById(job.id))!,
            workflowRunId: started.runId,
          }),
          created,
          executor: "workflow",
        },
        { status: 202 },
      );
    }

    const latest = await store.getById(job.id);
    return NextResponse.json(
      {
        ...toPublicView(latest ?? job),
        created,
        executor:
          process.env.GENERATION_V2_EXECUTOR?.trim().toLowerCase() === "sync"
            ? "sync"
            : "workflow",
      },
      { status: created ? 202 : 200 },
    );
  } catch (err) {
    if (err instanceof GenerationProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          class: err.failureClass,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Create failed",
      },
      { status: 500 },
    );
  }
}
