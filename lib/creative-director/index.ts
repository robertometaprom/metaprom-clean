import { createCreativeProposal } from "./engine";
import {
  getConfiguredCreativeDirectorProviderId,
  getCreativeDirectorProvider,
  registerCreativeDirectorProvider,
} from "./provider";
import { createOpenAICreativeDirectorProvider } from "./providers/openai";
import {
  CREATIVE_DIRECTOR_SYSTEM_PROMPT,
  getCreativeDirectorSystemPrompt,
} from "./prompt";
import { validateCreativeRequest } from "./validation";

export type {
  CommercialProposal,
  ConversationMessage,
  CreateCreativeProposalInput,
  CreateCreativeProposalOptions,
  CreativeDirectorProvider,
  CreativeDirectorProviderRequest,
  CreativeDirectorResponse,
  CreativeValidationRequest,
  CreativeValidationResult,
  CreativeValidator,
  CurrentImageContext,
  DestinationContext,
  DirectorModification,
  OptimizedAlternative,
  PreviousPreviewContext,
  ProjectContext,
  ValidationBlockingReason,
  ValidationCategory,
  ValidationSuggestion,
  ValidationWarning,
} from "./types";

export { CreativeDirectorError } from "./types";
export type { CreativeDirectorProviderId } from "./provider";

export {
  createCreativeProposal,
  CREATIVE_DIRECTOR_SYSTEM_PROMPT,
  getCreativeDirectorSystemPrompt,
  getConfiguredCreativeDirectorProviderId,
  getCreativeDirectorProvider,
  registerCreativeDirectorProvider,
  validateCreativeRequest,
};

export { createOpenAICreativeDirectorProvider } from "./providers/openai";

registerCreativeDirectorProvider(
  "openai",
  createOpenAICreativeDirectorProvider(),
);
