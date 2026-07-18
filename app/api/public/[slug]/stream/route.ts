import { NextResponse } from "next/server";
import { createPublicPreviewStreamUrl } from "@/lib/preview/public-preview";
import { isValidShareSlug } from "@/lib/preview/share-slug";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Controlled teaser streaming via short-lived signed URLs.
 * Future Public Landing players should use this path, not storage URLs directly.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!isValidShareSlug(slug)) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  try {
    const streamUrl = await createPublicPreviewStreamUrl(slug);

    if (!streamUrl) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    return NextResponse.redirect(streamUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/public/[slug]/stream failed", { slug, error });
    return NextResponse.json(
      { error: "Unable to stream preview." },
      { status: 500 },
    );
  }
}
