import OpenAI from "openai";
import type { ProjectContext } from "../types";
import type {
  CommercialProposal,
  CreativeDirectorProvider,
  CreativeDirectorProviderRequest,
  CreativeDirectorResponse,
  DirectorModification,
} from "../types";
import { CreativeDirectorError } from "../types";
import {
  classifyDirectorRetryReason,
  recordDirectorDiagnostic,
} from "../diagnostics";
import { parseClosedCommercialProposal } from "../proposal-contract";
import { DIRECTOR_REVISION_RETRY_INSTRUCTION } from "../revision";

const DEFAULT_MODEL =
  process.env.OPENAI_CREATIVE_DIRECTOR_MODEL ?? "gpt-4.1";

export type OpenAICreativeDirectorProviderOptions = {
  client?: OpenAI;
  model?: string;
};

function getOpenAIClient(existing?: OpenAI): OpenAI {
  if (existing) return existing;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new CreativeDirectorError("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function formatProjectContext(context: ProjectContext): string {
  const sections: string[] = [];

  if (context.currentImage?.url || context.currentImage?.description) {
    const imageParts: string[] = [];
    if (context.currentImage.url) {
      imageParts.push(`Image URL: ${context.currentImage.url}`);
    }
    if (context.currentImage.description) {
      imageParts.push(`Image description: ${context.currentImage.description}`);
    }
    sections.push(`## Current Image\n${imageParts.join("\n")}`);
  }

  if (
    typeof context.sourcePhotoCount === "number" &&
    Number.isFinite(context.sourcePhotoCount) &&
    context.sourcePhotoCount > 0
  ) {
    const count = Math.floor(context.sourcePhotoCount);
    sections.push(
      count === 1
        ? "## Source Photos\n1 source photo loaded."
        : `## Source Photos\n${count} source photos loaded.`,
    );
  }

  if (context.currentCommercialDescription) {
    sections.push(
      `## Current Commercial Description\n${context.currentCommercialDescription}`,
    );
  }

  if (context.destination) {
    const destinationParts: string[] = [];
    if (context.destination.platform) {
      destinationParts.push(`Platform: ${context.destination.platform}`);
    }
    if (context.destination.aspectRatio) {
      destinationParts.push(`Aspect ratio: ${context.destination.aspectRatio}`);
    }
    if (context.destination.width && context.destination.height) {
      destinationParts.push(
        `Dimensions: ${context.destination.width}x${context.destination.height}`,
      );
    }
    if (destinationParts.length > 0) {
      sections.push(`## Destination\n${destinationParts.join("\n")}`);
    }
  }

  if (context.workflow) {
    sections.push(`## Workflow\n${context.workflow}`);
  }

  if (context.previousPreview?.url || context.previousPreview?.description) {
    const previewParts: string[] = [];
    if (context.previousPreview.url) {
      previewParts.push(`Preview URL: ${context.previousPreview.url}`);
    }
    if (context.previousPreview.description) {
      previewParts.push(
        `Preview notes: ${context.previousPreview.description}`,
      );
    }
    sections.push(`## Previous Preview\n${previewParts.join("\n")}`);
  }

  if (context.lastCompletedProposal) {
    sections.push(
      `## Last Completed Proposal\n${JSON.stringify(context.lastCompletedProposal)}`,
    );
  }

  if (context.conversationHistory && context.conversationHistory.length > 0) {
    const history = context.conversationHistory
      .map(
        (entry) =>
          `${entry.role === "customer" ? "Customer" : "Director"}: ${entry.content}`,
      )
      .join("\n\n");
    sections.push(`## Conversation History\n${history}`);
  }

  if (sections.length === 0) {
    return "No session context available yet.";
  }

  return sections.join("\n\n");
}

function buildUserMessage(request: CreativeDirectorProviderRequest): string {
  const contextBlock = formatProjectContext(request.projectContext);

  return `# Session Context

${contextBlock}

# Customer Message

${request.customerMessage.trim()}`;
}

type ParsedProviderPayload = {
  message?: string;
  needsClarification?: boolean;
  clarifyingQuestions?: string[];
  modifications?: DirectorModification[];
  proposal?: CommercialProposal;
};

class InvalidClosedProposalError extends CreativeDirectorError {
  readonly conversational: CreativeDirectorResponse;
  readonly validatorDetail: string;

  constructor(
    conversational: CreativeDirectorResponse,
    validatorDetail: string,
  ) {
    super(
      `Creative Director provider returned an invalid closed commercial proposal contract: ${validatorDetail}`,
    );
    this.name = "InvalidClosedProposalError";
    this.conversational = conversational;
    this.validatorDetail = validatorDetail;
  }
}

function parseProviderResponse(raw: string): CreativeDirectorResponse {
  let parsed: ParsedProviderPayload;

  try {
    parsed = JSON.parse(raw) as ParsedProviderPayload;
  } catch {
    recordDirectorDiagnostic({
      event: "director.parse_outcome",
      outcome: "invalid_json",
    });
    throw new CreativeDirectorError(
      "Creative Director provider returned invalid JSON.",
    );
  }

  if (!parsed.message || typeof parsed.message !== "string") {
    recordDirectorDiagnostic({
      event: "director.parse_outcome",
      outcome: "missing_message",
    });
    throw new CreativeDirectorError(
      "Creative Director provider response missing required message field.",
    );
  }

  const needsClarification = parsed.needsClarification === true;
  const clarifyingQuestions = Array.isArray(parsed.clarifyingQuestions)
    ? parsed.clarifyingQuestions.filter(
        (question): question is string => typeof question === "string",
      )
    : undefined;

  const modifications = Array.isArray(parsed.modifications)
    ? parsed.modifications.filter(
        (entry): entry is DirectorModification =>
          Boolean(entry) &&
          typeof entry === "object" &&
          typeof (entry as DirectorModification).whatChanged === "string" &&
          typeof (entry as DirectorModification).whyChanged === "string" &&
          typeof (entry as DirectorModification).productionBenefit === "string",
      )
    : undefined;

  const conversational: CreativeDirectorResponse = {
    message: parsed.message.trim(),
    needsClarification,
    clarifyingQuestions:
      clarifyingQuestions && clarifyingQuestions.length > 0
        ? clarifyingQuestions
        : undefined,
    modifications:
      modifications && modifications.length > 0 ? modifications : undefined,
  };

  if (!parsed.proposal) {
    recordDirectorDiagnostic({
      event: "director.parse_outcome",
      outcome: "missing_proposal",
    });
    return conversational;
  }

  const parsedProposal = parseClosedCommercialProposal(parsed.proposal);
  if ("failure" in parsedProposal) {
    recordDirectorDiagnostic({
      event: "director.parse_outcome",
      outcome: "invalid_proposal",
      validatorCode: parsedProposal.failure.code,
    });
    throw new InvalidClosedProposalError(
      conversational,
      parsedProposal.failure.detail,
    );
  }

  recordDirectorDiagnostic({
    event: "director.parse_outcome",
    outcome: "valid_proposal",
  });
  return {
    ...conversational,
    proposal: parsedProposal.proposal,
  };
}

export function createOpenAICreativeDirectorProvider(
  options: OpenAICreativeDirectorProviderOptions = {},
): CreativeDirectorProvider {
  const client = getOpenAIClient(options.client);
  const model = options.model ?? DEFAULT_MODEL;

  return {
    async generate(
      request: CreativeDirectorProviderRequest,
    ): Promise<CreativeDirectorResponse> {
      let validationFailure: Error | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: buildUserMessage(request) },
            ...(validationFailure ? [{
              role: "user" as const,
              content: `Your previous structured proposal failed validation: ${validationFailure.message}. Return a corrected complete JSON response.`,
            }] : []),
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content?.trim();
        if (!content) {
          validationFailure = new CreativeDirectorError("Creative Director provider returned an empty response.");
          if (attempt === 0) {
            recordDirectorDiagnostic({
              event: "director.provider_attempt",
              attempt: 0,
              retryReason: "empty",
            });
          }
          continue;
        }
        try {
          const parsed = parseProviderResponse(content);
          if (
            attempt === 0 &&
            !parsed.proposal &&
            !parsed.needsClarification &&
            request.projectContext.lastCompletedProposal
          ) {
            validationFailure = new CreativeDirectorError(
              DIRECTOR_REVISION_RETRY_INSTRUCTION,
            );
            recordDirectorDiagnostic({
              event: "director.provider_attempt",
              attempt: 0,
              retryReason: "missing_revision_proposal",
            });
            continue;
          }
          recordDirectorDiagnostic({
            event: "director.provider_final",
            final: parsed.proposal
              ? "returned_with_proposal"
              : "returned_without_proposal",
            attempt: attempt === 0 ? 0 : 1,
          });
          return parsed;
        } catch (error) {
          if (error instanceof InvalidClosedProposalError && attempt === 1) {
            recordDirectorDiagnostic({
              event: "director.provider_final",
              final: "fallback_invalid_proposal",
              attempt: 1,
            });
            return error.conversational;
          }
          validationFailure = error instanceof Error ? error : new Error(String(error));
          if (attempt === 0) {
            const retryReason = classifyDirectorRetryReason(validationFailure);
            recordDirectorDiagnostic({
              event: "director.provider_attempt",
              attempt: 0,
              ...(retryReason ? { retryReason } : {}),
            });
          }
        }
      }
      recordDirectorDiagnostic({
        event: "director.provider_final",
        final: "thrown",
        attempt: 1,
      });
      throw validationFailure ?? new CreativeDirectorError("Creative Director proposal validation failed.");
    },
  };
}

