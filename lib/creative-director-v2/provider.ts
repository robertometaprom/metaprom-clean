import OpenAI from "openai";
import type { ProjectContext } from "../creative-director/types";
import { CreativeDirectorError } from "../creative-director/types";
import { getCreativeDirectorV2SystemPrompt } from "./prompt";
import type {
  DirectorV2CreativeBrief,
  DirectorV2Provider,
  DirectorV2ProviderRequest,
  DirectorV2ProviderResult,
} from "./types";

const DEFAULT_MODEL =
  process.env.OPENAI_CREATIVE_DIRECTOR_V2_MODEL ??
  process.env.OPENAI_CREATIVE_DIRECTOR_MODEL ??
  "gpt-4.1";

export type OpenAICreativeDirectorV2ProviderOptions = {
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
    if (context.currentImage.url) imageParts.push(`Image URL: ${context.currentImage.url}`);
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

  if (context.lastCompletedProposal) {
    sections.push(
      `## Last Completed Proposal\n${JSON.stringify(context.lastCompletedProposal)}`,
    );
  }

  if (context.conversationHistory?.length) {
    const history = context.conversationHistory
      .map(
        (entry) =>
          `${entry.role === "customer" ? "Customer" : "Director"}: ${entry.content}`,
      )
      .join("\n\n");
    sections.push(`## Conversation History\n${history}`);
  }

  return sections.length > 0 ? sections.join("\n\n") : "No session context available yet.";
}

function buildUserMessage(request: DirectorV2ProviderRequest): string {
  return `# Session Context

${formatProjectContext(request.projectContext)}

# Customer Message

${request.customerMessage.trim()}`;
}

type ParsedPayload = {
  message?: string;
  needsClarification?: boolean;
  clarifyingQuestion?: string;
  creative?: DirectorV2CreativeBrief;
};

function parseCreativeBrief(value: unknown): DirectorV2CreativeBrief | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const brief = value as Record<string, unknown>;
  const stringFields = [
    "summary",
    "openingHook",
    "productHeroMoment",
    "emotionalTone",
    "pacing",
    "callToAction",
    "narrative",
  ] as const;

  for (const field of stringFields) {
    if (typeof brief[field] !== "string" || !brief[field].trim()) return undefined;
  }

  if (!Array.isArray(brief.visualEvents) || brief.visualEvents.length < 1) {
    return undefined;
  }

  const visualEvents = brief.visualEvents.filter(
    (event): event is string => typeof event === "string" && event.trim().length > 0,
  );
  if (visualEvents.length < 1) return undefined;

  const result: DirectorV2CreativeBrief = {
    summary: brief.summary as string,
    openingHook: brief.openingHook as string,
    productHeroMoment: brief.productHeroMoment as string,
    emotionalTone: brief.emotionalTone as string,
    pacing: brief.pacing as string,
    callToAction: brief.callToAction as string,
    narrative: brief.narrative as string,
    visualEvents,
  };

  if (typeof brief.spokenCopy === "string" && brief.spokenCopy.trim()) {
    result.spokenCopy = brief.spokenCopy.trim();
  }

  if (brief.promotionalOverlay && typeof brief.promotionalOverlay === "object") {
    result.promotionalOverlay = brief.promotionalOverlay as DirectorV2CreativeBrief["promotionalOverlay"];
  }

  if (brief.sourceImageFidelity === "protected" || brief.sourceImageFidelity === "flexible") {
    result.sourceImageFidelity = brief.sourceImageFidelity;
  }

  if (brief.overlayStyle && typeof brief.overlayStyle === "object") {
    result.overlayStyle = brief.overlayStyle as DirectorV2CreativeBrief["overlayStyle"];
  }

  return result;
}

export function parseDirectorV2ProviderPayload(raw: string): DirectorV2ProviderResult {
  let parsed: ParsedPayload;
  try {
    parsed = JSON.parse(raw) as ParsedPayload;
  } catch {
    throw new CreativeDirectorError("Director V2 provider returned invalid JSON.");
  }

  if (!parsed.message || typeof parsed.message !== "string") {
    throw new CreativeDirectorError("Director V2 provider response missing message.");
  }

  const needsClarification = parsed.needsClarification === true;
  const clarifyingQuestion =
    typeof parsed.clarifyingQuestion === "string"
      ? parsed.clarifyingQuestion.trim()
      : undefined;

  if (needsClarification) {
    const question = clarifyingQuestion || parsed.message.trim();
    return {
      message: question,
      needsClarification: true,
      clarifyingQuestion: question,
    };
  }

  const creative = parseCreativeBrief(parsed.creative);
  return {
    message: parsed.message.trim(),
    needsClarification: false,
    creative,
  };
}

export function createOpenAICreativeDirectorV2Provider(
  options: OpenAICreativeDirectorV2ProviderOptions = {},
): DirectorV2Provider {
  const client = getOpenAIClient(options.client);
  const model = options.model ?? DEFAULT_MODEL;

  return {
    async generate(request: DirectorV2ProviderRequest): Promise<DirectorV2ProviderResult> {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: request.systemPrompt || getCreativeDirectorV2SystemPrompt(),
          },
          { role: "user", content: buildUserMessage(request) },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new CreativeDirectorError("Director V2 provider returned an empty response.");
      }

      return parseDirectorV2ProviderPayload(content);
    },
  };
}

export type CreativeDirectorV2ProviderId = "openai";

const providers: Partial<Record<CreativeDirectorV2ProviderId, DirectorV2Provider>> = {};

export function registerCreativeDirectorV2Provider(
  providerId: CreativeDirectorV2ProviderId,
  provider: DirectorV2Provider,
): void {
  providers[providerId] = provider;
}

export function getCreativeDirectorV2Provider(): DirectorV2Provider {
  const provider = providers.openai;
  if (!provider) {
    throw new Error(
      "Creative Director V2 provider is not registered. Import lib/creative-director-v2 before use.",
    );
  }
  return provider;
}

export type { DirectorV2Provider, DirectorV2ProviderRequest, DirectorV2ProviderResult };
