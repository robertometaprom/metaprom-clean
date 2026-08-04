/**
 * Mobile probe runner for /debug/reveal-video-probe
 * Usage: node scripts/probe-reveal-mobile.mjs [baseUrl]
 */
import { chromium, webkit, devices } from "playwright";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const probeUrl = `${baseUrl.replace(/\/$/, "")}/debug/reveal-video-probe`;

const profiles = [
  { name: "chromium-iphone13", browserType: chromium, device: devices["iPhone 13"] },
  { name: "webkit-iphone13", browserType: webkit, device: devices["iPhone 13"] },
  {
    name: "chromium-pixel7",
    browserType: chromium,
    device: devices["Pixel 7"],
  },
];

async function runProfile(profile) {
  const browser = await profile.browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...profile.device,
    locale: "es-MX",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(probeUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(13000);

  const summary = await page.evaluate(() => {
    const events =
      window.__REVEAL_VIDEO_PROBE_EVENTS__?.map((entry) => entry.event) ?? [];
    const domText = document.body.innerText;
    return {
      events,
      domText,
      hasCanPlay: events.includes("video_canplay"),
      hasLoadedData: events.includes("video_loadeddata"),
      hasLoadStart: events.includes("video_loadstart"),
      hasError: events.includes("video_error"),
      hasTimeout: events.includes("probe_timeout"),
      spinnerStillVisible: /spinner=true/.test(domText),
      videoReadyFalse: /videoReady=false/.test(domText),
    };
  });

  await browser.close();

  return {
    profile: profile.name,
    url: probeUrl,
    userAgent: profile.device.userAgent,
    ...summary,
    consoleErrors,
  };
}

const results = [];

for (const profile of profiles) {
  try {
    results.push(await runProfile(profile));
  } catch (error) {
    results.push({
      profile: profile.name,
      url: probeUrl,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify({ baseUrl, probeUrl, results }, null, 2));
