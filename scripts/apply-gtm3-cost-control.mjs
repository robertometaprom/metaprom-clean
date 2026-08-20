import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(".env.local", "utf8");
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
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match?.[1];

if (!projectRef || !accessToken) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const file = "supabase/migrations/20260820010000_gtm3_provider_cost_control.sql";
const sql = readFileSync(join(process.cwd(), file), "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error("FAILED", res.status);
  process.exit(1);
}

console.log("OK applied", file);
