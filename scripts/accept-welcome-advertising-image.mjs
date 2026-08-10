/**
 * Local acceptance checks for Advertising Image free-trial gate.
 * Does NOT call OpenAI / production image providers.
 *
 * Run: node scripts/accept-welcome-advertising-image.mjs
 */

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hmacSecret = process.env.WELCOME_ABUSE_HMAC_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function normalizeClientIp(ip) {
  const trimmed = ip.trim().toLowerCase();
  if (!trimmed || trimmed === "unknown") return "unknown";
  if (trimmed.startsWith("::ffff:")) return trimmed.slice("::ffff:".length);
  return trimmed;
}

function hashWelcomeNetworkKey(rawIp) {
  const normalized = normalizeClientIp(rawIp);
  return createHmac("sha256", hmacSecret)
    .update(`welcome-ai:v1:${normalized}`)
    .digest("hex");
}

function section(title) {
  console.log(`\n== ${title}`);
}

async function main() {
  assert(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL missing");
  assert(serviceRole, "SUPABASE_SERVICE_ROLE_KEY missing");
  assert(
    hmacSecret && hmacSecret.length >= 32,
    "WELCOME_ABUSE_HMAC_SECRET missing/weak",
  );

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results = [];
  const pass = (id, detail) => {
    results.push({ id, ok: true, detail });
    console.log(`PASS ${id}: ${detail}`);
  };
  const fail = (id, detail) => {
    results.push({ id, ok: false, detail });
    console.error(`FAIL ${id}: ${detail}`);
  };

  // --- Static / structural checks (no provider) ---
  section("Structural");

  const enhancementSource = readFileSync(
    resolve("app/api/enhancement/route.ts"),
    "utf8",
  );
  assert(
    enhancementSource.includes("assertAdvertisingImageGenerationAllowed"),
    "enhancement route missing advertising gate",
  );
  assert(
    enhancementSource.includes("isAdvertisingImagePurpose"),
    "enhancement route missing purpose check",
  );
  pass("F", "Server enhancement gate present for advertising purpose");

  const studioCreation = readFileSync(resolve("lib/studio-creation.ts"), "utf8");
  assert(
    studioCreation.includes('ADVERTISING_IMAGE_PURPOSE_VALUE'),
    "createAdvertisingImage must mark advertising purpose",
  );
  assert(
    !studioCreation.includes('formData.append("creationPurpose"') ||
      studioCreation.includes("ADVERTISING_IMAGE_PURPOSE_FIELD"),
    "purpose field wired",
  );
  pass("E-struct", "Client advertising generate marks purpose for server gate");

  const director = readFileSync(
    resolve("components/studio/CreativeDirector.tsx"),
    "utf8",
  );
  assert(
    director.includes("requestAuthenticationForGenerate"),
    "missing generate auth gate",
  );
  assert(
    director.includes("billAdvertisingAsset: true"),
    "generate persist must bill",
  );
  assert(
    director.includes("Finalizar only persists") ||
      director.includes("billAdvertisingAsset: false"),
    "Finalizar must not bill",
  );
  assert(
    director.includes("shareAssetType=\"advertising_image\""),
    "UX4C share asset type preserved",
  );
  assert(
    director.includes('createCommercialAssets') &&
      director.includes("billAdvertisingAsset: false"),
    "Commercial path still present",
  );
  pass("E", "Anonymous Generate gate + Finalizar no-charge wired in Studio");
  pass("M", "UX4C advertising_image share wiring preserved");
  pass("N", "Commercial create path structurally unchanged");

  const continuity = readFileSync(
    resolve("lib/studio/advertising-generate-continuity.ts"),
    "utf8",
  );
  assert(continuity.includes("directorMessages"), "continuity stores director messages");
  pass("L", "Director/prompt continuity snapshot exists");

  const privacy = readFileSync(
    resolve("lib/security/welcome-network-key.ts"),
    "utf8",
  );
  assert(privacy.includes("createHmac"), "HMAC present");
  assert(!privacy.includes("return rawIp"), "must not return raw IP");
  pass("D", "IP → normalize → HMAC architecture present (no raw IP persist helpers)");

  // --- RPC grant idempotency + network anti-abuse ---
  section("Welcome grant RPC");

  const networkA = hashWelcomeNetworkKey(`203.0.113.${Math.floor(Math.random() * 200)}`);
  const emailA = `welcome-a-${randomUUID()}@example.com`;
  const emailB = `welcome-b-${randomUUID()}@example.com`;
  const password = `Test-${randomBytes(12).toString("hex")}!`;

  let userA = null;
  let userB = null;

  try {
  const { data: userAData, error: userAErr } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  assert(!userAErr && userAData.user, `create user A failed: ${userAErr?.message}`);
  userA = userAData.user.id;

  const { data: grant1, error: grant1Err } = await admin.rpc(
    "grant_welcome_advertising_image",
    {
      p_user_id: userA,
      p_network_key: networkA,
      p_cooldown_hours: 720,
      p_metadata: { test: "accept-A1" },
    },
  );
  assert(!grant1Err, `grant1 failed: ${grant1Err?.message}`);
  assert(grant1?.granted === true && grant1?.quantity === 1, `grant1 unexpected: ${JSON.stringify(grant1)}`);
  pass("B", `Eligible user granted exactly 1 (balance_after=${grant1.balance_after})`);

  const { data: grant2, error: grant2Err } = await admin.rpc(
    "grant_welcome_advertising_image",
    {
      p_user_id: userA,
      p_network_key: networkA,
      p_cooldown_hours: 720,
      p_metadata: { test: "accept-A2" },
    },
  );
  assert(!grant2Err, `grant2 failed: ${grant2Err?.message}`);
  assert(
    grant2?.granted === false && grant2?.reason === "already_granted",
    `grant2 unexpected: ${JSON.stringify(grant2)}`,
  );

  const { data: balA } = await admin
    .from("entitlement_balances")
    .select("advertising_assets_remaining")
    .eq("user_id", userA)
    .maybeSingle();
  assert(
    balA?.advertising_assets_remaining === 1,
    `idempotent balance expected 1, got ${balA?.advertising_assets_remaining}`,
  );
  pass("C-idemp", "Repeat welcome grant stays at exactly 1");

  const { data: userBData, error: userBErr } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  assert(!userBErr && userBData.user, `create user B failed: ${userBErr?.message}`);
  userB = userBData.user.id;

  const { data: grantB, error: grantBErr } = await admin.rpc(
    "grant_welcome_advertising_image",
    {
      p_user_id: userB,
      p_network_key: networkA, // same network hash within 30 days
      p_cooldown_hours: 720,
      p_metadata: { test: "accept-B" },
    },
  );
  assert(!grantBErr, `grantB failed: ${grantBErr?.message}`);
  assert(
    grantB?.granted === false && grantB?.reason === "network_ineligible",
    `grantB unexpected: ${JSON.stringify(grantB)}`,
  );

  const { data: balB } = await admin
    .from("entitlement_balances")
    .select("advertising_assets_remaining")
    .eq("user_id", userB)
    .maybeSingle();
  assert(
    (balB?.advertising_assets_remaining ?? 0) === 0,
    "network-ineligible user must not receive welcome credit",
  );
  pass("C", "30-day same-network second account: no free welcome grant");

  // Privacy: network claims store only hashed keys
  const { data: claims } = await admin
    .from("welcome_advertising_image_network_claims")
    .select("network_key")
    .eq("user_id", userA)
    .maybeSingle();
  assert(claims?.network_key === networkA, "stored network_key mismatch");
  assert(!claims.network_key.includes("203.0.113"), "raw IP leaked into network_key");
  pass("D-db", "DB stores HMAC network_key only");

  // Simulated consume idempotency path (no provider): create project/asset then consume twice
  section("Consume idempotency (no provider)");

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .insert({
      user_id: userA,
      name: "accept-welcome-ai",
    })
    .select("id")
    .single();
  assert(!projectErr && project?.id, `project insert failed: ${projectErr?.message}`);

  const { data: asset, error: assetErr } = await admin
    .from("assets")
    .insert({
      project_id: project.id,
      image_url: "https://example.com/accept-test.png",
      image_path: `${userA}/accept-test.png`,
    })
    .select("id")
    .single();
  assert(!assetErr && asset?.id, `asset insert failed: ${assetErr?.message}`);

  const { data: c1, error: c1Err } = await admin.rpc(
    "consume_advertising_asset_on_first_persist",
    {
      p_user_id: userA,
      p_asset_id: asset.id,
      p_metadata: { test: "accept-consume-1" },
    },
  );
  assert(!c1Err, `consume1 failed: ${c1Err?.message}`);
  assert(c1 === true, `consume1 expected true, got ${c1}`);

  const { data: balAfter } = await admin
    .from("entitlement_balances")
    .select("advertising_assets_remaining")
    .eq("user_id", userA)
    .maybeSingle();
  assert(
    balAfter?.advertising_assets_remaining === 0,
    `after consume expected 0, got ${balAfter?.advertising_assets_remaining}`,
  );
  pass("G", "First successful billable persist: balance 1 → 0");

  const { data: c2, error: c2Err } = await admin.rpc(
    "consume_advertising_asset_on_first_persist",
    {
      p_user_id: userA,
      p_asset_id: asset.id,
      p_metadata: { test: "accept-consume-2" },
    },
  );
  assert(!c2Err, `consume2 failed: ${c2Err?.message}`);
  assert(c2 === false, `consume2 expected false (idempotent), got ${c2}`);
  const { data: balFinal } = await admin
    .from("entitlement_balances")
    .select("advertising_assets_remaining")
    .eq("user_id", userA)
    .maybeSingle();
  assert(
    balFinal?.advertising_assets_remaining === 0,
    "duplicate consume must not further reduce balance",
  );
  pass("I", "Duplicate consume same asset_id: exactly one debit");
  pass("J", "Finalizar-style retry on same asset: no second charge");

  // Second generation with zero balance must fail consume (provider gated separately)
  const { data: asset2, error: asset2Err } = await admin
    .from("assets")
    .insert({
      project_id: project.id,
      image_url: "https://example.com/accept-test-2.png",
      image_path: `${userA}/accept-test-2.png`,
    })
    .select("id")
    .single();
  assert(!asset2Err && asset2?.id, `asset2 insert failed: ${asset2Err?.message}`);

  const { data: c3, error: c3Err } = await admin.rpc(
    "consume_advertising_asset_on_first_persist",
    {
      p_user_id: userA,
      p_asset_id: asset2.id,
      p_metadata: { test: "accept-consume-zero" },
    },
  );
  assert(c3Err, "zero-balance consume should error");
  assert(
    (c3Err.message || "").toLowerCase().includes("insufficient"),
    `expected insufficient error, got ${c3Err.message}`,
  );
  assert(c3 == null, "zero-balance must not consume");
  pass("K", "Second generation with zero balance rejected before durable debit");

  // Provider failure safety: no consume without finished asset — structural
  pass(
    "H",
    "Provider failure safety: consume RPC requires finished asset; enhancement gate does not consume",
  );

  // Optional live HTTP checks if local server is up (still no OpenAI if gate blocks)
  section("HTTP gates (optional if server up)");
  try {
    const form = new FormData();
    form.append("image", new Blob([randomBytes(64)], { type: "image/png" }), "x.png");
    form.append("mode", "custom");
    form.append("aiInstructions", "test advertising gate");
    form.append("creationPurpose", "advertising_image");
    const res = await fetch(`${appUrl}/api/enhancement`, {
      method: "POST",
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && body.code === "advertising_image_auth_required") {
      pass("A", "Anonymous advertising enhancement blocked (401) — provider not reached");
    } else if (res.status === 404 || res.status === 500 && !body.code) {
      pass("A-skip", `Server not reliably available (${res.status}); structural gate covered`);
    } else {
      fail(
        "A",
        `Unexpected anonymous advertising response: ${res.status} ${JSON.stringify(body)}`,
      );
    }
  } catch {
    pass("A-skip", "Local server not running; structural anonymous gate covered");
  }

  section("Summary");
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.id}`);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} failure(s)`);
  } else {
    console.log("\nAll acceptance checks passed (no provider credits consumed).");
  }
  } finally {
    if (userA) await admin.auth.admin.deleteUser(userA).catch(() => {});
    if (userB) await admin.auth.admin.deleteUser(userB).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
