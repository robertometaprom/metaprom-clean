/**
 * Verifies Advertising Image hard entitlement gate (Test Mode / service role).
 *
 * Covers:
 * 1. zero balance + new standalone image → BLOCKED (RPC insufficient)
 * 2. balance 1 + new standalone image → consumes 1
 * 3. resulting balance → 0
 * 4. same asset_id refine/retry → no second debit
 * 5. another new asset at balance 0 → BLOCKED
 * 6. commercial balance untouched
 * 7. no negative balances
 * 8. concurrent last-unit race → only one debit
 * 9. shouldBillAdvertisingAsset commercial vs standalone discrimination
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

function pass(name, detail = "") {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  process.exitCode = 1;
}

/** Mirror of lib/entitlements/advertising-image-gate.ts (kept in sync for script). */
function shouldBillAdvertisingAsset(input) {
  if (typeof input.billAdvertisingAsset === "boolean") {
    return input.billAdvertisingAsset;
  }
  if (typeof input.hasTeaserVideo === "boolean") {
    return !input.hasTeaserVideo;
  }
  return !input.teaserVideoBlob;
}

// --- Gate discrimination (no DB) ---
if (
  shouldBillAdvertisingAsset({ billAdvertisingAsset: false, teaserVideoBlob: null }) ===
  false
) {
  pass("gate_commercial_explicit_false");
} else {
  fail("gate_commercial_explicit_false");
}

if (
  shouldBillAdvertisingAsset({ billAdvertisingAsset: true }) === true
) {
  pass("gate_standalone_explicit_true");
} else {
  fail("gate_standalone_explicit_true");
}

if (shouldBillAdvertisingAsset({ hasTeaserVideo: true }) === false) {
  pass("gate_infer_teaser_is_commercial");
} else {
  fail("gate_infer_teaser_is_commercial");
}

if (shouldBillAdvertisingAsset({ hasTeaserVideo: false }) === true) {
  pass("gate_infer_image_only_is_advertising");
} else {
  fail("gate_infer_image_only_is_advertising");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail("env", "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: assets, error: assetsError } = await admin
  .from("assets")
  .select("id, project_id, image_path")
  .not("image_path", "is", null)
  .limit(3);

if (assetsError || !assets || assets.length < 2) {
  fail(
    "sample_assets",
    assetsError?.message ??
      `Need >= 2 finished assets with image_path (found ${assets?.length ?? 0})`,
  );
  process.exit(1);
}

const assetA = assets[0];
const assetB = assets[1];

const { data: project, error: projectError } = await admin
  .from("projects")
  .select("id, user_id")
  .eq("id", assetA.project_id)
  .maybeSingle();

if (projectError || !project?.user_id) {
  fail("sample_project", projectError?.message ?? "Project/user missing");
  process.exit(1);
}

const userId = project.user_id;
pass("sample_assets", `A=${assetA.id} B=${assetB.id} user=${userId}`);

const { data: beforeBalances } = await admin
  .from("entitlement_balances")
  .select("commercials_remaining, advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();

const commercialsBefore = beforeBalances?.commercials_remaining ?? 0;

// Force advertising balance to exactly 0 for blocked tests.
await admin.from("entitlement_balances").upsert({
  user_id: userId,
  commercials_remaining: commercialsBefore,
  advertising_assets_remaining: 0,
});

// Clear prior consumes for test assets.
for (const asset of [assetA, assetB]) {
  await admin
    .from("entitlement_ledger")
    .delete()
    .eq("asset_id", asset.id)
    .eq("entry_type", "consume")
    .eq("entitlement_kind", "advertising_asset");
}

// 1. zero balance + new standalone → BLOCKED
const blocked0 = await admin.rpc("consume_advertising_asset_on_first_persist", {
  p_user_id: userId,
  p_asset_id: assetA.id,
  p_metadata: { verifyHardGate: true, step: "zero_block" },
});
if (
  blocked0.error &&
  (blocked0.error.message.toLowerCase().includes("insufficient") ||
    blocked0.error.code === "P0001")
) {
  pass("1_zero_balance_blocked");
} else {
  fail(
    "1_zero_balance_blocked",
    blocked0.error?.message ?? `unexpected data=${blocked0.data}`,
  );
}

const { data: afterBlock0 } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();
if ((afterBlock0?.advertising_assets_remaining ?? 0) !== 0) {
  fail("7_no_negative_after_block", String(afterBlock0?.advertising_assets_remaining));
} else {
  pass("7_no_negative_after_block", "0");
}

// Grant exactly 1 via synthetic purchase.
const marker = `verify-hard-gate-${Date.now()}`;
const { data: purchase, error: purchaseError } = await admin
  .from("purchases")
  .insert({
    user_id: userId,
    asset_id: null,
    product_id: "assets_10",
    amount_mxn: 99,
    currency: "MXN",
    status: "completed",
    provider: "mock",
    provider_reference: marker,
    payment_method: "card",
    metadata: { verifyHardGate: true, marker },
    completed_at: new Date().toISOString(),
  })
  .select("id")
  .single();

if (purchaseError || !purchase) {
  fail("purchase_insert", purchaseError?.message ?? "no purchase");
  process.exit(1);
}

const grant = await admin.rpc("grant_package_entitlement", {
  p_user_id: userId,
  p_purchase_id: purchase.id,
  p_product_id: "assets_10",
  p_entitlement_kind: "advertising_asset",
  p_quantity: 1,
  p_metadata: { verifyHardGate: true },
});
if (grant.error || grant.data !== true) {
  fail("grant_one", grant.error?.message ?? String(grant.data));
  process.exit(1);
}

await admin
  .from("entitlement_balances")
  .update({ advertising_assets_remaining: 1 })
  .eq("user_id", userId);

const { data: bal1 } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining, commercials_remaining")
  .eq("user_id", userId)
  .maybeSingle();

if ((bal1?.advertising_assets_remaining ?? 0) !== 1) {
  fail("setup_balance_1", String(bal1?.advertising_assets_remaining));
  process.exit(1);
}
pass("setup_balance_1");

// 2 + 3. balance 1 → consume succeeds → balance 0
const consume1 = await admin.rpc("consume_advertising_asset_on_first_persist", {
  p_user_id: userId,
  p_asset_id: assetA.id,
  p_metadata: { verifyHardGate: true, step: "consume_one" },
});
if (consume1.error || consume1.data !== true) {
  fail("2_consume_with_balance", consume1.error?.message ?? String(consume1.data));
  process.exit(1);
}
pass("2_consume_with_balance");

const { data: balAfter } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining, commercials_remaining")
  .eq("user_id", userId)
  .maybeSingle();

if ((balAfter?.advertising_assets_remaining ?? -1) !== 0) {
  fail("3_balance_is_zero", String(balAfter?.advertising_assets_remaining));
} else {
  pass("3_balance_is_zero");
}

// 4. same asset refine/retry → no second debit
const consumeRetry = await admin.rpc(
  "consume_advertising_asset_on_first_persist",
  {
    p_user_id: userId,
    p_asset_id: assetA.id,
    p_metadata: { verifyHardGate: true, step: "refine_same_asset" },
  },
);
if (consumeRetry.error || consumeRetry.data !== false) {
  fail(
    "4_same_asset_no_second_debit",
    consumeRetry.error?.message ?? String(consumeRetry.data),
  );
} else {
  pass("4_same_asset_no_second_debit");
}

const { data: balRetry } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();
if ((balRetry?.advertising_assets_remaining ?? -1) !== 0) {
  fail("4_balance_unchanged", String(balRetry?.advertising_assets_remaining));
} else {
  pass("4_balance_unchanged");
}

// 5. another new asset at balance 0 → BLOCKED
const blockedNew = await admin.rpc("consume_advertising_asset_on_first_persist", {
  p_user_id: userId,
  p_asset_id: assetB.id,
  p_metadata: { verifyHardGate: true, step: "new_at_zero" },
});
if (
  blockedNew.error &&
  (blockedNew.error.message.toLowerCase().includes("insufficient") ||
    blockedNew.error.code === "P0001")
) {
  pass("5_new_standalone_at_zero_blocked");
} else {
  fail(
    "5_new_standalone_at_zero_blocked",
    blockedNew.error?.message ?? `unexpected data=${blockedNew.data}`,
  );
}

// 6. commercial untouched
const { data: balCommercial } = await admin
  .from("entitlement_balances")
  .select("commercials_remaining, advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();

if ((balCommercial?.commercials_remaining ?? 0) !== commercialsBefore) {
  fail(
    "6_commercial_untouched",
    `${commercialsBefore} -> ${balCommercial?.commercials_remaining}`,
  );
} else {
  pass("6_commercial_untouched", String(commercialsBefore));
}

if ((balCommercial?.advertising_assets_remaining ?? 0) < 0) {
  fail("7_no_negative_final", String(balCommercial?.advertising_assets_remaining));
} else {
  pass("7_no_negative_final", String(balCommercial?.advertising_assets_remaining));
}

// 8. concurrent last entitlement — reset to 1, clear consumes on A+B, race both
await admin
  .from("entitlement_ledger")
  .delete()
  .eq("asset_id", assetA.id)
  .eq("entry_type", "consume")
  .eq("entitlement_kind", "advertising_asset");
await admin
  .from("entitlement_ledger")
  .delete()
  .eq("asset_id", assetB.id)
  .eq("entry_type", "consume")
  .eq("entitlement_kind", "advertising_asset");

await admin
  .from("entitlement_balances")
  .update({ advertising_assets_remaining: 1 })
  .eq("user_id", userId);

const [raceA, raceB] = await Promise.all([
  admin.rpc("consume_advertising_asset_on_first_persist", {
    p_user_id: userId,
    p_asset_id: assetA.id,
    p_metadata: { verifyHardGate: true, step: "race_a" },
  }),
  admin.rpc("consume_advertising_asset_on_first_persist", {
    p_user_id: userId,
    p_asset_id: assetB.id,
    p_metadata: { verifyHardGate: true, step: "race_b" },
  }),
]);

const aOk = !raceA.error && raceA.data === true;
const bOk = !raceB.error && raceB.data === true;
const aBlocked =
  raceA.error &&
  (raceA.error.message.toLowerCase().includes("insufficient") ||
    raceA.error.code === "P0001");
const bBlocked =
  raceB.error &&
  (raceB.error.message.toLowerCase().includes("insufficient") ||
    raceB.error.code === "P0001");

const winners = Number(aOk) + Number(bOk);
const losers = Number(aBlocked) + Number(bBlocked);

if (winners === 1 && losers === 1) {
  pass("8_concurrent_last_unit", `winner=${aOk ? "A" : "B"}`);
} else {
  fail(
    "8_concurrent_last_unit",
    `aOk=${aOk} bOk=${bOk} aBlocked=${aBlocked} bBlocked=${bBlocked} aErr=${raceA.error?.message} bErr=${raceB.error?.message}`,
  );
}

const { data: balRace } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();

if ((balRace?.advertising_assets_remaining ?? -1) !== 0) {
  fail("8_race_balance_zero", String(balRace?.advertising_assets_remaining));
} else {
  pass("8_race_balance_zero");
}

console.log("\nHard-gate verification complete.");
console.log(
  "Note: Commercial UI callers pass billAdvertisingAsset:false so studio commercial persist is not gated.",
);
