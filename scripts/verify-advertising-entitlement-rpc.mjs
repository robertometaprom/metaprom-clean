/**
 * Verifies grant + advertising-image consume idempotency against Supabase (service role).
 * Uses an existing asset when available; does not create studio media.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail("env", "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: asset, error: assetError } = await admin
  .from("assets")
  .select("id, project_id, image_path")
  .not("image_path", "is", null)
  .limit(1)
  .maybeSingle();

if (assetError || !asset) {
  fail("sample_asset", assetError?.message ?? "No finished asset with image_path found");
  process.exit(1);
}

const { data: project, error: projectError } = await admin
  .from("projects")
  .select("id, user_id")
  .eq("id", asset.project_id)
  .maybeSingle();

if (projectError || !project?.user_id) {
  fail("sample_project", projectError?.message ?? "Project/user missing");
  process.exit(1);
}

const userId = project.user_id;
const assetId = asset.id;
pass("sample_asset", `asset=${assetId} user=${userId}`);

// Snapshot commercial balance to ensure image ops do not touch it.
const { data: beforeBalances } = await admin
  .from("entitlement_balances")
  .select("commercials_remaining, advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();

const commercialsBefore = beforeBalances?.commercials_remaining ?? 0;

// Ensure at least 1 advertising image unit via adjust-like grant using a synthetic purchase.
const marker = `verify-ad-image-${Date.now()}`;
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
    metadata: { verifyScript: true, marker },
    completed_at: new Date().toISOString(),
  })
  .select("id")
  .single();

if (purchaseError || !purchase) {
  fail("purchase_insert", purchaseError?.message ?? "no purchase");
  process.exit(1);
}
pass("purchase_insert", String(purchase.id));

const grant1 = await admin.rpc("grant_package_entitlement", {
  p_user_id: userId,
  p_purchase_id: purchase.id,
  p_product_id: "assets_10",
  p_entitlement_kind: "advertising_asset",
  p_quantity: 10,
  p_metadata: { verifyScript: true },
});
if (grant1.error) {
  fail("grant_once", grant1.error.message);
  process.exit(1);
}
if (grant1.data !== true) {
  fail("grant_once", `expected true, got ${grant1.data}`);
} else {
  pass("grant_once");
}

const grant2 = await admin.rpc("grant_package_entitlement", {
  p_user_id: userId,
  p_purchase_id: purchase.id,
  p_product_id: "assets_10",
  p_entitlement_kind: "advertising_asset",
  p_quantity: 10,
  p_metadata: { verifyScript: true },
});
if (grant2.error) {
  fail("grant_idempotent", grant2.error.message);
} else if (grant2.data !== false) {
  fail("grant_idempotent", `expected false on retry, got ${grant2.data}`);
} else {
  pass("grant_idempotent");
}

const { data: afterGrant } = await admin
  .from("entitlement_balances")
  .select("commercials_remaining, advertising_assets_remaining")
  .eq("user_id", userId)
  .maybeSingle();

const adsAfterGrant = afterGrant?.advertising_assets_remaining ?? 0;
const commercialsAfterGrant = afterGrant?.commercials_remaining ?? 0;

if (commercialsAfterGrant !== commercialsBefore) {
  fail(
    "commercial_untouched_after_grant",
    `${commercialsBefore} -> ${commercialsAfterGrant}`,
  );
} else {
  pass("commercial_untouched_after_grant", String(commercialsAfterGrant));
}

if (adsAfterGrant < 1) {
  fail("balance_after_grant", String(adsAfterGrant));
  process.exit(1);
}
pass("balance_after_grant", String(adsAfterGrant));

// Clear any prior consume for this asset so the test can run (test-only).
await admin
  .from("entitlement_ledger")
  .delete()
  .eq("asset_id", assetId)
  .eq("entry_type", "consume")
  .eq("entitlement_kind", "advertising_asset");

const consume1 = await admin.rpc("consume_advertising_asset_on_first_persist", {
  p_user_id: userId,
  p_asset_id: assetId,
  p_metadata: { verifyScript: true, pass: 1 },
});
if (consume1.error) {
  fail("consume_once", consume1.error.message);
  process.exit(1);
}
if (consume1.data !== true) {
  fail("consume_once", `expected true, got ${consume1.data}`);
} else {
  pass("consume_once");
}

const { data: midBalances } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining, commercials_remaining")
  .eq("user_id", userId)
  .maybeSingle();

const adsAfterConsume = midBalances?.advertising_assets_remaining ?? 0;
if (adsAfterConsume !== adsAfterGrant - 1) {
  fail("consume_decrements", `${adsAfterGrant} -> ${adsAfterConsume}`);
} else {
  pass("consume_decrements", String(adsAfterConsume));
}

const consume2 = await admin.rpc("consume_advertising_asset_on_first_persist", {
  p_user_id: userId,
  p_asset_id: assetId,
  p_metadata: { verifyScript: true, pass: 2 },
});
if (consume2.error) {
  fail("consume_idempotent", consume2.error.message);
} else if (consume2.data !== false) {
  fail("consume_idempotent", `expected false on retry, got ${consume2.data}`);
} else {
  pass("consume_idempotent");
}

const { data: endBalances } = await admin
  .from("entitlement_balances")
  .select("advertising_assets_remaining, commercials_remaining")
  .eq("user_id", userId)
  .maybeSingle();

if (
  (endBalances?.advertising_assets_remaining ?? 0) !== adsAfterConsume
) {
  fail(
    "consume_no_double_debit",
    `${adsAfterConsume} -> ${endBalances?.advertising_assets_remaining}`,
  );
} else {
  pass("consume_no_double_debit", String(endBalances?.advertising_assets_remaining));
}

if ((endBalances?.commercials_remaining ?? 0) !== commercialsBefore) {
  fail(
    "commercial_untouched_after_consume",
    `${commercialsBefore} -> ${endBalances?.commercials_remaining}`,
  );
} else {
  pass("commercial_untouched_after_consume", String(endBalances?.commercials_remaining));
}

console.log("\nRPC verification complete.");
