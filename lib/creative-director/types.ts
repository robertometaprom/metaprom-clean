/**
 * Creative Director Engine — official type definitions.
 *
 * These types describe the product layer interface for creative direction.
 * They intentionally exclude UI, generation, checkout, and provider internals.
 */

import type {
  CommercialProductionProfile,
  PromotionalOverlays,
} from "../commercial-production-profile";
import type { OverlayStyle } from "../overlay-style-contract";
import type { RequiredNarrativeBeats } from "../narrative-beats-contract";

/** A single message in the Creative Director conversation. */
export type ConversationMessage = {
  role: "customer" | "director";
  content: string;
  timestamp?: string;
};

/** Reference to the customer's uploaded product photo. */
export type CurrentImageContext = {
  /** Public or session-scoped URL when available. */
  url?: string;
  /** Human-readable description of the image when URL is unavailable. */
  description?: string;
};

/** Where the commercial will be published. */
export type DestinationContext = {
  platform?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
};

/** Reference to a previously generated Preview commercial. */
export type PreviousPreviewContext = {
  url?: string;
  description?: string;
};

/**
 * Session-scoped context available to the Creative Director.
 * All fields are optional so the Director can operate with incomplete information.
 */
export type ProjectContext = {
  currentImage?: CurrentImageContext;
  /** Canonical Studio source-photo count (sourceFiles.length). */
  sourcePhotoCount?: number;
  currentCommercialDescription?: string;
  destination?: DestinationContext;
  /** Resolved Metaprom workflow identifier for this commercial type. */
  workflow?: string;
  previousPreview?: PreviousPreviewContext;
  conversationHistory?: ConversationMessage[];
  /** Last valid completed proposal in this session, when the customer is revising it. */
  lastCompletedProposal?: CommercialProposal;
};

/** Structured commercial proposal produced by the Creative Director. */
export type CommercialProposal = {
  summary: string;
  openingHook: string;
  productHeroMoment: string;
  emotionalTone: string;
  pacing: string;
  callToAction: string;
  /** Full proposal narrative as the Director would present it to the customer. */
  narrative: string;
  /** Visual-generation-only intent. It must exclude exact promotional graphics. */
  visualGenerationIntent: string;
  /** Ordered, observable events that must survive into every video prompt. */
  requiredNarrativeBeats: RequiredNarrativeBeats;
  productionProfile: CommercialProductionProfile;
  /** Preserved for deterministic composition in a later phase; never sent to Veo. */
  promotionalOverlays: PromotionalOverlays;
  /** Final resolved deterministic style and its winning precedence origin. */
  overlayStyle: OverlayStyle;
};

/** Transparent explanation when the Director modifies the customer's request. */
export type DirectorModification = {
  whatChanged: string;
  whyChanged: string;
  productionBenefit: string;
};

/** Output of the Creative Director Engine for a single interaction. */
export type CreativeDirectorResponse = {
  /** The Director's conversational message to the customer. */
  message: string;
  /** Structured proposal when the Director recommends a concept for production. */
  proposal?: CommercialProposal;
  /** Whether the Director needs more information before proposing. */
  needsClarification: boolean;
  /** Clarifying questions when needsClarification is true. */
  clarifyingQuestions?: string[];
  /** Visible modifications made from the customer's original request. */
  modifications?: DirectorModification[];
  /** Anonymous session ended — client should invite free account creation. */
  requiresRegistration?: boolean;
  /**
   * A completed proposal existed and this revision could not safely update it.
   * The prior proposal must not be executed as though it already contains the correction.
   */
  revisionApplyFailed?: boolean;
};

export type CreateCreativeProposalInput = {
  customerMessage: string;
  projectContext?: ProjectContext;
};

export type CreateCreativeProposalOptions = {
  provider?: CreativeDirectorProvider;
  validators?: CreativeValidator[];
  anonymousMode?: boolean;
};

// --- Provider types ---

export type CreativeDirectorProviderRequest = {
  systemPrompt: string;
  customerMessage: string;
  projectContext: ProjectContext;
};

/** Abstraction for language-model providers. The engine depends on this interface only. */
export interface CreativeDirectorProvider {
  generate(
    request: CreativeDirectorProviderRequest,
  ): Promise<CreativeDirectorResponse>;
}

// --- Validation types ---

export type ValidationCategory =
  | "trademark"
  | "celebrity"
  | "copyright"
  | "sensitive_content"
  | "image_incompatibility"
  | "destination_mismatch"
  | "other";

export type ValidationWarning = {
  category?: ValidationCategory;
  message: string;
};

export type ValidationSuggestion = {
  message: string;
};

export type ValidationBlockingReason = {
  category: ValidationCategory;
  message: string;
  /** Customer-facing explanation framed as industry production reality. */
  explanation: string;
};

export type OptimizedAlternative = {
  description: string;
  /** How the alternative preserves the customer's underlying commercial intention. */
  preservesIntent: string;
  changes: string[];
};

export type CreativeValidationResult = {
  isValid: boolean;
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  blockingReasons: ValidationBlockingReason[];
  optimizedAlternative?: OptimizedAlternative;
};

export type CreativeValidationRequest = {
  customerMessage: string;
  projectContext: ProjectContext;
  proposal?: CommercialProposal;
};

/** Interface for future validation modules (trademark, celebrity, copyright, etc.). */
export interface CreativeValidator {
  validate(
    request: CreativeValidationRequest,
  ): Promise<CreativeValidationResult>;
}

export class CreativeDirectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreativeDirectorError";
  }
}
