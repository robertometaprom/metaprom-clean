/**
 * Stripe Test Mode verification for Imágenes Publicitarias packages.
 * Does not complete a live/card payment — validates prices + Checkout session creation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

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

const PACKAGES = [
  { id: "assets_10", env: "STRIPE_PRICE_ID_ASSETS_10", amount: 9900 },
  { id: "assets_25", env: "STRIPE_PRICE_ID_ASSETS_25", amount: 19900 },
  { id: "assets_50", env: "STRIPE_PRICE_ID_ASSETS_50", amount: 34900 },
  { id: "assets_100", env: "STRIPE_PRICE_ID_ASSETS_100", amount: 59900 },
];

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret?.startsWith("sk_test_")) {
    fail("stripe_test_key", "STRIPE_SECRET_KEY must be sk_test_...");
    process.exit(1);
  }
  pass("stripe_test_key");

  if (process.env.PAYMENT_PROVIDER !== "stripe") {
    fail("payment_provider", `expected stripe, got ${process.env.PAYMENT_PROVIDER}`);
  } else {
    pass("payment_provider", "stripe");
  }

  const stripe = new Stripe(secret);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  for (const pkg of PACKAGES) {
    const priceId = process.env[pkg.env]?.trim();
    if (!priceId?.startsWith("price_")) {
      fail(`${pkg.id}_price_id`, `missing/invalid ${pkg.env}`);
      continue;
    }

    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      fail(`${pkg.id}_retrieve`, error.message);
      continue;
    }

    const checks = [
      ["test_mode", price.livemode === false],
      ["active", price.active === true],
      ["one_time", price.type === "one_time"],
      ["mxn", price.currency === "mxn"],
      ["amount", price.unit_amount === pkg.amount],
    ];

    for (const [label, ok] of checks) {
      if (ok) pass(`${pkg.id}_${label}`, String(price.unit_amount ?? label));
      else {
        fail(
          `${pkg.id}_${label}`,
          `got livemode=${price.livemode} active=${price.active} type=${price.type} currency=${price.currency} unit_amount=${price.unit_amount}`,
        );
      }
    }
  }

  // Create Checkout for assets_10 and inspect payment method types + amount.
  const assets10Price = process.env.STRIPE_PRICE_ID_ASSETS_10?.trim();
  if (assets10Price?.startsWith("price_")) {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: assets10Price, quantity: 1 }],
        success_url: `${appUrl}/planes/compra?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/planes`,
        payment_method_types: ["card", "oxxo"],
        metadata: {
          packageId: "assets_10",
          checkoutKind: "package",
          entitlementKind: "advertising_asset",
          verifyScript: "verify-advertising-image-packages",
        },
      });

      const types = session.payment_method_types || [];
      if (types.includes("card")) pass("checkout_card", types.join(","));
      else fail("checkout_card", types.join(","));

      if (types.includes("oxxo")) pass("checkout_oxxo", types.join(","));
      else fail("checkout_oxxo", types.join(","));

      if (session.amount_total === 9900) pass("checkout_assets_10_amount", "9900");
      else fail("checkout_assets_10_amount", String(session.amount_total));

      // Expire so it does not linger.
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        // ignore
      }

      pass("checkout_assets_10_created", session.id);
    } catch (error) {
      fail("checkout_assets_10_created", error.message);
    }
  }

  // Spot-check remaining packages' Checkout amounts without leaving open sessions.
  for (const pkg of PACKAGES.slice(1)) {
    const priceId = process.env[pkg.env]?.trim();
    if (!priceId?.startsWith("price_")) continue;
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/planes/compra?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/planes`,
        payment_method_types: ["card", "oxxo"],
        metadata: {
          packageId: pkg.id,
          verifyScript: "verify-advertising-image-packages",
        },
      });
      if (session.amount_total === pkg.amount) {
        pass(`checkout_${pkg.id}_amount`, String(session.amount_total));
      } else {
        fail(`checkout_${pkg.id}_amount`, String(session.amount_total));
      }
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        // ignore
      }
    } catch (error) {
      fail(`checkout_${pkg.id}_amount`, error.message);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- summary ---");
  console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length}`);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
