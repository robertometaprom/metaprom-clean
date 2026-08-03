import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  BIBLIOTECA_MEDIA_SIGNED_URL_TTL_SECONDS,
  canDeliverBibliotecaMedia,
  resolveBibliotecaMediaPath,
  type BibliotecaMediaType,
} from "@/lib/biblioteca-media-gateway";
import { createSignedLibraryUrlServer } from "@/lib/library-storage-server";

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

function createMediaRouteSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  return { supabase, getSupabaseResponse: () => supabaseResponse };
}

function applySupabaseCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  return target;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const assetId = url.searchParams.get("assetId");
  const mediaType = parseMediaType(url.searchParams.get("type"));

  if (!assetId || !mediaType) {
    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  }

  const { supabase, getSupabaseResponse } = createMediaRouteSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return applySupabaseCookies(
      NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      getSupabaseResponse(),
    );
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

    return applySupabaseCookies(
      NextResponse.redirect(signedUrl, {
        status: 302,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }),
      getSupabaseResponse(),
    );
  } catch (error) {
    console.error("GET /api/biblioteca/media failed", {
      assetId,
      mediaType,
      error,
    });
    return NextResponse.json({ error: "Unable to deliver media." }, { status: 500 });
  }
}
