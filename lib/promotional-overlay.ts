import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES,
  type PromotionalOverlays,
} from "@/lib/commercial-production-profile";
import {
  CANONICAL_LOGO_SOURCE,
  type ExactLogoSource,
} from "@/lib/creative-recipe";
import { requiresMetapromWatermark } from "@/lib/promotional-overlay-contract";
import type { VeoAspectRatio } from "@/lib/destination-generation";
import { COMMERCIAL_FONT_IDENTITY, commercialFontFaceCss } from "@/lib/commercial-font";
import {
  resolveOverlayStyle,
  type OverlayStyle,
  type OverlayTextAlignment,
  type OverlayTypographyTreatment,
} from "@/lib/overlay-style-contract";

const TEXT_KEYS = [
  "headline",
  "price_or_promotion",
  "call_to_action",
  "url",
  "phone",
] as const;

type PromotionalTextRole = "headline" | "promotion" | "cta" | "contact";
type LaidOutText = {
  fontSize: number;
  lines: string[];
  lineHeight: number;
};

const TYPOGRAPHY = {
  clean: { scale: 0.92, headlineWeight: 600, bodyWeight: 600, tracking: 0 },
  bold: { scale: 1, headlineWeight: 700, bodyWeight: 700, tracking: 0 },
  refined: { scale: 0.88, headlineWeight: 600, bodyWeight: 600, tracking: 0.025 },
  cinematic: { scale: 0.96, headlineWeight: 700, bodyWeight: 600, tracking: 0.055 },
} as const;

const PALETTES = {
  dark: { text: "white", stroke: "rgba(0,0,0,.72)", surface: "rgba(0,0,0,.78)", surfaceText: "white", accent: "rgba(255,255,255,.94)", accentText: "#151515" },
  light: { text: "#151515", stroke: "rgba(255,255,255,.82)", surface: "rgba(255,255,255,.9)", surfaceText: "#151515", accent: "rgba(255,255,255,.94)", accentText: "#151515" },
  warm: { text: "#fff7e8", stroke: "rgba(67,25,8,.76)", surface: "rgba(126,52,18,.9)", surfaceText: "#fff7e8", accent: "rgba(232,154,73,.94)", accentText: "#421a08" },
  cool: { text: "#eef8ff", stroke: "rgba(4,27,58,.78)", surface: "rgba(13,61,112,.9)", surfaceText: "#eef8ff", accent: "rgba(93,190,255,.94)", accentText: "#041b3a" },
} as const;

const TEXT_LAYOUT_CONTRACT = {
  "16:9": {
    headline: { maxWidth: 1536, fontSizes: [68, 60, 52, 44, 36], maxLines: 3 },
    promotion: { maxWidth: 1440, fontSizes: [58, 52, 46, 40, 34], maxLines: 2 },
    cta: { maxWidth: 900, fontSizes: [42, 38, 34, 30], maxLines: 2 },
    contact: { maxWidth: 1536, fontSizes: [32, 28, 24, 22], maxLines: 2 },
  },
  "9:16": {
    headline: { maxWidth: 900, fontSizes: [68, 60, 52, 44, 36], maxLines: 4 },
    promotion: { maxWidth: 864, fontSizes: [58, 52, 46, 40, 34], maxLines: 3 },
    cta: { maxWidth: 800, fontSizes: [42, 38, 34, 30], maxLines: 2 },
    contact: { maxWidth: 900, fontSizes: [32, 28, 24, 22], maxLines: 3 },
  },
} as const;

const BREAK_AFTER = /[\s/?.&=+_\-–—:;,]/u;

function glyphUnits(value: string): number {
  let units = 0;
  for (const glyph of Array.from(value)) {
    if (/\s/u.test(glyph)) units += 0.34;
    else if (/[ilI1|.,'`:;]/u.test(glyph)) units += 0.3;
    else if (/[mwMW@%#&]/u.test(glyph)) units += 0.9;
    else if (/\p{Script=Han}|\p{Extended_Pictographic}/u.test(glyph)) units += 1;
    else units += 0.62;
  }
  return units;
}

function wrapText(value: string, fontSize: number, maxWidth: number): string[] {
  const maxUnits = maxWidth / fontSize;
  const output: string[] = [];
  for (const paragraph of value.split("\n")) {
    if (!paragraph) {
      output.push("");
      continue;
    }
    let remaining = paragraph;
    while (glyphUnits(remaining) > maxUnits) {
      const glyphs = Array.from(remaining);
      let end = 0;
      let preferred = 0;
      for (let index = 0; index < glyphs.length; index += 1) {
        if (glyphUnits(glyphs.slice(0, index + 1).join("")) > maxUnits) break;
        end = index + 1;
        if (BREAK_AFTER.test(glyphs[index])) preferred = end;
      }
      const split = preferred || end;
      if (!split) return [];
      output.push(glyphs.slice(0, split).join(""));
      remaining = glyphs.slice(split).join("");
    }
    output.push(remaining);
  }
  return output;
}

async function renderedLineWidth(value: string, fontSize: number, weight: number, tracking = 0): Promise<number> {
  if (!value.trim()) return 0;
  const fontFace = await commercialFontFaceCss();
  const svg = `<svg width="4096" height="256" xmlns="http://www.w3.org/2000/svg"><style>${fontFace}</style><text x="16" y="180" font-family="${COMMERCIAL_FONT_IDENTITY.family}" font-size="${fontSize}px" font-weight="${weight}" letter-spacing="${tracking}em" fill="white">${escapeXml(value)}</text></svg>`;
  const { info } = await sharp(Buffer.from(svg))
    .trim({ background: "transparent" })
    .png()
    .toBuffer({ resolveWithObject: true });
  return info.width;
}

async function layoutText(
  role: PromotionalTextRole,
  value: string,
  aspectRatio: "16:9" | "9:16",
  maxHeight?: number,
  typography: OverlayTypographyTreatment = "bold",
): Promise<LaidOutText> {
  const spec = TEXT_LAYOUT_CONTRACT[aspectRatio][role];
  const treatment = TYPOGRAPHY[typography];
  const weight = role === "contact" ? 600 : role === "headline" ? treatment.headlineWeight : treatment.bodyWeight;
  for (const baseFontSize of spec.fontSizes) {
    const fontSize = Math.round(baseFontSize * treatment.scale);
    const lines = wrapText(value, fontSize, spec.maxWidth);
    if (!lines.length || lines.length > spec.maxLines) continue;
    const lineHeight = Math.ceil(fontSize * 1.2);
    if (maxHeight && lines.length * lineHeight > maxHeight) continue;
    const widths = await Promise.all(
      lines.map((line) => renderedLineWidth(line, fontSize, weight, treatment.tracking)),
    );
    if (widths.every((width) => width <= spec.maxWidth)) {
      return { fontSize, lines, lineHeight };
    }
  }
  throw new Error(
    `Required promotional overlay ${role} exceeds deterministic ${aspectRatio} layout bounds.`,
  );
}

function textElement(input: {
  x: number;
  baseline: number;
  className: string;
  layout: LaidOutText;
}): string {
  const firstBaseline = input.baseline -
    ((input.layout.lines.length - 1) * input.layout.lineHeight) / 2;
  const tspans = input.layout.lines.map((line, index) =>
    `<tspan x="${input.x}" y="${Math.round(firstBaseline + index * input.layout.lineHeight)}">${escapeXml(line)}</tspan>`,
  );
  return `<text class="${input.className}" style="font-size:${input.layout.fontSize}px">${tspans.join("")}</text>`;
}

export type PromotionalOverlayLayout = "standard" | "top" | "bottom";
export type PromotionalOverlayTiming = "full" | "intro" | "outro";
export type ResolvedPromotionalOverlayPlacement = {
  layout: PromotionalOverlayLayout;
  timing: PromotionalOverlayTiming;
};

export function resolvePromotionalOverlayPlacement(
  value: PromotionalOverlays["timing_or_layout"],
): ResolvedPromotionalOverlayPlacement {
  if (value === undefined) return { layout: "standard", timing: "full" };
  if (!PROMOTIONAL_OVERLAY_TIMING_OR_LAYOUT_VALUES.includes(value)) {
    throw new Error(`Unsupported required promotional overlay timing_or_layout: ${String(value)}`);
  }
  const [layout, timing] = value.split("_") as [
    PromotionalOverlayLayout,
    PromotionalOverlayTiming,
  ];
  return { layout, timing };
}

function normalizedText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function hasRequiredPromotionalOverlays(
  overlays?: PromotionalOverlays | null,
): boolean {
  return Boolean(
    overlays &&
      (requiresMetapromWatermark(overlays) ||
        TEXT_KEYS.some((key) => normalizedText(overlays[key]))),
  );
}

export function assertRequiredPremiumComposition(
  overlays: PromotionalOverlays | null | undefined,
  processed: boolean,
): void {
  if (hasRequiredPromotionalOverlays(overlays) && !processed) {
    throw new Error("Required promotional overlays could not be composed; Premium remains retryable and undelivered.");
  }
}

export async function renderPromotionalOverlay(input: {
  path: string;
  overlays: PromotionalOverlays;
  aspectRatio?: VeoAspectRatio;
  exactLogoSource?: ExactLogoSource | null;
  overlayStyle?: OverlayStyle | null;
}): Promise<ResolvedPromotionalOverlayPlacement> {
  const style = resolveOverlayStyle(input.overlayStyle);
  const placement = resolvePromotionalOverlayPlacement(
    input.overlays.timing_or_layout,
  );
  let logoBuffer: Buffer | null = null;
  if (requiresMetapromWatermark(input.overlays)) {
    const source = input.exactLogoSource;
    if (!source) {
      throw new Error("Required logo overlay has no exact logo source in the creative recipe.");
    }
    if (
      source.kind !== CANONICAL_LOGO_SOURCE.kind ||
      source.path !== CANONICAL_LOGO_SOURCE.path ||
      source.sha256 !== CANONICAL_LOGO_SOURCE.sha256
    ) {
      throw new Error("Required logo source is not the approved canonical brand asset.");
    }

    logoBuffer = await readFile(
      resolve(process.cwd(), "public", "brand", "metaprom-logo-light.png"),
    );
    const digest = createHash("sha256").update(logoBuffer).digest("hex");
    if (digest !== source.sha256) {
      throw new Error("Required logo asset failed exact SHA-256 verification.");
    }
    const metadata = await sharp(logoBuffer).metadata();
    if (metadata.format !== "png" || !metadata.width || !metadata.height || !metadata.hasAlpha) {
      throw new Error("Required logo asset is not a valid transparent PNG.");
    }
  }

  const headline = normalizedText(input.overlays.headline);
  const promotion = normalizedText(input.overlays.price_or_promotion);
  const cta = normalizedText(input.overlays.call_to_action);
  const contact = [
    normalizedText(input.overlays.url),
    normalizedText(input.overlays.phone),
  ].filter((value): value is string => Boolean(value)).join("  •  ");

  if (!headline && !promotion && !cta && !contact && !logoBuffer) return placement;

  const portrait = input.aspectRatio === "9:16";
  const aspectRatio = portrait ? "9:16" : "16:9";
  const width = portrait ? 1080 : 1920;
  const height = portrait ? 1920 : 1080;
  const centerX = width / 2;
  const treatment = TYPOGRAPHY[style.typography_treatment];
  const palette = PALETTES[style.palette_preset];
  const positions = {
    standard: { headline: 0.15, promotion: 0.7, cta: 0.75, contact: 0.91 },
    top: { headline: 0.15, promotion: 0.26, cta: 0.32, contact: 0.43 },
    bottom: { headline: 0.61, promotion: 0.7, cta: 0.75, contact: 0.91 },
  }[placement.layout];
  const slots = portrait
    ? {
        standard: { headline: [170, 480], promotion: [1240, 1450], cta: [1470, 1680], contact: [1710, 1880] },
        top: { headline: [170, 500], promotion: [530, 760], cta: [790, 1010], contact: [1040, 1240] },
        bottom: { headline: [1020, 1320], promotion: [1340, 1530], cta: [1550, 1730], contact: [1760, 1900] },
      }[placement.layout]
    : {
        standard: { headline: [150, 330], promotion: [650, 790], cta: [810, 930], contact: [950, 1040] },
        top: { headline: [150, 300], promotion: [315, 420], cta: [435, 535], contact: [550, 620] },
        bottom: { headline: [540, 690], promotion: [705, 800], cta: [815, 925], contact: [945, 1030] },
      }[placement.layout];
  const slotHeight = (role: PromotionalTextRole) => slots[role][1] - slots[role][0];
  const layouts = await Promise.all([
    headline ? layoutText("headline", headline, aspectRatio, slotHeight("headline"), style.typography_treatment) : null,
    promotion ? layoutText("promotion", promotion, aspectRatio, slotHeight("promotion"), style.typography_treatment) : null,
    cta ? layoutText("cta", cta, aspectRatio, slotHeight("cta") - 32, style.typography_treatment) : null,
    contact ? layoutText("contact", contact, aspectRatio, slotHeight("contact"), style.typography_treatment) : null,
  ]);
  const [headlineLayout, promotionLayout, ctaLayout, contactLayout] = layouts;
  const isV6Style = style.typography_treatment === "bold" && style.palette_preset === "dark" &&
    style.text_alignment === "center" && style.cta_treatment === "pill" &&
    style.promotion_treatment === "emphasis";
  const ordinary = isV6Style && [headlineLayout, promotionLayout, ctaLayout, contactLayout]
    .filter((layout): layout is LaidOutText => Boolean(layout))
    .every((layout) => layout.lines.length === 1) &&
    (!headlineLayout || headlineLayout.fontSize === 68) &&
    (!promotionLayout || promotionLayout.fontSize === 58) &&
    (!ctaLayout || ctaLayout.fontSize === 42) &&
    (!contactLayout || contactLayout.fontSize === 32) &&
    (!ctaLayout || (await renderedLineWidth(cta!, 42, 700)) <= 420);
  const lines: string[] = [];
  if (ordinary) {
    if (headline) lines.push(`<text x="${centerX}" y="${Math.round(height * positions.headline)}" class="headline">${escapeXml(headline)}</text>`);
    if (promotion) lines.push(`<text x="${centerX}" y="${Math.round(height * positions.promotion)}" class="promotion">${escapeXml(promotion)}</text>`);
    if (cta) lines.push(`<rect x="${centerX - 250}" y="${Math.round(height * positions.cta)}" width="500" height="100" rx="50" class="cta-bg"/><text x="${centerX}" y="${Math.round(height * positions.cta) + 67}" class="cta">${escapeXml(cta)}</text>`);
    if (contact) lines.push(`<text x="${centerX}" y="${Math.round(height * positions.contact)}" class="contact">${escapeXml(contact)}</text>`);
  } else {
    const roleX = (role: PromotionalTextRole) => {
      const maxWidth = TEXT_LAYOUT_CONTRACT[aspectRatio][role].maxWidth;
      if (style.text_alignment === "left") return (width - maxWidth) / 2;
      if (style.text_alignment === "right") return width - (width - maxWidth) / 2;
      return centerX;
    };
    const addText = (role: PromotionalTextRole, className: string, layout: LaidOutText | null) => {
      if (!layout) return;
      const [top, bottom] = slots[role];
      const blockHeight = layout.lines.length * layout.lineHeight;
      if (blockHeight > bottom - top) {
        throw new Error(`Required promotional overlay ${role} exceeds deterministic ${aspectRatio} ${placement.layout} slot.`);
      }
      if (role === "promotion" && style.promotion_treatment === "badge") {
        const maxWidth = TEXT_LAYOUT_CONTRACT[aspectRatio].promotion.maxWidth;
        const boxHeight = blockHeight + 24;
        const x = roleX(role);
        const left = style.text_alignment === "left" ? x - 20 : style.text_alignment === "right" ? x - maxWidth - 20 : x - maxWidth / 2 - 20;
        lines.push(`<rect x="${Math.round(left)}" y="${Math.round((top + bottom - boxHeight) / 2)}" width="${maxWidth + 40}" height="${boxHeight}" rx="16" class="promotion-bg"/>`);
      }
      lines.push(textElement({
        x: roleX(role),
        baseline: (top + bottom) / 2 + layout.fontSize * 0.35,
        className,
        layout,
      }));
    };
    addText("headline", "headline", headlineLayout);
    addText("promotion", "promotion", promotionLayout);
    if (ctaLayout) {
      const [top, bottom] = slots.cta;
      const contentHeight = ctaLayout.lines.length * ctaLayout.lineHeight;
      const boxHeight = contentHeight + 32;
      if (boxHeight > bottom - top) {
        throw new Error(`Required promotional overlay cta exceeds deterministic ${aspectRatio} ${placement.layout} slot.`);
      }
      const boxWidth = TEXT_LAYOUT_CONTRACT[aspectRatio].cta.maxWidth + 64;
      const boxTop = (top + bottom - boxHeight) / 2;
      const anchorX = roleX("cta");
      const boxLeft = style.text_alignment === "left" ? anchorX - 32 : style.text_alignment === "right" ? anchorX - boxWidth + 32 : anchorX - boxWidth / 2;
      if (style.cta_treatment !== "text_only") {
        const radius = style.cta_treatment === "pill" ? Math.round(boxHeight / 2) : 12;
        lines.push(`<rect x="${Math.round(boxLeft)}" y="${Math.round(boxTop)}" width="${boxWidth}" height="${boxHeight}" rx="${radius}" class="cta-bg"/>`);
      }
      lines.push(textElement({ x: anchorX, baseline: (top + bottom) / 2 + ctaLayout.fontSize * 0.35, className: "cta", layout: ctaLayout }));
    }
    addText("contact", "contact", contactLayout);
  }

  const fontFace = await commercialFontFaceCss();
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      ${fontFace}
      text { text-anchor: ${style.text_alignment === "center" ? "middle" : style.text_alignment === "left" ? "start" : "end"}; font-family: '${COMMERCIAL_FONT_IDENTITY.family}'; fill: ${palette.text}; paint-order: stroke; stroke: ${palette.stroke}; stroke-width: 8px; stroke-linejoin: round; letter-spacing: ${treatment.tracking}em; }
      .headline { font-size: ${Math.round(68 * treatment.scale)}px; font-weight: ${treatment.headlineWeight}; }
      .promotion { font-size: ${Math.round(58 * treatment.scale)}px; font-weight: ${treatment.bodyWeight}; fill: ${style.promotion_treatment === "badge" ? palette.accentText : palette.text}; ${style.promotion_treatment === "badge" ? "stroke-width: 0;" : ""} }
      .promotion-bg { fill: ${palette.accent}; }
      .cta-bg { fill: ${palette.surface}; }
      .cta { font-size: ${Math.round(42 * treatment.scale)}px; font-weight: ${treatment.bodyWeight}; stroke-width: 0; fill: ${style.cta_treatment === "text_only" ? palette.text : palette.surfaceText}; }
      .contact { font-size: 32px; font-weight: 600; stroke-width: 6px; }
    </style>
    ${lines.join("\n")}
  </svg>`;

  const canvas = sharp(Buffer.from(svg));
  if (!logoBuffer) {
    await canvas.png().toFile(input.path);
    return placement;
  }

  const targetWidth = portrait ? 360 : 420;
  const logo = await sharp(logoBuffer)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .png()
    .toBuffer();
  await canvas
    .composite([{ input: logo, top: 64, left: width - targetWidth - 64 }])
    .png()
    .toFile(input.path);
  return placement;
}
