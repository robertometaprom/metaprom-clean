import type { OverlayStyle } from "../overlay-style-contract";
import type { PromotionalOverlayTimingOrLayout } from "../commercial-production-profile";
import type { ProjectContext } from "../creative-director/types";

/** Promotional copy the model understands — not the closed overlay contract. */
export type DirectorV2PromotionalOverlay = {
  headline?: string;
  call_to_action?: string;
  url?: string;
  phone?: string;
  price_or_promotion?: string;
  timing_or_layout?: PromotionalOverlayTimingOrLayout;
};

/** Creative brief returned by the V2 model — our code builds the closed proposal. */
export type DirectorV2CreativeBrief = {
  summary: string;
  openingHook: string;
  productHeroMoment: string;
  emotionalTone: string;
  pacing: string;
  callToAction: string;
  narrative: string;
  /** 1–4 observable on-camera events only — never spoken or graphic copy. */
  visualEvents: string[];
  /** Exact words to be spoken on camera, if any. */
  spokenCopy?: string;
  promotionalOverlay?: DirectorV2PromotionalOverlay;
  sourceImageFidelity?: "protected" | "flexible";
  overlayStyle?: Partial<OverlayStyle>;
};

export type DirectorV2ProviderRequest = {
  systemPrompt: string;
  customerMessage: string;
  projectContext: ProjectContext;
};

export type DirectorV2ProviderResult = {
  message: string;
  needsClarification?: boolean;
  clarifyingQuestion?: string;
  creative?: DirectorV2CreativeBrief;
};

export interface DirectorV2Provider {
  generate(request: DirectorV2ProviderRequest): Promise<DirectorV2ProviderResult>;
}

export type CreateCreativeProposalV2Input = {
  customerMessage: string;
  projectContext?: ProjectContext;
};

export type CreateCreativeProposalV2Options = {
  provider?: DirectorV2Provider;
};
