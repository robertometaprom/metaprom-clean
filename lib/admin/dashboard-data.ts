import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DashboardRange = "today" | "7d" | "30d" | "all";

type PurchaseRow = {
  id: number;
  user_id: string;
  product_id: string;
  amount_mxn: number;
  currency: string;
  status: string;
  provider: string;
  payment_method: string | null;
  created_at: string;
  completed_at: string | null;
};

type LedgerRow = {
  entry_type: "grant" | "consume" | "revoke";
  entitlement_kind: "commercial" | "advertising_asset";
  quantity: number;
  purchase_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin_grant_id: string | null;
};

type BalanceRow = {
  commercials_remaining: number;
  advertising_assets_remaining: number;
};

type ProjectRow = { id: number; user_id: string; created_at: string };
type AssetRow = {
  id: number;
  project_id: number;
  created_at: string;
  image_path: string | null;
  teaser_video_path: string | null;
  premium_video_path: string | null;
};

const RANGE_DAYS: Record<Exclude<DashboardRange, "all">, number> = {
  today: 0,
  "7d": 7,
  "30d": 30,
};

export function rangeStart(range: DashboardRange, now = new Date()): string | null {
  if (range === "all") return null;
  const start = new Date(now);
  if (range === "today") {
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCDate(start.getUTCDate() - RANGE_DAYS[range]);
  }
  return start.toISOString();
}

function inRange(timestamp: string | null, start: string | null): boolean {
  return !start || (timestamp !== null && timestamp >= start);
}

function isPaidCommercePurchase(purchase: PurchaseRow): boolean {
  return purchase.provider === "stripe" && purchase.status === "completed";
}

function productCategory(productId: string): "commercials" | "images" | "unknown" {
  if (productId.startsWith("commercial") || productId.startsWith("video")) return "commercials";
  if (productId.startsWith("assets_")) return "images";
  return "unknown";
}

function looksHistoricalOrTest(entry: LedgerRow, purchaseById: Map<number, PurchaseRow>): boolean {
  if (entry.admin_grant_id) return true;
  if (!entry.purchase_id) return true;
  const purchase = purchaseById.get(entry.purchase_id);
  if (!purchase || !isPaidCommercePurchase(purchase)) return true;
  const keys = Object.keys(entry.metadata ?? {}).join(" ").toLowerCase();
  return /mock|test|verify|welcome|admin/.test(keys);
}

function sum(rows: number[]): number {
  return rows.reduce((total, value) => total + value, 0);
}

function countKinds(entries: LedgerRow[], entryType: LedgerRow["entry_type"]) {
  const relevant = entries.filter((entry) => entry.entry_type === entryType);
  return {
    commercials: sum(relevant.filter((entry) => entry.entitlement_kind === "commercial").map((entry) => Math.abs(entry.quantity))),
    images: sum(relevant.filter((entry) => entry.entitlement_kind === "advertising_asset").map((entry) => Math.abs(entry.quantity))),
  };
}

export async function getDashboardData(range: DashboardRange) {
  const admin = createAdminClient();
  const start = rangeStart(range);

  const [purchasesResult, ledgerResult, balancesResult, projectsResult, assetsResult, eventsResult, usersResult] =
    await Promise.all([
      admin.from("purchases").select("id,user_id,product_id,amount_mxn,currency,status,provider,payment_method,created_at,completed_at").order("created_at", { ascending: false }),
      admin.from("entitlement_ledger").select("entry_type,entitlement_kind,quantity,purchase_id,metadata,created_at,admin_grant_id"),
      admin.from("entitlement_balances").select("commercials_remaining,advertising_assets_remaining"),
      admin.from("projects").select("id,user_id,created_at"),
      admin.from("assets").select("id,project_id,created_at,image_path,teaser_video_path,premium_video_path"),
      admin.from("growth_events").select("id", { count: "exact", head: true }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const queryErrors = [purchasesResult.error, ledgerResult.error, balancesResult.error, projectsResult.error, assetsResult.error, eventsResult.error, usersResult.error].filter(Boolean);
  if (queryErrors.length) throw new Error(`Dashboard read failed: ${queryErrors.map((error) => error?.message).join("; ")}`);

  const purchases = (purchasesResult.data ?? []) as PurchaseRow[];
  const ledger = (ledgerResult.data ?? []) as LedgerRow[];
  const balances = (balancesResult.data ?? []) as BalanceRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const assets = (assetsResult.data ?? []) as AssetRow[];
  const users = usersResult.data.users;
  const purchaseById = new Map(purchases.map((purchase) => [purchase.id, purchase]));

  const rangePurchases = purchases.filter((purchase) => inRange(purchase.created_at, start));
  const stripePurchases = rangePurchases.filter((purchase) => purchase.provider === "stripe");
  const paidPurchases = stripePurchases.filter(isPaidCommercePurchase);
  const revenueMxn = sum(paidPurchases.map((purchase) => purchase.amount_mxn));
  const rangeLedger = ledger.filter((entry) => inRange(entry.created_at, start));
  const paidGrants = rangeLedger.filter((entry) => entry.entry_type === "grant" && !looksHistoricalOrTest(entry, purchaseById));
  const historicalGrants = rangeLedger.filter((entry) => entry.entry_type === "grant" && looksHistoricalOrTest(entry, purchaseById));
  const rangeProjects = projects.filter((project) => inRange(project.created_at, start));
  const rangeAssets = assets.filter((asset) => inRange(asset.created_at, start));
  const projectOwners = new Map(projects.map((project) => [project.id, project.user_id]));
  const generatorUsers = new Set(rangeAssets.map((asset) => projectOwners.get(asset.project_id)).filter(Boolean));
  const checkoutUsers = new Set(stripePurchases.map((purchase) => purchase.user_id));
  const buyerUsers = new Set(paidPurchases.map((purchase) => purchase.user_id));
  const registeredUsers = users.filter((user) => inRange(user.created_at, start)).length;

  const statusCounts = Object.fromEntries(["completed", "awaiting_payment", "pending", "failed", "cancelled"].map((status) => [status, stripePurchases.filter((purchase) => purchase.status === status).length]));
  const methodCounts = Object.fromEntries(["card", "oxxo", "spei", "wallet", "other", "unknown"].map((method) => [method, stripePurchases.filter((purchase) => (purchase.payment_method ?? "unknown") === method).length]));

  return {
    range,
    generatedAt: new Date().toISOString(),
    commerce: {
      revenueMxn,
      confirmedPurchases: paidPurchases.length,
      averageOrderMxn: paidPurchases.length ? revenueMxn / paidPurchases.length : null,
      revenueByCategory: {
        commercials: sum(paidPurchases.filter((purchase) => productCategory(purchase.product_id) === "commercials").map((purchase) => purchase.amount_mxn)),
        images: sum(paidPurchases.filter((purchase) => productCategory(purchase.product_id) === "images").map((purchase) => purchase.amount_mxn)),
      },
      statusCounts,
      methodCounts,
      paymentMethodReliable: false,
      recent: paidPurchases.slice(0, 8).map((purchase) => ({
        id: purchase.id,
        productId: purchase.product_id,
        amountMxn: purchase.amount_mxn,
        status: purchase.status,
        createdAt: purchase.created_at,
        paymentMethod: purchase.payment_method,
      })),
    },
    credits: {
      paidGranted: countKinds(paidGrants, "grant"),
      historicalOrTestGranted: countKinds(historicalGrants, "grant"),
      consumed: countKinds(rangeLedger, "consume"),
      outstanding: {
        commercials: sum(balances.map((balance) => balance.commercials_remaining)),
        images: sum(balances.map((balance) => balance.advertising_assets_remaining)),
      },
    },
    usage: {
      registeredUsers,
      projects: rangeProjects.length,
      assets: rangeAssets.length,
      imageGenerations: rangeAssets.filter((asset) => asset.image_path).length,
      previews: rangeAssets.filter((asset) => asset.teaser_video_path).length,
      premiumCompletions: rangeAssets.filter((asset) => asset.premium_video_path).length,
    },
    funnel: {
      users: registeredUsers,
      usersWithGeneration: generatorUsers.size,
      usersWithCheckout: checkoutUsers.size,
      confirmedBuyers: buyerUsers.size,
    },
    instrumentation: {
      growthEventsStored: eventsResult.count ?? 0,
      costsAvailable: false,
      anonymousTrafficAvailable: (eventsResult.count ?? 0) > 0,
    },
  };
}
