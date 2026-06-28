export type MarketIntelligencePayload = {
  requested_service: string;
  industry?: string;
  intended_destination?: string;
  matched_workflow: boolean;
  workflow_id?: string;
};

export async function recordMarketIntelligence(
  payload: MarketIntelligencePayload,
): Promise<void> {
  try {
    await fetch("/api/market-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Intelligence logging must never block the user experience.
  }
}
