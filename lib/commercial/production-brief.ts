/**
 * Provider-agnostic Production Brief contract.
 *
 * Phase 1 skeleton only. Not produced by Director, not persisted, and not
 * consumed by live generation. No provider or model names belong here.
 */

export type Bcp47Locale = string;

export type ProductLock = "exact_physical_product";

export type DurationIntent = "teaser" | "full";

export type VoiceCharacter =
  | "confident_clear"
  | "warm_conversational"
  | "energetic_bold"
  | "calm_premium";

export const SPEECH_MODES = ["none", "exact_copy"] as const;
export type SpeechMode = (typeof SPEECH_MODES)[number];

export const MUSIC_MODES = ["none", "instrumental_bed"] as const;
export type MusicMode = (typeof MUSIC_MODES)[number];

export const AMBIENCE_SFX_MODES = ["none", "picture_sync_foley"] as const;
export type AmbienceSfxMode = (typeof AMBIENCE_SFX_MODES)[number];

export type ProductionAssetRef = {
  uri: string;
  mimeType?: string;
};

export type ProductionDestination = {
  platform: string;
  aspectRatio: string;
  width?: number;
  height?: number;
};

export type VisualIntent = {
  scene: string;
  hook: string;
  heroMoment: string;
  tone: string;
  pacing: string;
  callToAction: string;
  people?: string;
  productLock: ProductLock;
  destination: ProductionDestination;
  durationIntent: DurationIntent;
};

export type ProductionReferences = {
  heroProductImage: ProductionAssetRef;
  extraImages?: ProductionAssetRef[];
};

/**
 * Spoken copy is immutable once approved.
 * `locale` is mandatory for `exact_copy` and must not be silently defaulted.
 */
export type SpeechIntent =
  | {
      mode: "none";
      copy: null;
      locale: null;
      voiceCharacter: null;
    }
  | {
      mode: "exact_copy";
      copy: string;
      locale: Bcp47Locale;
      voiceCharacter: VoiceCharacter;
    };

export type MusicIntent =
  | { mode: "none" }
  | { mode: "instrumental_bed"; mood?: string };

export type AmbienceSfxIntent =
  | { mode: "none" }
  | { mode: "picture_sync_foley" };

export type AudioIntent = {
  music: MusicIntent;
  ambienceSfx: AmbienceSfxIntent;
  forbidUnauthorizedSpeech: true;
};

export type ProductionConstraints = {
  noExtraBrands?: boolean;
  noCelebrity?: boolean;
  noCopyrightedCharacters?: boolean;
  noSensitiveContent?: boolean;
};

export type ProductionBrief = {
  visual: VisualIntent;
  references: ProductionReferences;
  speech: SpeechIntent;
  audio: AudioIntent;
  constraints: ProductionConstraints;
};
