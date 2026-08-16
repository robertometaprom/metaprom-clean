import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const COMMERCIAL_FONT_IDENTITY = {
  family: "Metaprom Geist",
  upstream: "vercel/geist-font",
  version: "1.7.2",
  license: "SIL Open Font License 1.1",
  path: "public/fonts/geist/Geist-Variable.ttf",
  licensePath: "public/fonts/geist/OFL.txt",
  sha256: "73894e0448cae90a92b6c2f8732b7bb9acb7b94c418bff559dad4a18e1de9659",
  weights: [600, 700] as const,
} as const;

let fontDataPromise: Promise<string> | undefined;

export function loadCommercialFontData(): Promise<string> {
  // Keep path segments static so Next's file tracer includes only this asset.
  fontDataPromise ??= readFile(resolve(process.cwd(), "public", "fonts", "geist", "Geist-Variable.ttf"))
    .then((buffer) => {
      const digest = createHash("sha256").update(buffer).digest("hex");
      if (digest !== COMMERCIAL_FONT_IDENTITY.sha256) {
        throw new Error("Packaged commercial font failed exact SHA-256 verification.");
      }
      return buffer.toString("base64");
    });
  return fontDataPromise;
}

export async function commercialFontFaceCss(): Promise<string> {
  const data = await loadCommercialFontData();
  return `@font-face { font-family: '${COMMERCIAL_FONT_IDENTITY.family}'; src: url(data:font/ttf;base64,${data}) format('truetype'); font-style: normal; font-weight: 100 900; }`;
}
