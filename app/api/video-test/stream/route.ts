import { NextResponse } from "next/server";
import { createSignedLibraryUrlServer } from "@/lib/library-storage-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STREAM_SIGNED_URL_TTL_SECONDS = 60 * 5;

type MediaType = "teaser" | "premium";

function resolveMediaPath(
  asset: {
    teaser_video_path: string | null;
    premium_video_path: string | null;
  },
  mediaType: MediaType,
): string | null {
  if (mediaType === "teaser") {
    return asset.teaser_video_path;
  }
  return asset.premium_video_path;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const assetId = url.searchParams.get("assetId");
  const mediaType = url.searchParams.get("mediaType");

  if (!projectId || !assetId || (mediaType !== "teaser" && mediaType !== "premium")) {
    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: asset } = await supabase
    .from("assets")
    .select("id, project_id, teaser_video_path, premium_video_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const storagePath = resolveMediaPath(asset, mediaType);
  if (!storagePath) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  try {
    const signedUrl = await createSignedLibraryUrlServer(
      storagePath,
      STREAM_SIGNED_URL_TTL_SECONDS,
    );

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/video-test/stream failed", {
      projectId,
      assetId,
      mediaType,
      error,
    });
    return NextResponse.json({ error: "Unable to stream video." }, { status: 500 });
  }
}
