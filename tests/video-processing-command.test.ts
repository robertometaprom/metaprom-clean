import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCommercialVideoFfmpegArgs } from "../lib/video-processing-command.ts";
import {
  processCommercialVideo,
  resolveFfmpegBinary,
} from "../lib/video-processing.ts";
import {
  assertRequiredPremiumComposition,
  hasRequiredPromotionalOverlays,
  renderPromotionalOverlay,
  resolvePromotionalOverlayPlacement,
} from "../lib/promotional-overlay.ts";
import { CANONICAL_LOGO_SOURCE } from "../lib/creative-recipe.ts";
import { COMMERCIAL_FONT_IDENTITY, commercialFontFaceCss, loadCommercialFontData } from "../lib/commercial-font.ts";
import { V6_OVERLAY_STYLE, type OverlayStyle } from "../lib/overlay-style-contract.ts";

test("overlays-required Premium cannot accept a raw/uncomposed artifact", () => {
  assert.throws(
    () => assertRequiredPremiumComposition({ headline: "Exact headline" }, false),
    /retryable and undelivered/i,
  );
  assert.doesNotThrow(() => assertRequiredPremiumComposition({ headline: "Exact headline" }, true));
  assert.doesNotThrow(() => assertRequiredPremiumComposition(null, false));
});

test("teaser command overlays a pre-rendered watermark without drawtext", () => {
  const args = buildCommercialVideoFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    watermarkPath: "/tmp/watermark.png",
    maxSeconds: 4,
    crf: 30,
  });
  const command = args.join(" ");

  assert.match(command, /-filter_complex \[0:v\]\[1:v\]overlay=/);
  assert.doesNotMatch(command, /drawtext/);
  assert.match(command, /-c:v libx264/);
  assert.match(command, /-c:a aac/);
  assert.match(command, /-movflags \+faststart/);
  assert.equal(args.at(-1), "/tmp/output.mp4");
});

test("Premium command transcodes without a watermark filter", () => {
  const args = buildCommercialVideoFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    maxSeconds: 12,
    crf: 22,
  });
  const command = args.join(" ");

  assert.doesNotMatch(command, /overlay=/);
  assert.doesNotMatch(command, /filter_complex/);
  assert.match(command, /-map 0:v:0 -map 0:a\?/);
});

test("commercial font identity is pinned and embedded without system fallback", async () => {
  assert.equal(COMMERCIAL_FONT_IDENTITY.version, "1.7.2");
  assert.equal(COMMERCIAL_FONT_IDENTITY.license, "SIL Open Font License 1.1");
  assert.deepEqual(COMMERCIAL_FONT_IDENTITY.weights, [600, 700]);
  assert.equal((await loadCommercialFontData()).length > 100_000, true);
  const css = await commercialFontFaceCss();
  assert.match(css, /data:font\/ttf;base64/);
  assert.match(css, /font-weight: 100 900/);
  assert.doesNotMatch(css.slice(0, css.indexOf("base64,")), /Arial|sans-serif|https?:/i);
});

test("Premium command composes a pre-rendered deterministic overlay", () => {
  const args = buildCommercialVideoFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    promotionalOverlayPath: "/tmp/promotion.png",
    maxSeconds: 12,
    crf: 22,
  });
  const command = args.join(" ");

  assert.match(command, /-i \/tmp\/promotion\.png/);
  assert.match(command, /\[1:v\]\[0:v\]scale2ref=w=main_w:h=main_h/);
  assert.match(command, /\[base\]\[promotion\]overlay=0:0:format=auto\[v\]/);
  assert.doesNotMatch(command, /drawtext/);
});

test("timing_or_layout supports only deterministic layout and timing presets", () => {
  assert.deepEqual(resolvePromotionalOverlayPlacement(undefined), {
    layout: "standard",
    timing: "full",
  });
  assert.deepEqual(resolvePromotionalOverlayPlacement("top_intro"), {
    layout: "top",
    timing: "intro",
  });
  assert.deepEqual(resolvePromotionalOverlayPlacement("bottom_outro"), {
    layout: "bottom",
    timing: "outro",
  });
  assert.throws(
    () => resolvePromotionalOverlayPlacement("put it somewhere nice" as never),
    /unsupported required promotional overlay timing_or_layout/i,
  );
});

test("FFmpeg timing windows are deterministic and full remains backward compatible", () => {
  const build = (timing?: "full" | "intro" | "outro") =>
    buildCommercialVideoFfmpegArgs({
      inputPath: "/tmp/input.mp4",
      outputPath: "/tmp/output.mp4",
      promotionalOverlayPath: "/tmp/promotion.png",
      promotionalOverlayTiming: timing,
      maxSeconds: 12,
      crf: 22,
    }).join(" ");

  assert.doesNotMatch(build(), /enable=/);
  assert.doesNotMatch(build("full"), /enable=/);
  assert.match(build("intro"), /enable='between\(t,0,4\)'/);
  assert.match(build("outro"), /enable='gte\(t,8\)'/);
});

test("required promotional copy and exact required logo render with Sharp", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-overlay-test-"));
  const overlayPath = join(directory, "overlay.png");
  const explicitStandardPath = join(directory, "standard.png");
  const topPath = join(directory, "top.png");
  const bottomPath = join(directory, "bottom.png");
  try {
    assert.equal(hasRequiredPromotionalOverlays({ headline: "  Exacto & real  " }), true);
    await renderPromotionalOverlay({
      path: overlayPath,
      overlays: { headline: "Exacto & real", call_to_action: "Compra ahora" },
    });
    const legacyStandard = await readFile(overlayPath);
    assert.ok(legacyStandard.length > 0);
    await renderPromotionalOverlay({
      path: explicitStandardPath,
      overlays: {
        headline: "Exacto & real",
        call_to_action: "Compra ahora",
        timing_or_layout: "standard_full",
      },
    });
    assert.deepEqual(await readFile(explicitStandardPath), legacyStandard);
    await renderPromotionalOverlay({
      path: topPath,
      overlays: { headline: "Exacto", timing_or_layout: "top_full" },
    });
    await renderPromotionalOverlay({
      path: bottomPath,
      overlays: { headline: "Exacto", timing_or_layout: "bottom_full" },
    });
    assert.notDeepEqual(await readFile(topPath), await readFile(bottomPath));
    await renderPromotionalOverlay({
      path: overlayPath,
      overlays: { logo_required: true },
      exactLogoSource: CANONICAL_LOGO_SOURCE,
    });
    assert.ok((await readFile(overlayPath)).length > 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("missing or invalid required-logo sources fail closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-logo-failure-test-"));
  const overlayPath = join(directory, "overlay.png");
  try {
    await assert.rejects(
      renderPromotionalOverlay({ path: overlayPath, overlays: { logo_required: true } }),
      /no exact logo source/i,
    );
    await assert.rejects(
      renderPromotionalOverlay({
        path: overlayPath,
        overlays: { logo_required: true },
        exactLogoSource: { ...CANONICAL_LOGO_SOURCE, sha256: "0".repeat(64) },
      }),
      /not the approved canonical brand asset/i,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("long promotional copy wraps deterministically in landscape and portrait", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-long-copy-test-"));
  const landscapePath = join(directory, "landscape.png");
  const portraitPath = join(directory, "portrait.png");
  const overlays = {
    headline: "Transforma cada momento cotidiano en una experiencia verdaderamente extraordinaria",
    price_or_promotion: "Llévate dos productos y recibe el segundo con cincuenta por ciento de descuento",
    call_to_action: "Descubre todos los beneficios ahora",
    url: "https://metaprom.com/promociones/verano-2026",
    phone: "+52 55 1234 5678",
    timing_or_layout: "bottom_outro" as const,
  };
  try {
    await renderPromotionalOverlay({ path: landscapePath, overlays, aspectRatio: "16:9" });
    await renderPromotionalOverlay({ path: portraitPath, overlays, aspectRatio: "9:16" });
    assert.ok((await readFile(landscapePath)).length > 0);
    assert.ok((await readFile(portraitPath)).length > 0);
    assert.notDeepEqual(await readFile(landscapePath), await readFile(portraitPath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("absent overlay_style is byte-identical to the explicit v6 default", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-v6-style-test-"));
  const legacyPath = join(directory, "legacy.png");
  const explicitPath = join(directory, "explicit.png");
  const overlays = { headline: "Exacto", call_to_action: "Compra ahora" };
  try {
    await renderPromotionalOverlay({ path: legacyPath, overlays });
    await renderPromotionalOverlay({ path: explicitPath, overlays, overlayStyle: V6_OVERLAY_STYLE });
    assert.deepEqual(await readFile(explicitPath), await readFile(legacyPath));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("left, center, and right styled safe zones render in 16:9 and 9:16", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-align-style-test-"));
  try {
    for (const aspectRatio of ["16:9", "9:16"] as const) {
      const outputs: Buffer[] = [];
      for (const text_alignment of ["left", "center", "right"] as const) {
        const path = join(directory, `${aspectRatio.replace(":", "-")}-${text_alignment}.png`);
        await renderPromotionalOverlay({
          path,
          aspectRatio,
          overlays: { headline: "Producto extraordinario", price_or_promotion: "Oferta especial", call_to_action: "Conoce más", url: "metaprom.com" },
          overlayStyle: { ...V6_OVERLAY_STYLE, text_alignment, origin: "director" },
        });
        outputs.push(await readFile(path));
      }
      assert.notDeepEqual(outputs[0], outputs[1]);
      assert.notDeepEqual(outputs[1], outputs[2]);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("representative closed typography, palette, CTA, and promotion combinations render", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-style-combos-test-"));
  const styles: OverlayStyle[] = [
    { typography_treatment: "clean", palette_preset: "light", text_alignment: "left", cta_treatment: "text_only", promotion_treatment: "emphasis", origin: "director" },
    { typography_treatment: "refined", palette_preset: "warm", text_alignment: "center", cta_treatment: "panel", promotion_treatment: "badge", origin: "user" },
    { typography_treatment: "cinematic", palette_preset: "cool", text_alignment: "right", cta_treatment: "pill", promotion_treatment: "badge", origin: "brand" },
  ];
  try {
    const outputs: Buffer[] = [];
    for (const [index, overlayStyle] of styles.entries()) {
      const path = join(directory, `${index}.png`);
      await renderPromotionalOverlay({ path, overlays: { headline: "Copia exacta", price_or_promotion: "2 x 1", call_to_action: "Compra ahora" }, overlayStyle });
      outputs.push(await readFile(path));
    }
    assert.ok(outputs.every((buffer) => buffer.length > 0));
    assert.notDeepEqual(outputs[0], outputs[1]);
    assert.notDeepEqual(outputs[1], outputs[2]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("styled long copy preserves bounds and impossible required copy still fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-styled-copy-test-"));
  const path = join(directory, "styled.png");
  const style: OverlayStyle = { typography_treatment: "refined", palette_preset: "warm", text_alignment: "right", cta_treatment: "panel", promotion_treatment: "badge", origin: "user" };
  try {
    await renderPromotionalOverlay({ path, aspectRatio: "9:16", overlayStyle: style, overlays: {
      headline: "Transforma cada momento cotidiano en una experiencia verdaderamente extraordinaria",
      price_or_promotion: "Llévate dos productos y recibe el segundo con cincuenta por ciento de descuento",
      call_to_action: "Descubre todos los beneficios ahora",
      url: "https://metaprom.com/promociones/verano-2026",
    } });
    assert.ok((await readFile(path)).length > 0);
    await assert.rejects(renderPromotionalOverlay({ path, overlayStyle: style, overlays: { headline: "Extraordinario ".repeat(80).trim() } }), /exceeds deterministic 16:9 layout bounds/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("URL and phone wrap without truncation and impossible required copy fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-copy-bounds-test-"));
  const overlayPath = join(directory, "overlay.png");
  try {
    await renderPromotionalOverlay({
      path: overlayPath,
      aspectRatio: "9:16",
      overlays: {
        url: "https://www.metaprom.com/catalogo/productos/edicion-especial?campana=verano-2026",
        phone: "+52 (55) 1234 5678 extensión 2468",
      },
    });
    assert.ok((await readFile(overlayPath)).length > 0);

    await assert.rejects(
      renderPromotionalOverlay({
        path: overlayPath,
        aspectRatio: "16:9",
        overlays: { headline: "Extraordinario ".repeat(80).trim() },
      }),
      /exceeds deterministic 16:9 layout bounds/i,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bundled FFmpeg performs teaser and Premium PNG composition paths", async () => {
  const resolution = resolveFfmpegBinary();
  assert.ok(resolution.path, "ffmpeg-static binary must resolve");

  const directory = await mkdtemp(join(tmpdir(), "metaprom-video-test-"));
  const sourcePath = join(directory, "source.mp4");

  try {
    const generated = spawnSync(
      resolution.path,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=navy:s=320x180:d=1",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-shortest",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        sourcePath,
      ],
      { encoding: "utf8" },
    );
    assert.equal(generated.status, 0, generated.stderr);

    const result = await processCommercialVideo({
      buffer: await readFile(sourcePath),
      tier: "teaser",
    });
    assert.equal(result.processed, true, result.failure?.message);
    assert.ok(result.buffer.length > 0);

    const premiumResult = await processCommercialVideo({
      buffer: await readFile(sourcePath),
      tier: "premium",
      aspectRatio: "16:9",
      promotionalOverlays: {
        headline: "Transforma cada momento cotidiano en una experiencia verdaderamente extraordinaria",
        price_or_promotion: "Segundo producto con cincuenta por ciento de descuento",
        call_to_action: "Descubre todos los beneficios ahora",
        url: "https://metaprom.com/promociones/verano-2026",
        phone: "+52 55 1234 5678",
        logo_required: true,
        timing_or_layout: "bottom_outro",
      },
      exactLogoSource: CANONICAL_LOGO_SOURCE,
      overlayStyle: {
        typography_treatment: "cinematic",
        palette_preset: "cool",
        text_alignment: "right",
        cta_treatment: "panel",
        promotion_treatment: "badge",
        origin: "director",
      },
    });
    assert.equal(premiumResult.processed, true, premiumResult.failure?.message);
    assert.ok(premiumResult.buffer.length > 0);

    const missingLogoResult = await processCommercialVideo({
      buffer: await readFile(sourcePath),
      tier: "premium",
      promotionalOverlays: { logo_required: true },
    });
    assert.equal(missingLogoResult.processed, false);
    assert.equal(missingLogoResult.failure?.stage, "promotional_overlay");

    const unsupportedPlacementResult = await processCommercialVideo({
      buffer: await readFile(sourcePath),
      tier: "premium",
      promotionalOverlays: {
        headline: "Copy obligatorio",
        timing_or_layout: "free form placement" as never,
      },
    });
    assert.equal(unsupportedPlacementResult.processed, false);
    assert.equal(unsupportedPlacementResult.failure?.stage, "promotional_overlay");
    assert.match(unsupportedPlacementResult.failure?.message ?? "", /unsupported required/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
