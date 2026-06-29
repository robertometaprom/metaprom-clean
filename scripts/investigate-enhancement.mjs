/**
 * Diagnostic: compare OpenAI responses on success vs "No image generated"
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) process.env[t.slice(0, i)] = t.slice(i + 1);
}

import { buildStudioImagePrompt } from "../lib/studio-prompts.ts";
import { buildPrompt } from "../lib/prompts.ts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const IMAGE_PATH = path.join(__dirname, "..", "public", "showcase", "coffee", "before.jpg");
const RUNS = Number(process.env.RUNS ?? 12);

function extractImageData(response) {
  const calls = response.output?.filter((item) => item.type === "image_generation_call") ?? [];
  const results = calls.flatMap((item) => item.result ?? []);
  return { calls, results, first: results[0] ?? null };
}

function summarizeOutput(response) {
  return (response.output ?? []).map((item) => ({
    type: item.type,
    status: item.status,
    hasResult: Boolean(item.result),
    resultLen: Array.isArray(item.result) ? item.result.length : item.result ? 1 : 0,
    resultType: item.result ? typeof item.result : null,
    keys: Object.keys(item),
  }));
}

async function runOnce(attempt) {
  const intent = "Quiero un video para promocionar mi cafetería en TikTok";
  const imagePrompt = buildStudioImagePrompt(intent, "premium");
  const promptText = buildPrompt("custom", imagePrompt);

  const uploadBuffer = fs.readFileSync(IMAGE_PATH);
  const normalizedBuffer = await sharp(uploadBuffer)
    .rotate()
    .toColorspace("srgb")
    .jpeg({ quality: 90, force: true })
    .toBuffer();

  const base64Image = normalizedBuffer.toString("base64");

  const start = Date.now();
  let response;
  let error;
  try {
    response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "image_generation" }],
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: promptText },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail: "low",
            },
          ],
        },
      ],
    });
  } catch (e) {
    error = e;
  }
  const latencyMs = Date.now() - start;

  if (error) {
    return {
      attempt,
      ok: false,
      latencyMs,
      errorType: "api_throw",
      error: error.message,
      status: error.status,
      code: error.code,
    };
  }

  const { calls, results, first } = extractImageData(response);

  return {
    attempt,
    ok: Boolean(first),
    latencyMs,
    model: response.model,
    status: response.status,
    promptLen: promptText.length,
    imageBytes: normalizedBuffer.length,
    outputSummary: summarizeOutput(response),
    imageCallCount: calls.length,
    imageCallStatuses: calls.map((c) => c.status),
    resultCount: results.length,
    // Full structure for failures
    ...(first
      ? {}
      : {
          fullOutput: JSON.stringify(response.output, null, 2).slice(0, 8000),
          responseKeys: Object.keys(response),
          errorField: response.error,
        }),
  };
}

const results = [];
for (let i = 1; i <= RUNS; i++) {
  console.log(`Run ${i}/${RUNS}...`);
  results.push(await runOnce(i));
  await new Promise((r) => setTimeout(r, 1500));
}

const successes = results.filter((r) => r.ok);
const failures = results.filter((r) => !r.ok);

console.log("\n=== SUMMARY ===");
console.log(`Success: ${successes.length}/${RUNS} (${((successes.length / RUNS) * 100).toFixed(1)}%)`);
console.log(`Failures: ${failures.length}/${RUNS}`);

if (successes.length) {
  const latencies = successes.map((r) => r.latencyMs);
  console.log(`Success latency: min=${Math.min(...latencies)}ms max=${Math.max(...latencies)}ms avg=${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0)}ms`);
}

console.log("\n=== FAILURES ===");
for (const f of failures) {
  console.log(JSON.stringify(f, null, 2));
}

console.log("\n=== SUCCESS SAMPLE ===");
if (successes[0]) {
  console.log(JSON.stringify({ ...successes[0], ok: true }, null, 2));
}
