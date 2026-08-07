import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const { PRICING_PACKAGES, getPackagePurchasability } = await import(
  pathToFileURL(join(root, "lib/pricing/index.ts")).href
);
const { ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL } = await import(
  pathToFileURL(join(root, "lib/entitlements/flags.ts")).href
);

console.log("FULFILLMENT", ADVERTISING_ASSET_FULFILLMENT_OPERATIONAL);

let failed = 0;
for (const pkg of PRICING_PACKAGES.filter((p) => p.category === "assets")) {
  const p = getPackagePurchasability(pkg);
  const line = `${pkg.id} cta=${p.ctaState} purchasable=${p.purchasable} hasPrice=${p.hasStripePriceId}`;
  if (p.purchasable && p.ctaState === "purchase") {
    console.log("PASS", line);
  } else {
    console.error("FAIL", line);
    failed += 1;
  }
}

process.exit(failed ? 1 : 0);
