import type {
  CreativeDirectorProvider,
  CreativeDirectorProviderRequest,
} from "./types";

export type { CreativeDirectorProvider, CreativeDirectorProviderRequest };

/**
 * Provider registry — mirrors the payment provider pattern.
 * The engine resolves providers by ID without importing concrete implementations.
 */

export type CreativeDirectorProviderId = "openai";

const providers: Partial<
  Record<CreativeDirectorProviderId, CreativeDirectorProvider>
> = {};

export function registerCreativeDirectorProvider(
  providerId: CreativeDirectorProviderId,
  provider: CreativeDirectorProvider,
): void {
  providers[providerId] = provider;
}

export function getConfiguredCreativeDirectorProviderId(): CreativeDirectorProviderId {
  const configured = (
    process.env.CREATIVE_DIRECTOR_PROVIDER ?? "openai"
  ).trim();

  if (configured === "openai") {
    return "openai";
  }

  return "openai";
}

export function getCreativeDirectorProvider(): CreativeDirectorProvider {
  const providerId = getConfiguredCreativeDirectorProviderId();
  const provider = providers[providerId];

  if (!provider) {
    throw new Error(
      `Creative Director provider "${providerId}" is not registered. ` +
        `Ensure the provider module is loaded before calling the engine.`,
    );
  }

  return provider;
}
