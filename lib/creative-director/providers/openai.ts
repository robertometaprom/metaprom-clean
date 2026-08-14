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
  PROTECTED_REASON_VALUES,
  type CommercialProductionProfile,
} from "../../commercial-production-profile";

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

function isCommercialProposal(value: unknown): value is CommercialProposal {
  if (!value || typeof value !== "object") return false;

  const proposal = value as Record<string, unknown>;
  return (
    typeof proposal.summary === "string" &&
    typeof proposal.openingHook === "string" &&
    typeof proposal.productHeroMoment === "string" &&
    typeof proposal.emotionalTone === "string" &&
    typeof proposal.pacing === "string" &&
    typeof proposal.callToAction === "string" &&
    typeof proposal.narrative === "string" &&
    typeof proposal.visualGenerationIntent === "string" &&
    isProductionProfile(proposal.productionProfile) &&
    Boolean(proposal.promotionalOverlays) &&
    typeof proposal.promotionalOverlays === "object"
  );
}

function isProductionProfile(value: unknown): value is CommercialProductionProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<CommercialProductionProfile>;
  return (
    (profile.fidelity_class === "protected" || profile.fidelity_class === "flexible") &&
    typeof profile.preserve_product_identity === "boolean" &&
    profile.veo_copy_policy === "deterministic_overlay_only" &&
    Array.isArray(profile.protected_reasons) &&
    profile.protected_reasons.every((reason) =>
      PROTECTED_REASON_VALUES.includes(reason),
    )
  );
}

function parseProviderResponse(raw: string): CreativeDirectorResponse {
  let parsed: ParsedProviderPayload;

  try {
    parsed = JSON.parse(raw) as ParsedProviderPayload;
  } catch {
    throw new CreativeDirectorError(
      "Creative Director provider returned invalid JSON.",
    );
  }

  if (!parsed.message || typeof parsed.message !== "string") {
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

  const proposal =
    parsed.proposal && isCommercialProposal(parsed.proposal)
      ? parsed.proposal
      : undefined;

  return {
    message: parsed.message.trim(),
    needsClarification,
    clarifyingQuestions:
      clarifyingQuestions && clarifyingQuestions.length > 0
        ? clarifyingQuestions
        : undefined,
    modifications:
      modifications && modifications.length > 0 ? modifications : undefined,
    proposal,
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
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: buildUserMessage(request) },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new CreativeDirectorError(
          "Creative Director provider returned an empty response.",
        );
      }

      return parseProviderResponse(content);
    },
  };
}

