import {
  createCreativeProposalV2,
  buildCommercialProposalFromBrief,
  buildVisualGenerationIntent,
  assertNoInternalLanguageLeakage,
  containsInternalLanguage,
  DIRECTOR_V2_FAILURE_MESSAGE,
} from "./engine";
import {
  createOpenAICreativeDirectorV2Provider,
  getCreativeDirectorV2Provider,
  parseDirectorV2ProviderPayload,
  registerCreativeDirectorV2Provider,
} from "./provider";
import {
  CREATIVE_DIRECTOR_V2_SYSTEM_PROMPT,
  getCreativeDirectorV2SystemPrompt,
} from "./prompt";

export type {
  CommercialProposal,
  CreativeDirectorResponse,
  ProjectContext,
} from "../creative-director/types";

export type {
  CreateCreativeProposalV2Input,
  CreateCreativeProposalV2Options,
  DirectorV2CreativeBrief,
  DirectorV2Provider,
  DirectorV2ProviderRequest,
  DirectorV2ProviderResult,
} from "./types";

export { CreativeDirectorError } from "../creative-director/types";

export {
  createCreativeProposalV2,
  buildCommercialProposalFromBrief,
  buildVisualGenerationIntent,
  assertNoInternalLanguageLeakage,
  containsInternalLanguage,
  DIRECTOR_V2_FAILURE_MESSAGE,
  CREATIVE_DIRECTOR_V2_SYSTEM_PROMPT,
  getCreativeDirectorV2SystemPrompt,
  createOpenAICreativeDirectorV2Provider,
  getCreativeDirectorV2Provider,
  registerCreativeDirectorV2Provider,
  parseDirectorV2ProviderPayload,
};

export { parseClosedCommercialProposal } from "../creative-director/proposal-contract";

registerCreativeDirectorV2Provider(
  "openai",
  createOpenAICreativeDirectorV2Provider(),
);
