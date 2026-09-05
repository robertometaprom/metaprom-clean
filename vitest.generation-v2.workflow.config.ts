import { defineConfig } from "vitest/config";
import { workflow } from "@workflow/vitest";
import path from "node:path";

const dataDir = path.resolve(__dirname, ".workflow-data-phase1");
const outDir = path.resolve(__dirname, ".workflow-vitest-phase1");

export default defineConfig({
  plugins: [
    workflow({
      dataDir,
      outDir,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: [
      "tests/generation-v2/**/*.workflow*.test.ts",
    ],
    testTimeout: 300_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
    // Local World on Windows: high concurrency causes EPERM rename races.
    env: {
      WORKFLOW_LOCAL_QUEUE_CONCURRENCY: "25",
      WORKFLOW_TARGET_WORLD: "local",
      WORKFLOW_LOCAL_RECOVER_ACTIVE_RUNS: "0",
      WORKFLOW_LOCAL_DATA_DIR: dataDir,
    },
  },
});
