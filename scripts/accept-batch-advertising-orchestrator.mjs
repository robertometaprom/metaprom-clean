/**
 * Batch Multi-Photo Phase B — local acceptance (mock-safe, no provider credits).
 * Run: node scripts/accept-batch-advertising-orchestrator.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function assert(name, condition, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail || "assertion failed");
}

function readStudio(pathFromRoot) {
  return readFileSync(join(ROOT, pathFromRoot), "utf8");
}

const runner = `
import {
  runBatchAdvertisingImages,
  BatchInsufficientCreditsError,
  BATCH_ADVERTISING_CONCURRENCY,
} from "../lib/studio/batch-advertising-orchestrator.ts";

function makeFile(name, index = 0) {
  return new File([\`mock-bytes-\${name}-\${index}\`], name, {
    type: "image/jpeg",
    lastModified: 1_700_000_000_000 + index,
  });
}

const report = [];
function pass(name, detail) {
  report.push({ name, ok: true, detail: detail ?? "" });
}
function fail(name, detail) {
  report.push({ name, ok: false, detail: detail ?? "" });
}
function assert(name, condition, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail || "assertion failed");
}

let providerCalls = 0;
let persistCalls = 0;
const projectIds = new Set();
const assetIds = new Set();
const billFlags = [];
let maxProcessing = 0;
let currentProcessing = 0;
let failOnceId = null;
let assetIdReuseViolations = 0;

const createMock = async ({ file }) => {
  providerCalls += 1;
  currentProcessing += 1;
  maxProcessing = Math.max(maxProcessing, currentProcessing);
  await new Promise((r) => setTimeout(r, 30));
  currentProcessing -= 1;
  if (failOnceId && file.name === failOnceId) {
    failOnceId = null;
    throw new Error("forced mock failure");
  }
  return {
    premiumImage: \`data:image/png;base64,\${file.name}\`,
    imagePrompt: "prompt:" + file.name,
  };
};

let nextAsset = 1;
let createdProject = null;

const persistMock = async (input) => {
  persistCalls += 1;
  billFlags.push(input.billAdvertisingAsset === true);
  if (input.existingAssetId != null) {
    assetIdReuseViolations += 1;
  }

  if (input.existingProjectId) {
    createdProject = input.existingProjectId;
  } else if (!createdProject) {
    createdProject = "project-batch-1";
  }
  projectIds.add(createdProject);
  const assetId = "asset-" + nextAsset++;
  assetIds.add(assetId);
  // Simulate brief persist latency under concurrency.
  await new Promise((r) => setTimeout(r, 20));
  return {
    projectId: createdProject,
    assetId,
    shareSlug: null,
    status: "saved",
  };
};

const baseInput = {
  customerIntent: "optimiza para marketplace",
  productMode: "custom",
  projectMetadata: { workflow_id: "premium-image" },
};

// A. 3 photos, sufficient balance → queue starts
providerCalls = 0;
persistCalls = 0;
projectIds.clear();
assetIds.clear();
billFlags.length = 0;
maxProcessing = 0;
createdProject = null;
nextAsset = 1;

const filesA = [makeFile("a.jpg", 1), makeFile("b.jpg", 2), makeFile("c.jpg", 3)];
let started = false;
const resultA = await runBatchAdvertisingImages(
  {
    ...baseInput,
    files: filesA,
    onProgress: (p) => {
      if (p.phase === "running") started = true;
    },
  },
  {
    concurrency: 2,
    fetchBalances: async () => ({ advertisingAssetsRemaining: 10 }),
    createAdvertisingImage: createMock,
    persistCreationToLibrary: persistMock,
  },
);
assert("A queue starts with sufficient balance", started && resultA.phase === "complete", resultA.phase);
assert("A completed 3", resultA.completedCount === 3, String(resultA.completedCount));

// B. concurrency never > 2
assert("B concurrency <= 2", maxProcessing <= 2, "maxProcessing=" + maxProcessing);
assert("B default concurrency constant is 2", BATCH_ADVERTISING_CONCURRENCY === 2);

// C. 3 independent assets
assert("C three assets", assetIds.size === 3, String(assetIds.size));
assert("C three provider calls", providerCalls === 3, String(providerCalls));

// D. same projectId
assert("D one shared project", projectIds.size === 1, [...projectIds].join(","));

// E. each success bills advertising
assert(
  "E billAdvertisingAsset true per persist",
  billFlags.length === 3 && billFlags.every(Boolean),
  JSON.stringify(billFlags),
);
assert("E existingAssetId always null", assetIdReuseViolations === 0, String(assetIdReuseViolations));

// F. insufficient balance → zero provider
providerCalls = 0;
persistCalls = 0;
const resultF = await runBatchAdvertisingImages(
  {
    ...baseInput,
    files: [makeFile("f1.jpg", 1), makeFile("f2.jpg", 2), makeFile("f3.jpg", 3)],
  },
  {
    fetchBalances: async () => ({ advertisingAssetsRemaining: 1 }),
    createAdvertisingImage: createMock,
    persistCreationToLibrary: persistMock,
  },
);
assert("F blocked phase", resultF.phase === "blocked", resultF.phase);
assert("F zero provider", providerCalls === 0, String(providerCalls));
assert("F zero persist", persistCalls === 0, String(persistCalls));
assert(
  "F shortfall message",
  /Necesitas 2 créditos adicionales/.test(resultF.message),
  resultF.message,
);

// G. one forced failure → others continue
providerCalls = 0;
persistCalls = 0;
projectIds.clear();
assetIds.clear();
createdProject = null;
nextAsset = 1;
failOnceId = "fail-me.jpg";
const filesG = [
  makeFile("ok1.jpg", 1),
  makeFile("fail-me.jpg", 2),
  makeFile("ok2.jpg", 3),
];
const resultG = await runBatchAdvertisingImages(
  {
    ...baseInput,
    files: filesG,
  },
  {
    concurrency: 2,
    fetchBalances: async () => ({ advertisingAssetsRemaining: 10 }),
    createAdvertisingImage: createMock,
    persistCreationToLibrary: persistMock,
  },
);
assert("G completed 2", resultG.completedCount === 2, String(resultG.completedCount));
assert("G failed 1", resultG.failedCount === 1, String(resultG.failedCount));
assert("G shared project still one", projectIds.size === 1, [...projectIds].join(","));

// H. retry failed only — completed untouched
const completedBefore = resultG.items
  .filter((i) => i.status === "completed")
  .map((i) => i.assetId);
const providerBeforeRetry = providerCalls;
const resultH = await runBatchAdvertisingImages(
  {
    ...baseInput,
    files: filesG,
    existingItems: resultG.items,
    existingProjectId: resultG.projectId,
    onlyItemIds: resultG.items.filter((i) => i.status === "failed").map((i) => i.id),
  },
  {
    concurrency: 2,
    fetchBalances: async () => ({ advertisingAssetsRemaining: 5 }),
    createAdvertisingImage: createMock,
    persistCreationToLibrary: persistMock,
  },
);
const completedAfter = resultH.items
  .filter((i) => i.status === "completed")
  .map((i) => i.assetId);
assert(
  "H completed asset ids unchanged",
  completedBefore.every((id) => completedAfter.includes(id)),
  JSON.stringify({ completedBefore, completedAfter }),
);
assert(
  "H only one extra provider for retry",
  providerCalls === providerBeforeRetry + 1,
  String(providerCalls - providerBeforeRetry),
);
assert("H all completed after retry", resultH.completedCount === 3, String(resultH.completedCount));

// I. retry insufficient balance → zero provider
const failedOnly = resultH.items.map((item, idx) =>
  idx === 0
    ? { ...item, status: "failed", assetId: null, errorMessage: "x" }
    : item,
);
// Force one failed for retry preflight
failedOnly[2] = {
  ...failedOnly[2],
  status: "failed",
  assetId: null,
  premiumImage: null,
  errorMessage: "x",
};
const providerBeforeI = providerCalls;
const resultI = await runBatchAdvertisingImages(
  {
    ...baseInput,
    files: filesG,
    existingItems: failedOnly,
    existingProjectId: resultH.projectId,
    onlyItemIds: failedOnly.filter((i) => i.status === "failed").map((i) => i.id),
  },
  {
    fetchBalances: async () => ({ advertisingAssetsRemaining: 0 }),
    createAdvertisingImage: createMock,
    persistCreationToLibrary: persistMock,
  },
);
assert("I retry blocked", resultI.phase === "blocked", resultI.phase);
assert("I zero provider on blocked retry", providerCalls === providerBeforeI, String(providerCalls));

console.log(JSON.stringify(report));
`;

const tmpPath = join(ROOT, "scripts", ".tmp-batch-accept-runner.mts");
writeFileSync(tmpPath, runner, "utf8");

const proc = spawnSync("npx", ["tsx", tmpPath], {
  cwd: ROOT,
  encoding: "utf8",
  shell: true,
});

try {
  unlinkSync(tmpPath);
} catch {
  // ignore
}

if (proc.status !== 0) {
  fail("orchestrator mock suite", proc.stderr || proc.stdout || "tsx failed");
  console.error(proc.stdout);
  console.error(proc.stderr);
} else {
  const lines = (proc.stdout || "").trim().split("\n");
  const jsonLine = lines.reverse().find((line) => line.startsWith("["));
  if (!jsonLine) {
    fail("orchestrator mock suite", "no JSON report");
    console.error(proc.stdout);
  } else {
    const report = JSON.parse(jsonLine);
    for (const item of report) {
      if (item.ok) pass(item.name, item.detail);
      else fail(item.name, item.detail);
    }
  }
}

// Structural / source checks for J–M (no provider)
const director = readStudio("components/studio/CreativeDirector.tsx");
const orchestrator = readStudio("lib/studio/batch-advertising-orchestrator.ts");
const continuity = readStudio("lib/studio/advertising-generate-continuity.ts");

assert(
  "J single-image path still early-returns batch to orchestrator only when length>1",
  director.includes("sourceFilesRef.current.length > 1") &&
    director.includes('mode === "advertising_image"') &&
    director.includes("await runBatchCreation()") &&
    director.includes("createAdvertisingImage({") &&
    director.includes("const file = sourceFilesRef.current[0]"),
);

assert(
  "J single-image still uses createAdvertisingImage + persistToLibrary",
  /if \(isAdvertising\) \{[\s\S]*createAdvertisingImage\(\{[\s\S]*persistToLibrary\(\{/.test(
    director,
  ),
);

assert(
  "K commercial multi-photo remains blocked",
  director.includes("COMMERCIAL_BATCH_BLOCKED_MESSAGE") &&
    director.includes('mode === "commercial"') &&
    director.includes(
      '(isBatchSelection && creationMode !== "advertising_image")',
    ),
);

assert(
  "L anonymous batch requires auth before provider",
  /const runBatchCreation = useCallback\([\s\S]*if \(!isAuthenticated\) \{\s*await requestAuthenticationForGenerate\(\);/.test(
    director,
  ),
);

assert(
  "M post-auth missing File[] requires re-select",
  continuity.includes("batchExpectedCount") &&
    director.includes("BATCH_RESELECT_MESSAGE") &&
    director.includes("enforceBatchReselectIfNeeded") &&
    director.includes("batchExpectedCount > 1"),
);

assert(
  "orchestrator never reuses existingAssetId",
  /existingAssetId:\s*null/.test(orchestrator) &&
    orchestrator.includes("billAdvertisingAsset: true"),
);

assert(
  "orchestrator concurrency constant 2",
  orchestrator.includes("BATCH_ADVERTISING_CONCURRENCY = 2"),
);

assert(
  "welcome grant logic untouched (no batch multiply in welcome route)",
  !readStudio("app/api/entitlements/welcome-advertising-image/route.ts").includes(
    "batch",
  ),
);

const failed = results.filter((r) => !r.ok);
console.log(
  `\n=== Batch Phase B acceptance: ${results.length - failed.length}/${results.length} passed ===\n`,
);
process.exit(failed.length ? 1 : 0);
