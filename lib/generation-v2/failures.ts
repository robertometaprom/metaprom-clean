/**
 * Failure classification + retry / user-safe messaging (Architecture Freeze §11).
 */

import type {
  GenerationFailureClass,
  GenerationFailureRetryability,
  GenerationJobError,
  GenerationJobStatus,
} from "./types";

export type FailurePolicy = {
  class: GenerationFailureClass;
  retryability: GenerationFailureRetryability;
  maxAttempts: number;
  userMessage: string;
};

const POLICIES: Record<GenerationFailureClass, FailurePolicy> = {
  invalid_input: {
    class: "invalid_input",
    retryability: "non_retryable",
    maxAttempts: 0,
    userMessage: "Fix request / re-approve Director",
  },
  image_provider: {
    class: "image_provider",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't prepare scene; retry",
  },
  image_timeout: {
    class: "image_timeout",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Taking too long; retry",
  },
  video_provider: {
    class: "video_provider",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't create commercial",
  },
  video_timeout: {
    class: "video_timeout",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't create commercial",
  },
  malformed_provider_response: {
    class: "malformed_provider_response",
    retryability: "non_retryable",
    maxAttempts: 1,
    userMessage: "Couldn't create commercial",
  },
  empty_video: {
    class: "empty_video",
    retryability: "non_retryable",
    maxAttempts: 1,
    userMessage: "Couldn't create commercial",
  },
  storage: {
    class: "storage",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't save; we'll retry",
  },
  db: {
    class: "db",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't save",
  },
  persistence_inconsistency: {
    class: "persistence_inconsistency",
    retryability: "retryable",
    maxAttempts: 3,
    userMessage: "Couldn't finish save",
  },
  internal: {
    class: "internal",
    retryability: "retryable",
    maxAttempts: 2,
    userMessage: "Something went wrong. Try again.",
  },
};

export function failurePolicy(cls: GenerationFailureClass): FailurePolicy {
  return POLICIES[cls];
}

export function shouldRetry(input: {
  class: GenerationFailureClass;
  attempt: number;
}): boolean {
  const policy = failurePolicy(input.class);
  if (policy.retryability !== "retryable") {
    return input.attempt < policy.maxAttempts;
  }
  return input.attempt < policy.maxAttempts;
}

export function buildJobError(input: {
  class: GenerationFailureClass;
  message: string;
  attempt: number;
  atStatus: GenerationJobStatus;
  detail?: string | null;
}): GenerationJobError {
  const policy = failurePolicy(input.class);
  return {
    class: input.class,
    retryability: policy.retryability,
    message: input.message,
    userMessage: policy.userMessage,
    attempt: input.attempt,
    atStatus: input.atStatus,
    detail: input.detail ?? null,
  };
}

export class GenerationProviderError extends Error {
  readonly failureClass: GenerationFailureClass;
  readonly detail: string | null;

  constructor(
    failureClass: GenerationFailureClass,
    message: string,
    detail?: string | null,
  ) {
    super(message);
    this.name = "GenerationProviderError";
    this.failureClass = failureClass;
    this.detail = detail ?? null;
  }
}
