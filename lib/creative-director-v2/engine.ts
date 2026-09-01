import { parseClosedCommercialProposal } from "../creative-director/proposal-contract";
import type {
  CreativeDirectorResponse,
  ProjectContext,
} from "../creative-director/types";
import { CreativeDirectorError } from "../creative-director/types";
import {
  containsInternalLanguage,
  DIRECTOR_V2_FAILURE_MESSAGE,
} from "./output-guard";
import { getCreativeDirectorV2SystemPrompt } from "./prompt";
import { buildCommercialProposalFromBrief } from "./proposal-builder";
import { getCreativeDirectorV2Provider } from "./provider";
import type {
  CreateCreativeProposalV2Input,
  CreateCreativeProposalV2Options,
  DirectorV2Provider,
} from "./types";

function assertCustomerMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new CreativeDirectorError("customerMessage is required.");
  }
  return trimmed;
}

function failureResponse(): CreativeDirectorResponse {
  return {
    message: DIRECTOR_V2_FAILURE_MESSAGE,
    needsClarification: false,
  };
}

function clarificationResponse(question: string): CreativeDirectorResponse {
  return {
    message: question,
    needsClarification: true,
    clarifyingQuestions: [question],
  };
}

/**
 * Director V2 entry point — single provider call, deterministic proposal
 * construction, closed-contract validation, human-safe fallback.
 */
export async function createCreativeProposalV2(
  input: CreateCreativeProposalV2Input,
  options: CreateCreativeProposalV2Options = {},
): Promise<CreativeDirectorResponse> {
  const customerMessage = assertCustomerMessage(input.customerMessage);
  const projectContext: ProjectContext = input.projectContext ?? {};
  const provider: DirectorV2Provider =
    options.provider ?? getCreativeDirectorV2Provider();

  let providerResult;
  try {
    providerResult = await provider.generate({
      systemPrompt: getCreativeDirectorV2SystemPrompt(),
      customerMessage,
      projectContext,
    });
  } catch {
    return failureResponse();
  }

  if (containsInternalLanguage(providerResult.message)) {
    return failureResponse();
  }

  if (providerResult.needsClarification) {
    const question =
      providerResult.clarifyingQuestion?.trim() || providerResult.message.trim();
    if (!question || containsInternalLanguage(question)) {
      return failureResponse();
    }
    return clarificationResponse(question);
  }

  if (!providerResult.creative) {
    return failureResponse();
  }

  try {
    const proposal = buildCommercialProposalFromBrief(
      providerResult.creative,
      projectContext,
    );
    const parsed = parseClosedCommercialProposal(proposal);
    if ("failure" in parsed) {
      return failureResponse();
    }

    const customerMessageOut = providerResult.message.trim();
    if (containsInternalLanguage(customerMessageOut)) {
      return failureResponse();
    }

    return {
      message: customerMessageOut,
      needsClarification: false,
      proposal: parsed.proposal,
    };
  } catch {
    return failureResponse();
  }
}

export {
  buildVisualGenerationIntent,
  buildCommercialProposalFromBrief,
} from "./proposal-builder";
export {
  assertNoInternalLanguageLeakage,
  containsInternalLanguage,
  DIRECTOR_V2_FAILURE_MESSAGE,
} from "./output-guard";
