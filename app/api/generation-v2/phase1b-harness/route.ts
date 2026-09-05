/**
 * Phase 1B Preview-only harness — fake providers, no Studio/Stripe/credits.
 *
 * Enabled only when:
 *   GENERATION_V2_ENABLED=1
 *   GENERATION_V2_PHASE1B=1
 *   Authorization: Bearer <GENERATION_V2_PHASE1B_SECRET>
 *
 * Runs create → workflow start → poll generation_jobs in-process / via store.
 */

import { NextResponse } from "next/server";

import {
  createFakeProviders,
  createGenerationJob,
  startGenerationExecution,
  toPublicView,
  type FakeProviderScenario,
  type GenerationRequestV2,
  type OwnershipContext,
} from "@/lib/generation-v2";
import {
  assertFakeOnlyProviders,
  attachPhase1bControls,
  isPhase1bEnabled,
  type Phase1bTestControls,
} from "@/lib/generation-v2/phase1b";
import { createSupabaseGenerationJobsStore } from "@/lib/generation-v2/store-supabase";
import {
  registerGenerationJobStore,
  registerGenerationProviders,
} from "@/workflows/commercial-generation";

export const runtime = "nodejs";
export const maxDuration = 800;

function isEnabled(): boolean {
  const v = process.env.GENERATION_V2_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function authorized(request: Request): boolean {
  const secret = process.env.GENERATION_V2_PHASE1B_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

function store() {
  return createSupabaseGenerationJobsStore();
}

function baseRequest(input: {
  idempotencyKey: string;
  ownershipContext: OwnershipContext;
  phase1b: Phase1bTestControls;
}): GenerationRequestV2 {
  const req: GenerationRequestV2 = {
    idempotencyKey: input.idempotencyKey,
    sourceImageRef: "uploads/phase1b/source.png",
    customerIntent: "Sell handmade ceramic mugs",
    visualGenerationIntent: {
      visualEvents: "Mug rotates on oak table under soft window light",
      spokenCopy: "Handmade ceramics for your morning ritual",
    },
    creationMode: "commercial",
    destination: { platform: "TikTok", aspectRatio: "9:16" },
    productMode: "social",
    ownershipContext: input.ownershipContext,
  };
  return attachPhase1bControls(req, input.phase1b);
}

async function waitTerminal(
  jobsStore: ReturnType<typeof createSupabaseGenerationJobsStore>,
  id: string,
  timeoutMs: number,
) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const job = await jobsStore.getById(id);
    if (job && (job.status === "ready" || job.status === "failed")) {
      return { job, waitedMs: Date.now() - t0, timedOut: false };
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  const job = await jobsStore.getById(id);
  return { job, waitedMs: Date.now() - t0, timedOut: true };
}

async function createAndStart(
  jobsStore: ReturnType<typeof createSupabaseGenerationJobsStore>,
  request: GenerationRequestV2,
) {
  assertFakeOnlyProviders();
  const { job, created } = await createGenerationJob({ store: jobsStore, request });
  registerGenerationJobStore(job.id, jobsStore);
  let workflowRunId: string | null = job.workflowRunId;
  let postElapsed = 0;
  if (created) {
    const providers = createFakeProviders();
    registerGenerationProviders(job.id, providers);
    const t0 = Date.now();
    const started = await startGenerationExecution({
      generationId: job.id,
      deps: { store: jobsStore, providers },
    });
    postElapsed = Date.now() - t0;
    if (started.mode === "workflow") workflowRunId = started.runId;
  }
  const latest = await jobsStore.getById(job.id);
  return {
    job: latest ?? job,
    created,
    workflowRunId,
    postElapsed,
    view: toPublicView(latest ?? job),
  };
}

const FAILURE_CASES: Array<{
  name: string;
  phase1b: Phase1bTestControls;
  expect: "ready" | "failed";
  errorClass?: string;
}> = [
  { name: "SUCCESS", phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 }, expect: "ready" },
  {
    name: "FAIL_ONCE_THEN_SUCCESS",
    phase1b: { scenario: "image_fail_retryable", failTimesBeforeSuccess: 1, delayMs: 0 },
    expect: "ready",
  },
  {
    name: "FAIL_TWICE_THEN_SUCCESS",
    phase1b: { scenario: "image_fail_retryable", failTimesBeforeSuccess: 2, delayMs: 0 },
    expect: "ready",
  },
  {
    name: "IMAGE_FAIL_TERMINAL",
    phase1b: { scenario: "image_fail_terminal", failTimesBeforeSuccess: 2, delayMs: 0 },
    expect: "failed",
    errorClass: "malformed_provider_response",
  },
  {
    name: "VIDEO_FAIL_TERMINAL",
    phase1b: { scenario: "video_fail_terminal", failTimesBeforeSuccess: 5, delayMs: 0 },
    expect: "failed",
    errorClass: "video_provider",
  },
  {
    name: "VIDEO_TIMEOUT",
    phase1b: { scenario: "video_timeout", failTimesBeforeSuccess: 5, delayMs: 0 },
    expect: "failed",
    errorClass: "video_timeout",
  },
  {
    name: "STORAGE_FAIL_RETRYABLE",
    phase1b: { scenario: "storage_fail", failTimesBeforeSuccess: 1, delayMs: 0 },
    expect: "ready",
  },
  {
    name: "DB_FINALIZE_FAIL_RETRYABLE",
    phase1b: { scenario: "db_fail", failTimesBeforeSuccess: 1, delayMs: 0 },
    expect: "ready",
  },
];

function stressScenario(i: number): FakeProviderScenario {
  if (i % 29 === 0 && i > 0) return "video_empty";
  if (i % 31 === 0 && i > 0) return "image_fail_terminal";
  if (i % 13 === 0 && i > 0) return "video_fail_retryable";
  if (i % 11 === 0 && i > 0) return "db_fail";
  if (i % 17 === 0 && i > 0) return "image_fail_retryable";
  if (i % 19 === 0 && i > 0) return "storage_fail";
  return "success";
}

export async function POST(request: Request) {
  if (!isEnabled() || !isPhase1bEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.GENERATION_V2_STORE?.trim().toLowerCase() !== "supabase") {
    return NextResponse.json(
      { error: "GENERATION_V2_STORE=supabase required" },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = String(body.mode ?? "smoke");
  const count = Math.min(Math.max(Number(body.count ?? 10) || 10, 1), 1000);
  const timeoutMs = Math.min(
    Math.max(Number(body.timeoutMs ?? 180000) || 180000, 5000),
    700000,
  );
  const jobsStore = store();

  try {
    if (mode === "smoke") {
      const t0 = Date.now();
      const started = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: `harness-smoke-${Date.now()}`,
          ownershipContext: { kind: "authenticated", userId: "phase1b_harness" },
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 },
        }),
      );
      const terminal = await waitTerminal(jobsStore, started.job.id, timeoutMs);
      return NextResponse.json({
        mode,
        postElapsed: started.postElapsed,
        created: started.created,
        executor: "workflow",
        generationId: started.job.id,
        workflowRunId: started.workflowRunId,
        statusAfterPost: started.view.status,
        terminal: terminal.job ? toPublicView(terminal.job) : null,
        observability: terminal.job
          ? {
              attempts: {
                image: terminal.job.attemptImage,
                video: terminal.job.attemptVideo,
                persist: terminal.job.attemptPersist,
              },
              artifacts: terminal.job.artifacts,
              error: terminal.job.error,
              timestamps: {
                createdAt: terminal.job.createdAt,
                updatedAt: terminal.job.updatedAt,
                readyAt: terminal.job.readyAt,
                failedAt: terminal.job.failedAt,
              },
            }
          : null,
        waitedMs: terminal.waitedMs,
        timedOut: terminal.timedOut,
        wallClockMs: Date.now() - t0,
        requestIndependence:
          started.postElapsed < 30000 &&
          Boolean(started.workflowRunId) &&
          !terminal.timedOut,
      });
    }

    if (mode === "idempotency") {
      const key = `harness-idem-${Date.now()}`;
      const ownerA: OwnershipContext = {
        kind: "authenticated",
        userId: "phase1b_idem_a",
      };
      const ownerB: OwnershipContext = {
        kind: "authenticated",
        userId: "phase1b_idem_b",
      };
      const a1 = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: key,
          ownershipContext: ownerA,
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 },
        }),
      );
      const a2 = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: key,
          ownershipContext: ownerA,
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 },
        }),
      );
      const otherKey = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: `${key}-other`,
          ownershipContext: ownerA,
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 },
        }),
      );
      const otherOwner = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: key,
          ownershipContext: ownerB,
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 0 },
        }),
      );
      const terminal = await waitTerminal(jobsStore, a1.job.id, timeoutMs);
      return NextResponse.json({
        mode,
        sameKeySameOwner: a1.job.id === a2.job.id,
        firstCreated: a1.created,
        secondCreated: a2.created,
        differentKey: otherKey.job.id !== a1.job.id,
        differentOwner: otherOwner.job.id !== a1.job.id,
        workflowRunId: a1.workflowRunId,
        terminalStatus: terminal.job?.status ?? null,
        ok:
          a1.job.id === a2.job.id &&
          a1.created === true &&
          a2.created === false &&
          otherKey.job.id !== a1.job.id &&
          otherOwner.job.id !== a1.job.id &&
          !terminal.timedOut,
      });
    }

    if (mode === "failures") {
      const results = [];
      for (const c of FAILURE_CASES) {
        const started = await createAndStart(
          jobsStore,
          baseRequest({
            idempotencyKey: `harness-fail-${c.name}-${Date.now()}`,
            ownershipContext: { kind: "authenticated", userId: "phase1b_fail" },
            phase1b: c.phase1b,
          }),
        );
        const terminal = await waitTerminal(jobsStore, started.job.id, timeoutMs);
        const status = terminal.job?.status;
        const errorClass = terminal.job?.error?.class ?? null;
        const ok =
          !terminal.timedOut &&
          status === c.expect &&
          (!c.errorClass || errorClass === c.errorClass);
        results.push({
          name: c.name,
          ok,
          status,
          errorClass,
          attempts: terminal.job
            ? {
                image: terminal.job.attemptImage,
                video: terminal.job.attemptVideo,
                persist: terminal.job.attemptPersist,
              }
            : null,
          failedAt: terminal.job?.failedAt ?? null,
          generationId: started.job.id,
          workflowRunId: started.workflowRunId,
        });
      }
      return NextResponse.json({
        mode,
        results,
        ok: results.every((r) => r.ok),
      });
    }

    if (mode === "stress") {
      const t0 = Date.now();
      const ids: string[] = [];
      const batch = 20;
      for (let i = 0; i < count; i += batch) {
        const slice = Array.from({ length: Math.min(batch, count - i) }, (_, j) => {
          const n = i + j;
          const ownership: OwnershipContext =
            n % 2 === 0
              ? { kind: "authenticated", userId: `stress_u_${n}` }
              : { kind: "anonymous", sessionId: `stress_s_${n}` };
          const scenario = stressScenario(n);
          return createAndStart(
            jobsStore,
            baseRequest({
              idempotencyKey: `harness-stress-${count}-${n}-${Date.now()}`,
              ownershipContext: ownership,
              phase1b: {
                scenario,
                failTimesBeforeSuccess: 1,
                delayMs: 0,
              },
            }),
          );
        });
        const part = await Promise.all(slice);
        for (const p of part) ids.push(p.job.id);
      }

      const elapsedById = new Map<string, number>();
      for (let i = 0; i < ids.length; i += batch) {
        const slice = ids.slice(i, i + batch);
        await Promise.all(
          slice.map(async (id) => {
            const t = await waitTerminal(jobsStore, id, timeoutMs);
            elapsedById.set(id, t.waitedMs);
          }),
        );
      }

      let ready = 0;
      let failed = 0;
      let running = 0;
      let nonTerminal = 0;
      let duplicateLogicalJobs = 0;
      let duplicateArtifacts = 0;
      const logical = new Map<string, number>();
      const pathOwners = new Map<string, string>();
      const failureBreakdown: Record<string, number> = {};

      for (const id of ids) {
        const job = await jobsStore.getById(id);
        if (!job) {
          nonTerminal += 1;
          running += 1;
          continue;
        }
        const key = `${job.ownershipScope}::${job.idempotencyKey}`;
        logical.set(key, (logical.get(key) ?? 0) + 1);
        if (job.status === "ready") {
          ready += 1;
          for (const p of [
            job.artifacts.enhancedImagePath,
            job.artifacts.teaserPath,
          ]) {
            if (!p) continue;
            const prev = pathOwners.get(p);
            if (prev && prev !== job.id) duplicateArtifacts += 1;
            else pathOwners.set(p, job.id);
          }
        } else if (job.status === "failed") {
          failed += 1;
          const cls = job.error?.class ?? "unknown";
          failureBreakdown[cls] = (failureBreakdown[cls] ?? 0) + 1;
        } else {
          running += 1;
          nonTerminal += 1;
        }
      }
      for (const v of logical.values()) {
        if (v > 1) duplicateLogicalJobs += 1;
      }
      const times = [...elapsedById.values()];
      const report = {
        total: count,
        ready,
        failed,
        running,
        nonTerminal,
        duplicateLogicalJobs,
        duplicateArtifacts,
        averageCompletionTime:
          times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1),
        maxCompletionTime: Math.max(...times, 0),
        failureBreakdown,
        wallClockMs: Date.now() - t0,
        hardGate:
          count === ready + failed &&
          running === 0 &&
          nonTerminal === 0 &&
          duplicateLogicalJobs === 0,
      };
      return NextResponse.json({ mode, count, report });
    }

    if (mode === "durability") {
      const started = await createAndStart(
        jobsStore,
        baseRequest({
          idempotencyKey: `harness-durability-${Date.now()}`,
          ownershipContext: { kind: "authenticated", userId: "phase1b_durability" },
          phase1b: { scenario: "success", failTimesBeforeSuccess: 2, delayMs: 45000 },
        }),
      );
      return NextResponse.json({
        mode,
        note: "Job started with delayMs=45000. Redeploy Preview now; poll GET /api/generation-v2/:id.",
        generationId: started.job.id,
        workflowRunId: started.workflowRunId,
        postElapsed: started.postElapsed,
        statusAfterPost: started.view.status,
      });
    }

    return NextResponse.json({ error: `Unknown mode ${mode}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Harness failed",
      },
      { status: 500 },
    );
  }
}
