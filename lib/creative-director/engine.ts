import { boundConversationHistoryForModel } from "../studio/director-session";
import { getCreativeDirectorSystemPrompt } from "./prompt";
import { getCreativeDirectorProvider } from "./provider";
import { resolveDirectorRevisionResponse } from "./revision";
import type {
  CreateCreativeProposalInput,
  CreateCreativeProposalOptions,
  CreativeDirectorResponse,
  ProjectContext,
} from "./types";
import { CreativeDirectorError } from "./types";
import { validateCreativeRequest } from "./validation";

function normalizeProjectContext(
  context: ProjectContext | undefined,
): ProjectContext {
  return context ?? {};
}

function assertCustomerMessage(message: string): string {
  const trimmed = message.trim();

  if (!trimmed) {
    throw new CreativeDirectorError("customerMessage is required.");
  }

  return trimmed;
}

/**
 * Creates a Creative Director proposal from the customer's message and session context.
 *
 * This is the single public entry point for the Creative Director Engine.
 * The engine orchestrates creative reasoning and optional validation — it knows
 * nothing about UI, Studio, Checkout, Preview, or Premium generation.
 */
export async function createCreativeProposal(
  input: CreateCreativeProposalInput,
  options: CreateCreativeProposalOptions = {},
): Promise<CreativeDirectorResponse> {
  const customerMessage = assertCustomerMessage(input.customerMessage);
  const projectContext = normalizeProjectContext(input.projectContext);
  const provider = options.provider ?? getCreativeDirectorProvider();
  const validators = options.validators ?? [];

  const preValidation = await validateCreativeRequest(
    { customerMessage, projectContext },
    validators,
  );

  if (!preValidation.isValid) {
    return buildValidationBlockedResponse(preValidation);
  }

  const modelContext: ProjectContext = {
    ...projectContext,
    conversationHistory: boundConversationHistoryForModel(
      projectContext.conversationHistory,
    ),
  };

  const response = await provider.generate({
    systemPrompt: getCreativeDirectorSystemPrompt({
      anonymousMode: options.anonymousMode,
    }),
    customerMessage,
    projectContext: modelContext,
  });

  if (!response.proposal) {
    return resolveDirectorRevisionResponse({
      lastCompletedProposal: projectContext.lastCompletedProposal,
      response,
    });
  }

  const postValidation = await validateCreativeRequest(
    {
      customerMessage,
      projectContext,
      proposal: response.proposal,
    },
    validators,
  );

  if (postValidation.isValid) {
    return resolveDirectorRevisionResponse({
      lastCompletedProposal: projectContext.lastCompletedProposal,
      response,
    });
  }

  return resolveDirectorRevisionResponse({
    lastCompletedProposal: projectContext.lastCompletedProposal,
    response: buildValidationBlockedResponse(postValidation, response),
  });
}

function buildValidationBlockedResponse(
  validation: Awaited<ReturnType<typeof validateCreativeRequest>>,
  priorResponse?: CreativeDirectorResponse,
): CreativeDirectorResponse {
  const blockingMessages = validation.blockingReasons.map(
    (reason) => reason.explanation || reason.message,
  );

  const alternativeMessage = validation.optimizedAlternative
    ? `\n\n${validation.optimizedAlternative.description}\n\nThis direction preserves your intent: ${validation.optimizedAlternative.preservesIntent}`
    : "";

  const suggestionMessages = validation.suggestions
    .map((suggestion) => suggestion.message)
    .join(" ");

  const message =
    blockingMessages.join(" ") +
    alternativeMessage +
    (suggestionMessages ? `\n\n${suggestionMessages}` : "");

  return {
    message: message.trim() || priorResponse?.message || "",
    needsClarification: true,
    clarifyingQuestions: priorResponse?.clarifyingQuestions,
    modifications: priorResponse?.modifications,
    proposal: priorResponse?.proposal,
  };
}
