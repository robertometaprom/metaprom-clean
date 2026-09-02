import type { ConversationMessage } from "@/lib/creative-director/types";
import type { Mode } from "@/lib/prompts";
import type { StudioDestination } from "@/lib/studio-destination";

export const STUDIO_DRAFTS_BUCKET = "studio-drafts";

export const STUDIO_RESUME_TOKEN_KEY = "metaprom_studio_resume_token";

export type StudioDraftPendingAction = "save" | "unlock";

export type StudioDraftPhase =
  | "preview"
  | "checkout"
  | "processing_payment"
  | "processing_premium"
  | "ready";

export type StudioDraftRecord = {
  id: string;
  resume_token: string;
  phase: StudioDraftPhase;
  customer_intent: string | null;
  image_prompt: string | null;
  video_prompt: string | null;
  workflow_id: string | null;
  industry: string | null;
  intended_destination: string | null;
  destination: StudioDestination | null;
  product_mode: Mode | null;
  original_path: string | null;
  original_name: string | null;
  original_content_type: string | null;
  enhanced_path: string | null;
  teaser_path: string | null;
  share_slug: string | null;
  conversation_history: ConversationMessage[];
  pending_action: StudioDraftPendingAction | null;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type StudioDraftPayload = {
  resumeToken?: string;
  phase: StudioDraftPhase;
  customerIntent: string;
  imagePrompt: string;
  videoPrompt: string;
  workflowId?: string | null;
  industry?: string | null;
  intendedDestination?: string | null;
  destination?: StudioDestination | null;
  productMode: Mode;
  conversationHistory?: ConversationMessage[];
  pendingAction?: StudioDraftPendingAction | null;
};

export type StudioDraftAssetUrls = {
  originalUrl: string | null;
  enhancedUrl: string | null;
  teaserUrl: string | null;
};

export type StudioDraftResponse = {
  draft: StudioDraftRecord;
  urls: StudioDraftAssetUrls;
};

export function buildStudioDraftObjectPath(
  resumeToken: string,
  kind: "original" | "enhanced" | "teaser",
  extension: string,
): string {
  return `${resumeToken}/${kind}.${extension.replace(/^\./, "")}`;
}

export function buildStudioResumeUrl(resumeToken: string): string {
  return `/studio?resume=${encodeURIComponent(resumeToken)}`;
}

export function createResumeToken(): string {
  return crypto.randomUUID();
}
