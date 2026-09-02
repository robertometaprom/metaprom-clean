import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match?.[1];

if (!projectRef || !accessToken) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const MIGRATION_FILE =
  "supabase/migrations/20260902120000_studio_drafts_share_slug.sql";

async function querySql(sql) {
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
    console.error("Query failed", res.status, text.slice(0, 500));
    process.exit(1);
  }

  return text ? JSON.parse(text) : null;
}

async function runSql(label, sql) {
  console.log(`\n=== Applying: ${label} ===`);
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
    console.error("FAILED", res.status, text.slice(0, 500));
    process.exit(1);
  }

  console.log("OK", text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

console.log(`\n=== Verifying target project: ${projectRef} ===`);

const existsResult = await querySql(`
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'studio_drafts'
      and column_name = 'share_slug'
  ) as column_exists;
`);

if (existsResult?.[0]?.column_exists === true) {
  console.log("SKIP: studio_drafts.share_slug already exists.");
  process.exit(0);
}

const sql = readFileSync(join(root, MIGRATION_FILE), "utf8");
await runSql(MIGRATION_FILE, sql);

console.log("\nStudio drafts share_slug migration applied.");
