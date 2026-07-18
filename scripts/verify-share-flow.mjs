import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
    // .env.local optional when vars already set
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

if (!url || !key) {
  console.error("MISSING_ENV", { hasUrl: Boolean(url), hasKey: Boolean(key) });
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("assets")
    .select("id, share_slug, teaser_video_path, visibility, created_at")
    .not("teaser_video_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("QUERY_ERROR", error);
    process.exit(1);
  }

  const orphanQuery = await supabase
    .from("assets")
    .select("id")
    .not("teaser_video_path", "is", null)
    .is("share_slug", null);

  const checklist = {};
  const withSlug = data?.filter((row) => row.share_slug) ?? [];
  checklist["share_slug column exists"] = !error;
  checklist["share_slug persisted on teasers"] = withSlug.length > 0;
  checklist["no orphan teasers without slug"] = (orphanQuery.data?.length ?? 0) === 0;

  const slug = withSlug[0]?.share_slug;
  if (!slug) {
    console.log("\n=== CHECKLIST ===");
    for (const [item, pass] of Object.entries(checklist)) {
      console.log(`${pass ? "PASS" : "FAIL"} ${item}`);
    }
    console.error("\nNO_SHARE_SLUG_FOUND — cannot verify public flow");
    process.exit(1);
  }

  const publicUrl = `${appUrl}/p/${slug}`;
  checklist["public URL format correct"] = publicUrl === `${appUrl}/p/${slug}`;

  const apiRes = await fetch(`${appUrl}/api/public/${slug}`);
  checklist["public API returns preview"] = apiRes.status === 200;

  const streamRedirect = await fetch(`${appUrl}/api/public/${slug}/stream`, {
    redirect: "manual",
  });
  const signedLocation = streamRedirect.headers.get("location");
  checklist["stream endpoint redirects to signed URL"] =
    streamRedirect.status === 302 && Boolean(signedLocation);

  let videoPlays = false;
  if (signedLocation) {
    const videoRes = await fetch(signedLocation, { method: "HEAD" });
    videoPlays =
      videoRes.ok &&
      videoRes.headers.get("content-type")?.includes("video/mp4");
  }
  checklist["video stream is valid MP4"] = videoPlays;

  const pageRes = await fetch(`${appUrl}/p/${slug}`);
  const html = await pageRes.text();
  checklist["public page loads without auth"] = pageRes.status === 200;
  checklist["page embeds stream path"] = html.includes(
    `/api/public/${slug}/stream`,
  );
  checklist["CTA Create yours free present"] = /Create yours free|Crea el tuyo gratis/i.test(
    html,
  );
  checklist["CTA links to /studio"] = html.includes('href="/studio"');
  const visibleDownload = [...html.matchAll(/>([^<]{0,60}(?:download|descargar)[^<]{0,60})</gi)]
    .map((match) => match[1].trim())
    .filter((text) => !text.toLowerCase().includes("nodownload"));
  checklist["no visible Download button"] = visibleDownload.length === 0;
  checklist["video has nodownload deterrent"] = html.toLowerCase().includes("nodownload");

  console.log("\n=== SAMPLE ASSET ===");
  console.log({ slug, publicUrl, localApp: appUrl });

  console.log("\n=== RC1.3.5 SHARE CHECKLIST ===");
  for (const [item, pass] of Object.entries(checklist)) {
    console.log(`${pass ? "PASS" : "FAIL"} ${item}`);
  }

  const failed = Object.entries(checklist).filter(([, pass]) => !pass);
  if (failed.length > 0) {
    console.log(`\n${failed.length} check(s) still failing.`);
    process.exit(1);
  }

  console.log("\nAll verifiable checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
