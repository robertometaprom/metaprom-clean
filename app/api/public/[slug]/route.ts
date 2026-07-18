import { NextResponse } from "next/server";
import { getPublicPreview } from "@/lib/preview/public-preview";
import { isValidShareSlug } from "@/lib/preview/share-slug";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!isValidShareSlug(slug)) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  try {
    const preview = await getPublicPreview(slug);

    if (!preview) {
      return NextResponse.json({ error: "Preview not found." }, { status: 404 });
    }

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("GET /api/public/[slug] failed", { slug, error });
    return NextResponse.json(
      { error: "Unable to load preview." },
      { status: 500 },
    );
  }
}
