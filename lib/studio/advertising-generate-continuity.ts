/**
 * Client-side continuity for Advertising Image Generate → registration.
 * Preserves Director/prompt/mode across OAuth without durable server chat storage.
 */

import type { ConversationMessage } from "@/lib/creative-director/types";
import type { CreationMode } from "@/lib/studio-creation";

export const ADVERTISING_GENERATE_CONTINUITY_KEY =
  "metaprom_advertising_generate_continuity" as const;

export type AdvertisingGenerateContinuity = {
  version: 1;
  creationMode: CreationMode;
  customerIntent: string;
  imagePrompt: string;
  input: string;
  directorMessages: ConversationMessage[];
  directorSessionKey: string;
  workflowId: string | null;
  industry: string | null;
  awaitingGenerate: true;
  savedAt: string;
};

export function saveAdvertisingGenerateContinuity(
  snapshot: Omit<AdvertisingGenerateContinuity, "version" | "awaitingGenerate" | "savedAt">,
): void {
  if (typeof window === "undefined") return;

  const payload: AdvertisingGenerateContinuity = {
    version: 1,
    awaitingGenerate: true,
    savedAt: new Date().toISOString(),
    ...snapshot,
  };

  try {
    sessionStorage.setItem(
      ADVERTISING_GENERATE_CONTINUITY_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readAdvertisingGenerateContinuity(): AdvertisingGenerateContinuity | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(ADVERTISING_GENERATE_CONTINUITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdvertisingGenerateContinuity;
    if (
      parsed?.version !== 1 ||
      parsed.awaitingGenerate !== true ||
      parsed.creationMode !== "advertising_image"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearAdvertisingGenerateContinuity(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADVERTISING_GENERATE_CONTINUITY_KEY);
  } catch {
    // ignore
  }
}
