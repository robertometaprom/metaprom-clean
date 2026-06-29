/**
 * Measure enhancement reliability via /api/enhancement
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildStudioImagePrompt } from "../lib/studio-prompts.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const IMAGE_PATH = path.join(__dirname, "..", "public", "showcase", "coffee", "before.jpg");
const RUNS = Number(process.env.RUNS ?? 20);

const intent = "Quiero un video para promocionar mi cafetería en TikTok";
const imagePrompt = buildStudioImagePrompt(intent, "premium");

let successes = 0;
const rows = [];

for (let i = 1; i <= RUNS; i++) {
  process.stdout.write(`Run ${i}/${RUNS}... `);
  const started = Date.now();

  const buffer = fs.readFileSync(IMAGE_PATH);
  const file = new File([buffer], "before.jpg", { type: "image/jpeg" });
  const form = new FormData();
  form.append("image", file);
  form.append("mode", "custom");
  form.append("aiInstructions", imagePrompt);

  let response;
  try {
    response = await fetch(`${BASE}/api/enhancement`, { method: "POST", body: form });
  } catch (error) {
    rows.push({ run: i, ok: false, latencyMs: Date.now() - started, error: String(error) });
    console.log("NETWORK FAIL");
    continue;
  }

  const data = await response.json();
  const latencyMs = Date.now() - started;

  if (response.ok && data.image) {
    successes += 1;
    rows.push({ run: i, ok: true, latencyMs, status: response.status });
    console.log(`OK (${latencyMs}ms)`);
  } else {
    rows.push({
      run: i,
      ok: false,
      latencyMs,
      status: response.status,
      error: data.error ?? "unknown",
    });
    console.log(`FAIL ${response.status} ${data.error ?? ""}`);
  }

  await new Promise((r) => setTimeout(r, 1000));
}

const rate = (successes / RUNS) * 100;
console.log(`\n=== RESULT ===`);
console.log(`Success rate: ${successes}/${RUNS} (${rate.toFixed(1)}%)`);
console.log(`Beta target (95%): ${rate >= 95 ? "MET" : "NOT MET"}`);

const failures = rows.filter((r) => !r.ok);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(JSON.stringify(f));
}

process.exit(rate >= 95 ? 0 : 1);
