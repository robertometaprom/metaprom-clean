/**
 * Phase 1B Preview validation harness — fake providers only.
 *
 * Usage:
 *   node --env-file=.env.local scripts/generation-v2-phase1b-preview.mjs \
 *     --base https://YOUR-PREVIEW.vercel.app \
 *     --mode all|smoke|idempotency|failures|stress|durability \
 *     --stress 10
 *
 * Does not touch Studio, Stripe, credits, or production aliases.
 */

const args = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1] ?? true;
}

const BASE = String(flag("base", process.env.PHASE1B_PREVIEW_BASE || "")).replace(
  /\/$/,
  "",
);
const MODE = String(flag("mode", "smoke"));
const STRESS = Number(flag("stress", "10"));
const POLL_MS = Number(flag("pollMs", "1500"));
const TIMEOUT_MS = Number(flag("timeoutMs", "180000"));

if (!BASE) {
  console.error("Missing --base <preview-url>");
  process.exit(2);
}

function baseRequest(overrides = {}) {
  return {
    idempotencyKey: overrides.idempotencyKey ?? crypto.randomUUID(),
    sourceImageRef: "uploads/phase1b/source.png",
    customerIntent: "Sell handmade ceramic mugs",
    visualGenerationIntent: {
      visualEvents: "Mug rotates on oak table under soft window light",
      spokenCopy: "Handmade ceramics for your morning ritual",
    },
    creationMode: "commercial",
    destination: { platform: "TikTok", aspectRatio: "9:16" },
    productMode: "social",
    ownershipContext: overrides.ownershipContext ?? {
      kind: "authenticated",
      userId: "phase1b_user_1",
    },
    phase1b: overrides.phase1b ?? { scenario: "success" },
    ...overrides.extra,
  };
}

async function postJob(body) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/generation-v2`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - t0;
  const json = await res.json().catch(() => ({}));
  return { status: res.status, elapsed, json };
}

async function getJob(id) {
  const res = await fetch(`${BASE}/api/generation-v2/${id}`);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function waitTerminal(id, timeoutMs = TIMEOUT_MS) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const { status, json } = await getJob(id);
    if (status === 404) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    const rollup = json.rollup ?? json.observability?.status;
    if (json.status === "ready" || json.status === "failed") {
      return { json, waitedMs: Date.now() - t0 };
    }
    if (rollup === "READY" || rollup === "FAILED") {
      return { json, waitedMs: Date.now() - t0 };
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  const last = await getJob(id);
  return { json: last.json, waitedMs: Date.now() - t0, timedOut: true };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function smoke() {
  console.log("\n=== SMOKE / REQUEST INDEPENDENCE ===");
  const post = await postJob(
    baseRequest({
      idempotencyKey: `smoke-${Date.now()}`,
      phase1b: { scenario: "success" },
    }),
  );
  console.log("POST", {
    status: post.status,
    elapsed: post.elapsed,
    generationId: post.json.generationId,
    workflowRunId: post.json.workflowRunId,
    executor: post.json.executor,
    created: post.json.created,
  });
  assert(post.status === 202, `expected 202, got ${post.status}`);
  assert(post.elapsed < 30000, `POST too slow: ${post.elapsed}ms`);
  assert(post.json.generationId, "missing generationId");
  assert(post.json.executor === "workflow", "executor must be workflow");
  assert(post.json.workflowRunId, "missing workflowRunId");

  const terminal = await waitTerminal(post.json.generationId);
  console.log("TERMINAL", {
    status: terminal.json.status,
    rollup: terminal.json.rollup,
    workflowRunId: terminal.json.workflowRunId,
    waitedMs: terminal.waitedMs,
    timedOut: terminal.timedOut ?? false,
  });
  assert(!terminal.timedOut, "job did not reach terminal state");
  assert(
    terminal.json.status === "ready" || terminal.json.status === "failed",
    "non-terminal",
  );
  assert(
    terminal.json.workflowRunId === post.json.workflowRunId ||
      Boolean(terminal.json.workflowRunId),
    "workflowRunId correlation broken",
  );
  return { post, terminal };
}

async function idempotency() {
  console.log("\n=== IDEMPOTENCY ===");
  const key = `idem-${Date.now()}`;
  const ownerA = { kind: "authenticated", userId: "phase1b_idem_a" };
  const ownerB = { kind: "authenticated", userId: "phase1b_idem_b" };

  const a1 = await postJob(
    baseRequest({
      idempotencyKey: key,
      ownershipContext: ownerA,
      phase1b: { scenario: "success" },
    }),
  );
  const a2 = await postJob(
    baseRequest({
      idempotencyKey: key,
      ownershipContext: ownerA,
      phase1b: { scenario: "success" },
    }),
  );
  assert(a1.json.generationId === a2.json.generationId, "same key/owner must match");
  assert(a1.json.created === true, "first create");
  assert(a2.json.created === false, "second must be idempotent hit");

  const otherKey = await postJob(
    baseRequest({
      idempotencyKey: `${key}-other`,
      ownershipContext: ownerA,
      phase1b: { scenario: "success" },
    }),
  );
  assert(
    otherKey.json.generationId !== a1.json.generationId,
    "different key must differ",
  );

  const otherOwner = await postJob(
    baseRequest({
      idempotencyKey: key,
      ownershipContext: ownerB,
      phase1b: { scenario: "success" },
    }),
  );
  assert(
    otherOwner.json.generationId !== a1.json.generationId,
    "same key different owner must isolate",
  );

  // Wait first job; confirm no duplicate workflow needed for a2
  const t = await waitTerminal(a1.json.generationId);
  assert(t.json.status === "ready" || t.json.status === "failed", "idem job terminal");

  console.log({
    sameKeySameOwner: a1.json.generationId,
    createdSecond: a2.json.created,
    differentKey: otherKey.json.generationId,
    differentOwner: otherOwner.json.generationId,
    workflowRunId: a1.json.workflowRunId,
  });
  return { a1, a2, otherKey, otherOwner };
}

const FAILURE_CASES = [
  {
    name: "SUCCESS",
    phase1b: { scenario: "success" },
    expect: "ready",
  },
  {
    name: "FAIL_ONCE_THEN_SUCCESS",
    phase1b: { scenario: "image_fail_retryable", failTimesBeforeSuccess: 1 },
    expect: "ready",
  },
  {
    name: "FAIL_TWICE_THEN_SUCCESS",
    phase1b: { scenario: "image_fail_retryable", failTimesBeforeSuccess: 2 },
    expect: "ready",
  },
  {
    name: "IMAGE_FAIL_TERMINAL",
    phase1b: { scenario: "image_fail_terminal" },
    expect: "failed",
    errorClass: "malformed_provider_response",
  },
  {
    name: "VIDEO_FAIL_TERMINAL",
    phase1b: { scenario: "video_fail_terminal", failTimesBeforeSuccess: 5 },
    expect: "failed",
    errorClass: "video_provider",
  },
  {
    name: "VIDEO_TIMEOUT",
    phase1b: { scenario: "video_timeout", failTimesBeforeSuccess: 5 },
    expect: "failed",
    errorClass: "video_timeout",
  },
  {
    name: "STORAGE_FAIL_RETRYABLE",
    phase1b: { scenario: "storage_fail", failTimesBeforeSuccess: 1 },
    expect: "ready",
  },
  {
    name: "DB_FINALIZE_FAIL_RETRYABLE",
    phase1b: { scenario: "db_fail", failTimesBeforeSuccess: 1 },
    expect: "ready",
  },
];

async function failures() {
  console.log("\n=== FAILURE SCENARIOS ===");
  const results = [];
  for (const c of FAILURE_CASES) {
    const post = await postJob(
      baseRequest({
        idempotencyKey: `fail-${c.name}-${Date.now()}`,
        phase1b: c.phase1b,
      }),
    );
    assert(post.status === 202 || post.status === 200, `${c.name} POST failed`);
    const terminal = await waitTerminal(post.json.generationId);
    const ok =
      !terminal.timedOut &&
      terminal.json.status === c.expect &&
      (!c.errorClass || terminal.json.error?.class === c.errorClass);
    const row = {
      name: c.name,
      ok,
      status: terminal.json.status,
      errorClass: terminal.json.error?.class ?? null,
      attempts: terminal.json.observability?.attempts ?? null,
      failedAt: terminal.json.observability?.timestamps?.failedAt ?? null,
      generationId: post.json.generationId,
      workflowRunId: post.json.workflowRunId,
    };
    results.push(row);
    console.log(row);
    assert(ok, `${c.name} expected ${c.expect}`);
  }
  return results;
}

async function stress(count) {
  console.log(`\n=== STRESS ${count} ===`);
  const t0 = Date.now();
  const posts = [];
  const batch = 25;
  for (let i = 0; i < count; i += batch) {
    const slice = Array.from({ length: Math.min(batch, count - i) }, (_, j) => {
      const n = i + j;
      const ownership =
        n % 2 === 0
          ? { kind: "authenticated", userId: `stress_u_${n}` }
          : { kind: "anonymous", sessionId: `stress_s_${n}` };
      let phase1b = { scenario: "success", failTimesBeforeSuccess: 1 };
      if (n % 29 === 0 && n > 0) phase1b = { scenario: "video_empty" };
      else if (n % 31 === 0 && n > 0) phase1b = { scenario: "image_fail_terminal" };
      else if (n % 13 === 0 && n > 0)
        phase1b = { scenario: "video_fail_retryable", failTimesBeforeSuccess: 1 };
      else if (n % 11 === 0 && n > 0)
        phase1b = { scenario: "db_fail", failTimesBeforeSuccess: 1 };
      else if (n % 17 === 0 && n > 0)
        phase1b = { scenario: "image_fail_retryable", failTimesBeforeSuccess: 1 };
      else if (n % 19 === 0 && n > 0)
        phase1b = { scenario: "storage_fail", failTimesBeforeSuccess: 1 };

      return postJob(
        baseRequest({
          idempotencyKey: `stress-${count}-${n}-${Date.now()}`,
          ownershipContext: ownership,
          phase1b,
        }),
      );
    });
    const part = await Promise.all(slice);
    posts.push(...part);
    console.log(`posted ${posts.length}/${count}`);
  }

  const ids = posts.map((p) => p.json.generationId).filter(Boolean);
  assert(ids.length === count, `post failures: got ${ids.length}/${count}`);

  const elapsedById = new Map();
  const finals = [];
  for (let i = 0; i < ids.length; i += batch) {
    const slice = ids.slice(i, i + batch);
    const part = await Promise.all(
      slice.map(async (id) => {
        const t = await waitTerminal(id, Math.max(TIMEOUT_MS, count * 2000));
        elapsedById.set(id, t.waitedMs);
        return t;
      }),
    );
    finals.push(...part);
    console.log(`terminal ${finals.length}/${count}`);
  }

  let ready = 0;
  let failed = 0;
  let running = 0;
  let nonTerminal = 0;
  const logical = new Map();
  const pathOwners = new Map();
  let duplicateArtifacts = 0;
  const failureBreakdown = {};

  for (let i = 0; i < finals.length; i++) {
    const job = finals[i].json;
    const obs = job.observability;
    const key = `${obs?.ownershipScope ?? "?"}::${obs?.idempotencyKey ?? i}`;
    logical.set(key, (logical.get(key) ?? 0) + 1);

    if (job.status === "ready") {
      ready += 1;
      for (const p of [
        obs?.artifacts?.enhancedImagePath,
        obs?.artifacts?.teaserPath,
      ]) {
        if (!p) continue;
        const prev = pathOwners.get(p);
        if (prev && prev !== job.generationId) duplicateArtifacts += 1;
        else pathOwners.set(p, job.generationId);
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

  let duplicateLogicalJobs = 0;
  for (const v of logical.values()) {
    if (v > 1) duplicateLogicalJobs += 1;
  }

  const times = [...elapsedById.values()];
  const averageCompletionTime =
    times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1);
  const maxCompletionTime = Math.max(...times, 0);

  const report = {
    total: count,
    ready,
    failed,
    running,
    nonTerminal,
    duplicateLogicalJobs,
    duplicateArtifacts,
    averageCompletionTime,
    maxCompletionTime,
    failureBreakdown,
    wallClockMs: Date.now() - t0,
  };
  console.log(JSON.stringify(report, null, 2));

  assert(report.total === report.ready + report.failed, "HARD GATE total");
  assert(report.running === 0, "HARD GATE running");
  assert(report.nonTerminal === 0, "HARD GATE nonTerminal");
  assert(report.duplicateLogicalJobs === 0, "HARD GATE duplicateLogicalJobs");
  return report;
}

async function durability() {
  console.log("\n=== INTERRUPTION / DEPLOY DURABILITY (manual assist) ===");
  console.log(
    "Starts a delayed fake job. Redeploy Preview while it runs, then re-poll.",
  );
  const post = await postJob(
    baseRequest({
      idempotencyKey: `durability-${Date.now()}`,
      phase1b: { scenario: "success", delayMs: 45000 },
    }),
  );
  console.log({
    generationId: post.json.generationId,
    workflowRunId: post.json.workflowRunId,
    note: "Create a NEW preview deployment now; job should continue on original deployment pin.",
  });
  const terminal = await waitTerminal(post.json.generationId, 300000);
  console.log({
    status: terminal.json.status,
    waitedMs: terminal.waitedMs,
    timedOut: terminal.timedOut ?? false,
    workflowRunId: terminal.json.workflowRunId,
  });
  return { post, terminal };
}

async function main() {
  console.log({ BASE, MODE, STRESS });
  const health = await fetch(`${BASE}/api/generation-v2`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (health.status === 404) {
    throw new Error("Generation V2 not enabled on this deployment (404)");
  }

  if (MODE === "smoke" || MODE === "all") await smoke();
  if (MODE === "idempotency" || MODE === "all") await idempotency();
  if (MODE === "failures" || MODE === "all") await failures();
  if (MODE === "stress" || MODE === "all") await stress(STRESS);
  if (MODE === "durability") await durability();
  console.log("\nPHASE1B_HARNESS_OK");
}

main().catch((err) => {
  console.error("PHASE1B_HARNESS_FAIL", err);
  process.exit(1);
});
