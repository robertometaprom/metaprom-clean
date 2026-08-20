import {
  getSafeInternalPath,
  isLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
} from "@/lib/i18n";
import { NextResponse, type NextRequest } from "next/server";

function pathFromReferer(referer: string | null): string | null {
  if (!referer) return null;

  try {
    const url = new URL(referer);
    if (url.pathname.startsWith("/api/locale")) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale");
  if (!isLocale(localeParam)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const next = getSafeInternalPath(
    request.nextUrl.searchParams.get("next") ??
      pathFromReferer(request.headers.get("referer")),
    "/",
  );

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(LOCALE_COOKIE_NAME, localeParam, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return response;
}
