/**
 * Zero-cost production smoke test for reveal-video diagnostics.
 * Usage: node scripts/smoke-reveal-probe-production.mjs [baseUrl]
 *
 * IMPORTANT: SSR HTML saying ACTIVE is not enough. This test also verifies:
 * - the client JS bundle inlined the probe flag (not a runtime process.env read)
 * - after hydration in a mobile browser profile, the DOM still says ACTIVE
 */
import { chromium, devices } from "playwright";

const baseUrl = (process.argv[2] ?? "https://www.metaprom.com").replace(/\/$/, "");
const apiUrl = `${baseUrl}/api/diagnostics/reveal-video`;
const probePageUrl = `${baseUrl}/debug/reveal-video-probe`;
const sessionId = `smoke_${Date.now()}`;

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const results = {
  baseUrl,
  deploymentCheckedAt: new Date().toISOString(),
  steps: {},
};

console.log(`Smoke test against ${baseUrl}`);

const getHealth = await fetch(apiUrl, { method: "GET" });
results.steps.getHealth = {
  status: getHealth.status,
  body: await readJson(getHealth),
  deploymentHeader:
    getHealth.headers.get("x-vercel-id") ||
    getHealth.headers.get("x-vercel-deployment-url") ||
    null,
};

const syntheticEvent = {
  sessionId,
  event: "probe_mount",
  ts: Date.now(),
  detail: "synthetic-smoke-test",
  userAgent: "metaprom-smoke-reveal-probe/1.0",
};

const postSynthetic = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(syntheticEvent),
});
results.steps.postSynthetic = {
  status: postSynthetic.status,
  body: await readJson(postSynthetic),
};

let retrieved = null;
for (let attempt = 1; attempt <= 8; attempt += 1) {
  const getBySession = await fetch(
    `${apiUrl}?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );
  const body = await readJson(getBySession);
  retrieved = { attempt, status: getBySession.status, body };
  if (body.count > 0) break;
  await new Promise((resolve) => setTimeout(resolve, 750));
}
results.steps.getBySession = retrieved;

const probePage = await fetch(probePageUrl, {
  headers: { Accept: "text/html" },
});
const probeHtml = await probePage.text();
results.steps.probePage = {
  status: probePage.status,
  ssrActiveInHtml: probeHtml.includes('data-probe-client-status="active"'),
  ssrInactiveInHtml: probeHtml.includes('data-probe-client-status="inactive"'),
  containsDiagnosticsFetch: probeHtml.includes("/api/diagnostics/reveal-video"),
  xVercelId: probePage.headers.get("x-vercel-id"),
};

const jsChunkUrls = [
  ...probeHtml.matchAll(/\/_next\/static\/[^"' ]+\.js/g),
].map((match) => match[0]);
let bundleContainsProbePath = false;
let bundleProbeFlagInlined = false;
let bundleStillHasRuntimeEnvRead = false;
let bundleMatch = null;

for (const chunkPath of jsChunkUrls) {
  const chunkUrl = `${baseUrl}${chunkPath}`;
  const chunkResponse = await fetch(chunkUrl);
  if (!chunkResponse.ok) continue;
  const chunkText = await chunkResponse.text();
  if (!chunkText.includes("/api/diagnostics/reveal-video")) continue;

  bundleContainsProbePath = true;
  bundleMatch = chunkUrl;
  bundleStillHasRuntimeEnvRead = chunkText.includes(
    "env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE",
  );
  // After correct build-time inlining Turbopack collapses the flag to true (!0)
  // or replaces the env read with the literal "1".
  bundleProbeFlagInlined =
    /let [a-zA-Z_$][\w$]*=!0/.test(chunkText) ||
    chunkText.includes('"1"==="1"') ||
    chunkText.includes('===("1")') ||
    (!bundleStillHasRuntimeEnvRead &&
      (chunkText.includes('="1"') || chunkText.includes("ACTIVE")));
  break;
}

results.steps.bundle = {
  bundleContainsProbePath,
  bundleProbeFlagInlined,
  bundleStillHasRuntimeEnvRead,
  bundleMatch,
};

// Post-hydration check in a real mobile browser profile (the previous false positive).
let hydrated = {
  status: "skipped",
  clientStatus: null,
  hydratedStatus: null,
  text: null,
  error: null,
};
try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "es-MX",
  });
  const page = await context.newPage();
  await page.goto(probePageUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("[data-probe-client-status]", { timeout: 15000 });
  // Allow hydration / useEffect to settle.
  await page.waitForTimeout(1500);
  hydrated = {
    status: "ok",
    clientStatus: await page.getAttribute(
      "[data-probe-client-status]",
      "data-probe-client-status",
    ),
    hydratedStatus: await page.getAttribute(
      "[data-probe-client-status]",
      "data-probe-hydrated",
    ),
    flag: await page.getAttribute(
      "[data-probe-client-status]",
      "data-probe-flag",
    ),
    deployment: await page.getAttribute(
      "[data-probe-client-status]",
      "data-probe-deployment",
    ),
    text: await page.locator("[data-probe-client-status]").innerText(),
    error: null,
  };
  await browser.close();
} catch (error) {
  hydrated = {
    status: "error",
    clientStatus: null,
    hydratedStatus: null,
    text: null,
    error: error instanceof Error ? error.message : String(error),
  };
}
results.steps.hydratedMobile = hydrated;

results.pass =
  results.steps.getHealth.status === 200 &&
  results.steps.getHealth.body?.status === "ok" &&
  results.steps.getHealth.body?.probeBuildEnabled === true &&
  results.steps.postSynthetic.status === 200 &&
  results.steps.postSynthetic.body?.ok === true &&
  results.steps.getBySession?.status === 200 &&
  results.steps.getBySession?.body?.count >= 1 &&
  results.steps.probePage.status === 200 &&
  results.steps.probePage.ssrActiveInHtml === true &&
  bundleContainsProbePath === true &&
  bundleProbeFlagInlined === true &&
  bundleStillHasRuntimeEnvRead === false &&
  hydrated.status === "ok" &&
  hydrated.clientStatus === "active" &&
  hydrated.hydratedStatus === "active" &&
  typeof hydrated.text === "string" &&
  hydrated.text.includes("ACTIVE");

console.log(JSON.stringify(results, null, 2));
process.exitCode = results.pass ? 0 : 1;
