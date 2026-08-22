/**
 * GTM #1 — close internal / test production surfaces.
 *
 * Run: npm run test:closed-production-surfaces
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  isClosedProductionSurfacePath,
  isClosedPublicProductionPath,
  shouldCloseProductionSurfaces,
} from "../lib/security/closed-production-surfaces.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("closed-path matcher covers the audited surfaces and nested video-test API", () => {
  for (const path of [
    "/dashboard",
    "/dashboard/",
    "/dashboard?mode=amazon",
    "/dashboard_backup",
    "/test",
    "/video-test",
    "/api/diagnose",
    "/api/video-test",
    "/api/video-test/stream",
  ]) {
    assert.equal(isClosedProductionSurfacePath(path), true, path);
  }
});

test("closed-path matcher does not touch customer or admin production routes", () => {
  for (const path of [
    "/",
    "/studio",
    "/planes",
    "/biblioteca",
    "/creditos",
    "/login",
    "/soporte",
    "/api/support",
    "/api/locale",
    "/admin/dashboard",
    "/admin/dashboard?range=7d",
    "/analytics",
    "/analytics?period=7d",
    "/api/video",
    "/api/payments/webhook",
    "/api/enhancement",
    "/api/biblioteca/media",
    "/api/admin/test-credits",
    "/p/23456789ABC",
  ]) {
    assert.equal(isClosedProductionSurfacePath(path), false, path);
  }
});

test("surfaces close only in production", () => {
  assert.equal(shouldCloseProductionSurfaces("production"), true);
  assert.equal(shouldCloseProductionSurfaces("development"), false);
  assert.equal(shouldCloseProductionSurfaces("test"), false);
  assert.equal(isClosedPublicProductionPath("/dashboard", "production"), true);
  assert.equal(isClosedPublicProductionPath("/dashboard", "development"), false);
  assert.equal(isClosedPublicProductionPath("/admin/dashboard", "production"), false);
  assert.equal(isClosedPublicProductionPath("/studio", "production"), false);
});

test("middleware and route handlers apply the production 404 guard", () => {
  const middleware = readRepo("middleware.ts");
  const diagnose = readRepo("app/api/diagnose/route.ts");
  const videoTestStream = readRepo("app/api/video-test/stream/route.ts");
  const dashboardLayout = readRepo("app/dashboard/layout.tsx");
  const backupLayout = readRepo("app/dashboard_backup/layout.tsx");
  const testLayout = readRepo("app/test/layout.tsx");
  const videoTestLayout = readRepo("app/video-test/layout.tsx");

  assert.match(middleware, /isClosedPublicProductionPath/);
  assert.match(middleware, /status: 404/);
  assert.match(diagnose, /shouldCloseProductionSurfaces/);
  assert.match(diagnose, /status: 404/);
  assert.ok(
    diagnose.indexOf("shouldCloseProductionSurfaces") <
      diagnose.indexOf("fetchBibliotecaProjects()"),
  );
  assert.match(videoTestStream, /shouldCloseProductionSurfaces/);
  assert.match(videoTestStream, /status: 404/);
  const videoTestGet = videoTestStream.slice(
    videoTestStream.indexOf("export async function GET"),
  );
  assert.ok(
    videoTestGet.indexOf("shouldCloseProductionSurfaces") <
      videoTestGet.indexOf("createClient()"),
  );

  for (const layout of [
    dashboardLayout,
    backupLayout,
    testLayout,
    videoTestLayout,
  ]) {
    assert.match(layout, /ClosedProductionSurfaceLayout/);
  }
});

test("customer navigation does not point at closed internal surfaces", () => {
  const files = [
    "app/page.tsx",
    "app/biblioteca/page.tsx",
    "app/creditos/page.tsx",
    "app/login/LoginForm.tsx",
    "components/Navbar.tsx",
    "components/AuthButton.tsx",
    "components/studio/StudioShell.tsx",
    "components/landing/Footer.tsx",
    "components/pricing/PlanesExperience.tsx",
    "components/LocaleSwitcher.tsx",
    "lib/biblioteca-routing.ts",
  ];

  const forbidden =
    /["'`]\/(?:dashboard(?:_backup)?|test|video-test|api\/diagnose)(?:[/"'`]|$)/;

  for (const file of files) {
    assert.equal(forbidden.test(readRepo(file)), false, file);
  }

  assert.match(readRepo("lib/biblioteca-routing.ts"), /\/studio/);
  assert.match(readRepo("app/biblioteca/page.tsx"), /buildBibliotecaStudioUrl/);
});
