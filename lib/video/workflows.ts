import type { CommercialTier } from "@/lib/commercial/tiers";

export type VideoWorkflow = "preview" | "premium" | "enterprise";

export type WorkflowConfig = {
  workflow: VideoWorkflow;
  tier: CommercialTier;
  vertexModel: string;
  requiresPayment: boolean;
  requiresAuth: boolean;
};

const DEFAULT_PREVIEW_MODEL = "veo-3.1-lite-generate-001";
const DEFAULT_PREMIUM_MODEL = "veo-3.1-fast-generate-001";
const DEFAULT_ENTERPRISE_MODEL = "veo-3.1-fast-generate-001";

const WORKFLOW_REGISTRY: Record<VideoWorkflow, WorkflowConfig> = {
  preview: {
    workflow: "preview",
    tier: "teaser",
    vertexModel: process.env.VEO_PREVIEW_MODEL?.trim() || DEFAULT_PREVIEW_MODEL,
    requiresPayment: false,
    requiresAuth: false,
  },
  premium: {
    workflow: "premium",
    tier: "premium",
    vertexModel:
      process.env.VEO_PREMIUM_MODEL?.trim() ||
      process.env.VEO_VERTEX_MODEL?.trim() ||
      DEFAULT_PREMIUM_MODEL,
    requiresPayment: true,
    requiresAuth: true,
  },
  enterprise: {
    workflow: "enterprise",
    tier: "premium",
    vertexModel:
      process.env.VEO_ENTERPRISE_MODEL?.trim() ||
      process.env.VEO_VERTEX_MODEL?.trim() ||
      DEFAULT_ENTERPRISE_MODEL,
    requiresPayment: true,
    requiresAuth: true,
  },
};

export function resolveWorkflow(workflow: VideoWorkflow): WorkflowConfig {
  return WORKFLOW_REGISTRY[workflow];
}

export function isVideoWorkflow(value: string): value is VideoWorkflow {
  return value === "preview" || value === "premium" || value === "enterprise";
}

export function resolveVideoWorkflowFromLegacyTier(
  tier: "teaser" | "premium",
): VideoWorkflow {
  return tier === "premium" ? "premium" : "preview";
}

export function resolveVideoWorkflowFromRequest(input: {
  workflow?: string | null;
  tier?: string | null;
}): VideoWorkflow {
  const workflow = input.workflow?.trim();

  if (workflow && isVideoWorkflow(workflow)) {
    return workflow;
  }

  const tier = input.tier?.trim();
  if (tier === "premium") {
    return "premium";
  }

  return "preview";
}
