import { NextResponse } from "next/server";

import type { RevealVideoProbeEvent } from "@/lib/diagnostics/reveal-video-probe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_PREFIX = "[reveal-video-probe]";
const MAX_STORED_EVENTS = 200;

type StoredProbeRecord = RevealVideoProbeEvent & { receivedAt: string };

declare global {
  // eslint-disable-next-line no-var
  var __revealVideoProbeStore: StoredProbeRecord[] | undefined;
}

function getMemoryStore(): StoredProbeRecord[] {
  globalThis.__revealVideoProbeStore = globalThis.__revealVideoProbeStore ?? [];
  return globalThis.__revealVideoProbeStore;
}

function probeBuildEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "1" ||
    process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE === "true"
  );
}

async function persistProbeEvent(record: StoredProbeRecord): Promise<void> {
  const store = getMemoryStore();
  store.push(record);
  if (store.length > MAX_STORED_EVENTS) {
    store.splice(0, store.length - MAX_STORED_EVENTS);
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("reveal_video_probe_events").insert({
      session_id: record.sessionId,
      event_type: record.event,
      payload: record,
    });

    if (error) {
      console.warn(`${LOG_PREFIX} supabase insert failed`, error.message);
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} supabase unavailable`, error);
  }
}

async function fetchProbeEvents(sessionId: string | null): Promise<StoredProbeRecord[]> {
  if (sessionId) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("reveal_video_probe_events")
        .select("payload")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data?.length) {
        return data
          .map((row) => row.payload as StoredProbeRecord)
          .filter(Boolean);
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} supabase fetch failed`, error);
    }
  }

  const store = getMemoryStore();
  return sessionId
    ? store.filter((entry) => entry.sessionId === sessionId)
    : store.slice(-50);
}

export async function POST(req: Request) {
  let body: RevealVideoProbeEvent;

  try {
    body = (await req.json()) as RevealVideoProbeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const record: StoredProbeRecord = {
    ...body,
    receivedAt: new Date().toISOString(),
  };

  await persistProbeEvent(record);
  console.info(LOG_PREFIX, JSON.stringify(record));

  return NextResponse.json({
    ok: true,
    probeBuildEnabled: probeBuildEnabled(),
    event: record,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const events = await fetchProbeEvents(sessionId);

  return NextResponse.json({
    status: "ok",
    probeBuildEnabled: probeBuildEnabled(),
    count: events.length,
    events,
  });
}
