import { NextResponse } from "next/server";
import { createPublicPreviewImageUrl } from "@/lib/preview/public-preview";
import { isValidShareSlug } from "@/lib/preview/share-slug";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Controlled public image delivery via short-lived signed URLs.
 * Share destinations remain `/p/{share_slug}` — this path only renders bytes.
 * Never signs original private photos or Premium HD.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!isValidShareSlug(slug)) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  try {
    const imageUrl = await createPublicPreviewImageUrl(slug);

    if (!imageUrl) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    return NextResponse.redirect(imageUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/public/[slug]/image failed", { slug, error });
    return NextResponse.json(
      { error: "Unable to load preview image." },
      { status: 500 },
    );
  }
}
