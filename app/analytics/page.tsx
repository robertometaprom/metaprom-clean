import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InternalAnalyticsDashboard from "@/components/analytics/InternalAnalyticsDashboard";
import { analyticsAuthRedirect } from "@/lib/analytics/dashboard-access";
import { getAnalyticsDashboard } from "@/lib/analytics/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics — Metaprom AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const denied = analyticsAuthRedirect(user);
  if (denied) {
    redirect(denied);
  }

  const period = (await searchParams).period;
  const data = await getAnalyticsDashboard(period);

  return <InternalAnalyticsDashboard data={data} />;
}
