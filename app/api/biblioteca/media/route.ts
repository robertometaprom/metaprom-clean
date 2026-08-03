import { NextResponse } from "next/server";

import {
  BIBLIOTECA_MEDIA_SIGNED_URL_TTL_SECONDS,
  canDeliverBibliotecaMedia,
  resolveBibliotecaMediaPath,
  type BibliotecaMediaType,
} from "@/lib/biblioteca-media-gateway";
import { createSignedLibraryUrlServer } from "@/lib/library-storage-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_MEDIA_TYPES = new Set<BibliotecaMediaType>([
  "original",
  "teaser",
  "premium",
]);

function parseMediaType(value: string | null): BibliotecaMediaType | null {
  if (!value || !VALID_MEDIA_TYPES.has(value as BibliotecaMediaType)) {
    return null;
  }
  return value as BibliotecaMediaType;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");
  const mediaType = parseMediaType(url.searchParams.get("type"));

  if (!assetId || !mediaType) {
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
    .select(
      "id, project_id, original_path, teaser_video_path, premium_video_path, payment_status",
    )
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", asset.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  if (!canDeliverBibliotecaMedia(asset, mediaType, "owner")) {
    return NextResponse.json({ error: "Media not available." }, { status: 403 });
  }

  const storagePath = resolveBibliotecaMediaPath(asset, mediaType);
  if (!storagePath) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  try {
    const signedUrl = await createSignedLibraryUrlServer(
      storagePath,
      BIBLIOTECA_MEDIA_SIGNED_URL_TTL_SECONDS,
    );

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/biblioteca/media failed", {
      assetId,
      mediaType,
      error,
    });
    return NextResponse.json({ error: "Unable to deliver media." }, { status: 500 });
  }
}
