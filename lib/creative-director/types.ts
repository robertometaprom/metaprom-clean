/**
 * Creative Director Engine — official type definitions.
 *
 * These types describe the product layer interface for creative direction.
 * They intentionally exclude UI, generation, checkout, and provider internals.
 */

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
  currentCommercialDescription?: string;
  destination?: DestinationContext;
  /** Resolved Metaprom workflow identifier for this commercial type. */
  workflow?: string;
  previousPreview?: PreviousPreviewContext;
  conversationHistory?: ConversationMessage[];
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
