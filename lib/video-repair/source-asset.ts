import { existsSync } from "fs";
import { VideoRepairError } from "./types";

/**
 * Commercial Rescue R1 latest-valid-version invariant:
 * a repair must receive an explicitly selected current source asset.
 * Filename tokens such as "final" are not provenance and must never be
 * used as a silent fallback to an older historical file.
 */
export type CurrentSourceAsset = {
  path: string;
  reason: "explicit";
};

export function resolveCurrentSourceAsset(request: {
  explicitSourcePath?: string | null;
}): CurrentSourceAsset {
  const explicitSourcePath = request.explicitSourcePath?.trim() ?? "";
  if (!explicitSourcePath) {
    throw new VideoRepairError(
      "source_unresolved",
      "Repair must receive an explicitly selected current source asset. Do not infer one from a 'final' filename.",
    );
  }

  if (!existsSync(explicitSourcePath)) {
    throw new VideoRepairError(
      "source_unresolved",
      "Explicit source asset does not exist.",
      { explicitSourcePath },
    );
  }

  return { path: explicitSourcePath, reason: "explicit" };
}
