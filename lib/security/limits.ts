/** Shared server-side request limits for Studio and Creative Director APIs. */

export const MAX_JSON_BODY_BYTES = 256 * 1024;

export const MAX_DRAFT_FORM_BYTES = 52 * 1024 * 1024;

export const MAX_CUSTOMER_MESSAGE_LENGTH = 2_000;

export const MAX_CONVERSATION_HISTORY_MESSAGES = 20;

export const MAX_CONVERSATION_MESSAGE_LENGTH = 2_000;

export const MAX_ORIGINAL_FILE_BYTES = 20 * 1024 * 1024;

export const MAX_ENHANCED_FILE_BYTES = 15 * 1024 * 1024;

export const MAX_TEASER_FILE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_DRAFT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_DRAFT_TEASER_TYPES = new Set(["video/mp4"]);

/** Anonymous Creative Director: requests per IP per hour. */
export const ANON_DIRECTOR_RATE_LIMIT = 15;

/** Anonymous draft saves per IP per hour. */
export const ANON_DRAFT_SAVE_RATE_LIMIT = 10;

/** Anonymous draft reads per IP per hour. */
export const ANON_DRAFT_READ_RATE_LIMIT = 30;

/** Rate limit window (1 hour). */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Max customer turns in anonymous Director session once an image exists. */
export const ANON_MAX_CUSTOMER_TURNS_WITH_IMAGE = 3;
