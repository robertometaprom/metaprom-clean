/** Shared server-side request limits for Studio and Creative Director APIs. */

export const MAX_JSON_BODY_BYTES = 256 * 1024;

export const MAX_DRAFT_FORM_BYTES = 52 * 1024 * 1024;

export const MAX_CUSTOMER_MESSAGE_LENGTH = 2_000;

export const MAX_CONVERSATION_HISTORY_MESSAGES = 20;

export const MAX_CONVERSATION_MESSAGE_LENGTH = 2_000;

export const MAX_ORIGINAL_FILE_BYTES = 20 * 1024 * 1024;

export const MAX_ENHANCED_FILE_BYTES = 15 * 1024 * 1024;

export const MAX_TEASER_FILE_BYTES = 50 * 1024 * 1024;

/** Multipart overhead on top of the image for /api/video and /api/enhancement. */
export const MAX_GENERATION_FORM_BYTES = MAX_ORIGINAL_FILE_BYTES + 2 * 1024 * 1024;

/**
 * Studio builds prompts from customer intent (2k) plus a fixed recipe.
 * 12k rejects dump/abuse without clipping Dual Creation.
 */
export const MAX_GENERATION_PROMPT_CHARS = 12_000;

export const ALLOWED_DRAFT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_DRAFT_TEASER_TYPES = new Set(["video/mp4"]);

/** Anonymous Creative Director: requests per IP per hour. */
export const ANON_DIRECTOR_RATE_LIMIT = 15;

/**
 * Authenticated Director chat. Text-only gpt-4.1 is cheaper than image/video;
 * 60/hour covers a normal Studio session without an unbounded tool loop.
 */
export const AUTH_DIRECTOR_RATE_LIMIT = 60;

/** Anonymous draft saves per IP per hour. */
export const ANON_DRAFT_SAVE_RATE_LIMIT = 10;

/** Anonymous draft reads per IP per hour. */
export const ANON_DRAFT_READ_RATE_LIMIT = 30;

/** Rate limit window (1 hour). */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Public teaser Vertex: one first-use WOW + a few safety/validation retries.
 * An automated loop should 429 well before unrestricted Veo spend.
 */
export const VIDEO_TEASER_RATE_LIMIT = 8;

/**
 * Anonymous / Commercial preview OpenAI images.
 * Dual Creation uses one image; retries for validation still fit.
 */
export const ENHANCEMENT_PREVIEW_RATE_LIMIT = 12;

/**
 * Paid Advertising Image OpenAI generations per user.
 * Entitlement remains the commercial gate; this stops generate-without-persist
 * loops. 40/hour allows a real pack session without a tight automated burn.
 */
export const ENHANCEMENT_ADVERTISING_RATE_LIMIT = 40;

/**
 * Authenticated Premium retry/fulfillment per user (API only, not webhook).
 * alreadyReady skips generation; this bounds failed-retry hammering.
 */
export const PREMIUM_VIDEO_RATE_LIMIT = 6;

/** How long a Premium generation lock is held if the process dies. Veo maxDuration is 300s. */
export const PREMIUM_GENERATION_LOCK_TTL_MS = 8 * 60 * 1000;

/** Max customer turns in anonymous Director session once an image exists. */
export const ANON_MAX_CUSTOMER_TURNS_WITH_IMAGE = 3;

/** Public Support form submissions per IP per hour. */
export const SUPPORT_RATE_LIMIT = 5;

/** Ignore identical Support resubmits for this long. */
export const SUPPORT_DUPLICATE_LOCK_TTL_MS = 10 * 60 * 1000;

export const MAX_SUPPORT_NAME_LENGTH = 80;

export const MIN_SUPPORT_NAME_LENGTH = 2;

export const MAX_SUPPORT_MESSAGE_LENGTH = 2_000;

export const MIN_SUPPORT_MESSAGE_LENGTH = 10;

export const MAX_SUPPORT_JSON_BYTES = 16 * 1024;
